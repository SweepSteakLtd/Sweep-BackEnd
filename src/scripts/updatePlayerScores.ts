import axios from 'axios';
import * as dotenv from 'dotenv';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { players, Tournament, tournaments } from '../models';
import { database, ensureDatabaseReady } from '../services';
dotenv.config();

interface LiveTournamentPlayer {
  dg_id: number;
  player_name: string;
  country?: string;
  position?: string | number;
  total_score?: number;
  thru?: string | number;
  today?: number;
  r1?: number;
  r2?: number;
  r3?: number;
  r4?: number;
  total_strokes?: number;
  mc?: string;
  [key: string]: any; // For additional stats like sg_putt, sg_app, etc.
}

interface LiveTournamentStatsResponse {
  event_name?: string;
  event_id?: string;
  tour?: string;
  calendar_year?: number;
  event_completed?: boolean;
  stats?: LiveTournamentPlayer[];
  [key: string]: any;
}

const DATAGOLF_API_KEY = process.env.DATAGOLF_API_KEY;
const DATAGOLF_BASE_URL = 'https://feeds.datagolf.com';

if (!DATAGOLF_API_KEY) {
  console.error('ERROR: DATAGOLF_API_KEY environment variable is not set');
  process.exit(1);
}

async function fetchLiveTournamentStats(): Promise<LiveTournamentStatsResponse | null> {
  try {
    // Fetch comprehensive stats for live scoring
    const stats = [
      'sg_putt',
      'sg_arg',
      'sg_app',
      'sg_ott',
      'sg_t2g',
      'sg_total',
      'distance',
      'accuracy',
      'gir',
      'scrambling',
    ].join(',');

    const endpoint = `/preds/live-tournament-stats?stats=${stats}&round=event_cumulative&display=value&file_format=json&key=${DATAGOLF_API_KEY}`;

    console.log('📡 Fetching live tournament stats from DataGolf...');

    const response = await axios.get(`${DATAGOLF_BASE_URL}${endpoint}`, {
      headers: {
        Accept: 'application/json',
      },
      timeout: 15000,
    });

    console.log(`✅ Received live tournament data`);

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log('ℹ️  No live tournament currently in progress');
      return null;
    }

    console.error('Error fetching live tournament stats:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data).substring(0, 200));
    }
    return null;
  }
}

async function getActiveTournaments(): Promise<Tournament[]> {
  try {
    const now = new Date();

    const runningTournaments = await database
      .select()
      .from(tournaments)
      .where(and(lte(tournaments.starts_at, now), gte(tournaments.finishes_at, now)))
      .execute();

    console.log(`Found ${runningTournaments.length} active tournaments`);
    return runningTournaments;
  } catch (error: any) {
    console.error('Error fetching active tournaments:', error.message);
    return [];
  }
}

function parsePosition(position: string | number | undefined): number {
  if (position === undefined || position === null) return 0;

  if (typeof position === 'number') return position;

  const positionStr = String(position).replace(/^T/, '');
  const parsed = parseInt(positionStr, 10);

  return isNaN(parsed) ? 0 : parsed;
}

async function updateTournamentPlayers(
  tournament: Tournament,
  liveData: LiveTournamentStatsResponse,
) {
  try {
    console.log(`\n--- Updating players for tournament: ${tournament.name} ---`);
    console.log(`External ID: ${tournament.external_id}`);
    console.log(
      `Live Event: ${liveData.event_name || 'Unknown'} (ID: ${liveData.event_id || 'Unknown'})`,
    );

    const playerIds = tournament.players;

    if (!playerIds || playerIds.length === 0) {
      console.log('⚠️  No players in tournament');
      return 0;
    }

    const tournamentPlayers = await database
      .select()
      .from(players)
      .where(inArray(players.id, playerIds))
      .execute();

    console.log(`Found ${tournamentPlayers.length} players in database`);

    const liveStats = liveData.live_stats || liveData;
    const livePlayerData = Array.isArray(liveStats) ? liveStats : [];

    if (livePlayerData.length === 0) {
      console.log('⚠️  No player data available in live stats');
      return 0;
    }

    console.log(`Processing ${livePlayerData.length} players from live data`);

    // Create a map of DataGolf players by their dg_id
    const dataGolfMap = new Map<string, LiveTournamentPlayer>();
    livePlayerData.forEach(dgPlayer => {
      if (dgPlayer.dg_id) {
        dataGolfMap.set(String(dgPlayer.dg_id), dgPlayer);
      }
    });

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const player of tournamentPlayers) {
      const dgPlayer = dataGolfMap.get(player.external_id);

      if (!dgPlayer) {
        console.log(
          `⚠️  Player ${player.id} (external_id: ${player.external_id}) not found in live data`,
        );
        notFoundCount++;
        continue;
      }

      const currentScore = dgPlayer.total;
      const position = parsePosition(dgPlayer.position);
      const missedCut = dgPlayer.mc === '1' || dgPlayer.mc === 'MC';

      // Check if any values have changed
      if (
        player.current_score !== currentScore ||
        player.position !== position ||
        player.missed_cut !== missedCut
      ) {
        await database
          .update(players)
          .set({
            current_score: currentScore,
            position: position,
            missed_cut: missedCut,
            updated_at: new Date(),
          })
          .where(eq(players.id, player.id))
          .execute();

        console.log(
          `✅ Updated ${dgPlayer.player_name}: Score=${currentScore}, Position=${position}, MC=${missedCut}`,
        );
        updatedCount++;
      }
    }

    console.log(
      `\n📊 Summary: Updated ${updatedCount} players, ${notFoundCount} not found in live data`,
    );

    return updatedCount;
  } catch (error: any) {
    console.error(`❌ Error updating tournament ${tournament.id}:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('🏌️ Starting player score update job...');
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    console.log('⏳ Waiting for database connection...');
    await ensureDatabaseReady();
    console.log('✅ Database connection established\n');

    // Fetch live tournament stats from DataGolf
    const liveData = await fetchLiveTournamentStats();

    if (!liveData) {
      console.log('ℹ️  No live tournament data available. Exiting.');
      return;
    }

    // Get all active tournaments from database
    const activeTournaments = await getActiveTournaments();

    if (activeTournaments.length === 0) {
      console.log('⚠️  No active tournaments found in database.');
      return;
    }

    console.log(`\n🔍 Checking if live tournament matches any active tournaments...`);
    console.log(
      `Live tournament: ${liveData.event_name || 'Unknown'} (ID: ${liveData.event_id || 'Unknown'})`,
    );
    console.log(`Active tournaments in database: ${activeTournaments.length}`);

    // Find matching tournament
    let matchedTournament: Tournament | null = null;

    for (const tournament of activeTournaments) {
      console.log(`  - Checking: ${tournament.name} (External ID: ${tournament.external_id})`);

      // Match by external_id (event_id from DataGolf)
      if (
        (liveData.event_id && tournament.external_id === liveData.event_id) ||
        liveData.course_name === tournament.course_name
      ) {
        matchedTournament = tournament;
        console.log(`  ✅ Match found by event_id!`);
        break;
      }

      // Fallback: Try to match by event name (case-insensitive)
      if (
        liveData.event_name &&
        tournament.name.toLowerCase().includes(liveData.event_name.toLowerCase())
      ) {
        matchedTournament = tournament;
        console.log(`  ✅ Match found by event name!`);
        break;
      }
    }

    if (!matchedTournament) {
      console.log('\n⚠️  No matching tournament found in database for the live tournament data.');
      console.log('Please ensure the tournament exists and has the correct external_id.');
      return;
    }

    // Update players for the matched tournament
    const updatedCount = await updateTournamentPlayers(matchedTournament, liveData);

    if (updatedCount > 0) {
      console.log(`\n✅ Successfully updated ${updatedCount} players`);
    } else {
      console.log('\n✅ No player updates required');
    }

    console.log('\n✅ Player score update job completed successfully');
  } catch (error: any) {
    console.error('❌ Fatal error in main execution:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('\n👋 Script finished, exiting...');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
