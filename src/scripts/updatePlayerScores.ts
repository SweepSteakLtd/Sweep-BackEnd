import axios from 'axios';
import * as dotenv from 'dotenv';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { players, Tournament, tournaments } from '../models';
import { database, ensureDatabaseReady } from '../services';
dotenv.config();

interface DataGolfPlayer {
  dg_id: number;
  player_name: string;
  country: string;
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
}

interface DataGolfFieldResponse {
  event_name: string;
  year: number;
  event_id: string;
  field: DataGolfPlayer[];
}

const DATAGOLF_API_KEY = process.env.DATAGOLF_API_KEY;
const DATAGOLF_BASE_URL = 'https://feeds.datagolf.com';

if (!DATAGOLF_API_KEY) {
  console.error('ERROR: DATAGOLF_API_KEY environment variable is not set');
  process.exit(1);
}

async function fetchDataGolfLeaderboard(
  tournamentExternalId: string,
): Promise<DataGolfFieldResponse | null> {
  try {
    const endpoint = `/field-updates?tour=pga&event_id=${tournamentExternalId}&file_format=json&key=${DATAGOLF_API_KEY}`;

    const response = await axios.get(`${DATAGOLF_BASE_URL}${endpoint}`, {
      headers: {
        Accept: 'application/json',
      },
      timeout: 15000,
    });

    return response.data;
  } catch (error: any) {
    console.error('Error fetching DataGolf leaderboard:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
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

async function updateTournamentPlayers(tournament: Tournament) {
  try {
    console.log(`\n--- Updating players for tournament: ${tournament.name} ---`);
    console.log(`External ID: ${tournament.external_id}`);

    const playerIds = tournament.players;

    if (!playerIds || playerIds.length === 0) {
      console.log('No players in tournament');
      return;
    }

    const tournamentPlayers = await database
      .select()
      .from(players)
      .where(inArray(players.id, playerIds))
      .execute();

    console.log(`Found ${tournamentPlayers.length} players in database`);

    const leaderboardData = await fetchDataGolfLeaderboard(tournament.external_id);

    if (!leaderboardData || !leaderboardData.field) {
      console.log('No leaderboard data available from DataGolf');
      return;
    }

    console.log(`Fetched ${leaderboardData.field.length} players from DataGolf`);

    const dataGolfMap = new Map<string, DataGolfPlayer>();
    leaderboardData.field.forEach(dgPlayer => {
      dataGolfMap.set(String(dgPlayer.dg_id), dgPlayer);
    });

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const player of tournamentPlayers) {
      const dgPlayer = dataGolfMap.get(player.external_id);

      if (!dgPlayer) {
        console.log(
          `⚠️  Player ${player.id} (external_id: ${player.external_id}) not found in DataGolf leaderboard`,
        );
        notFoundCount++;
        continue;
      }

      const currentScore =
        dgPlayer.total_score !== undefined ? dgPlayer.total_score : player.current_score;
      const position = parsePosition(dgPlayer.position);
      const missedCut = dgPlayer.mc === '1' || dgPlayer.mc === 'MC';

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
          `✅ Updated ${dgPlayer.player_name}: Score=${currentScore}, Position=${position}, Missed Cut=${missedCut}`,
        );
        updatedCount++;
      }
    }

    console.log(
      `\n📊 Summary: Updated ${updatedCount} players, ${notFoundCount} not found in DataGolf data`,
    );
  } catch (error: any) {
    console.error(`Error updating tournament ${tournament.id}:`, error.message);
  }
}

async function main() {
  console.log('🏌️ Starting player score update job...');
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    console.log('⏳ Waiting for database connection...');
    await ensureDatabaseReady();
    console.log('✅ Database connection established\n');

    const activeTournaments = await getActiveTournaments();

    if (activeTournaments.length === 0) {
      console.log('No active tournaments found. Nothing to update.');
      return;
    }

    for (const tournament of activeTournaments) {
      await updateTournamentPlayers(tournament);
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
