import { createId } from '@paralleldrive/cuid2';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { and, eq, sql } from 'drizzle-orm';
import { playerProfiles, players, Player, tournaments } from '../models';
import { database, ensureDatabaseReady } from '../services';
dotenv.config();

interface DataGolfPlayerListItem {
  dg_id: number;
  player_name: string;
  country: string;
  country_code: string;
  amateur: string;
}

interface DataGolfRankingItem {
  dg_id: number;
  player_name: string;
  primary_tour: string;
  dg_skill_estimate: number;
  rank: number;
  owgr_rank: number | null;
}

interface DataGolfFieldPlayer {
  dg_id: number;
  player_name: string;
  [key: string]: any;
}

const DATAGOLF_API_KEY = process.env.DATAGOLF_API_KEY;
const DATAGOLF_BASE_URL = 'https://feeds.datagolf.com';

if (!DATAGOLF_API_KEY) {
  console.error('ERROR: DATAGOLF_API_KEY environment variable is not set');
  process.exit(1);
}

async function fetchPlayerList(): Promise<DataGolfPlayerListItem[]> {
  try {
    const endpoint = `/get-player-list?file_format=json&key=${DATAGOLF_API_KEY}`;
    const response = await axios.get(`${DATAGOLF_BASE_URL}${endpoint}`, {
      headers: {
        Accept: 'application/json',
      },
      timeout: 15000,
    });

    return response.data;
  } catch (error: any) {
    console.error('Error fetching DataGolf player list:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return [];
  }
}

async function fetchRankings(): Promise<DataGolfRankingItem[]> {
  try {
    const endpoint = `/preds/get-dg-rankings?file_format=json&key=${DATAGOLF_API_KEY}`;
    const response = await axios.get(`${DATAGOLF_BASE_URL}${endpoint}`, {
      headers: {
        Accept: 'application/json',
      },
      timeout: 15000,
    });

    return response.data.rankings || [];
  } catch (error: any) {
    console.error('Error fetching DataGolf rankings:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return [];
  }
}

async function fetchTournamentField(tournamentId: string): Promise<DataGolfFieldPlayer[]> {
  try {
    const endpoint = `/field-updates?tour=pga&event_id=${tournamentId}&file_format=json&key=${DATAGOLF_API_KEY}`;

    const response = await axios.get(`${DATAGOLF_BASE_URL}${endpoint}`, {
      headers: {
        Accept: 'application/json',
      },
      timeout: 15000,
    });

    return response.data.field || [];
  } catch (error: any) {
    console.error('Error fetching DataGolf tournament field:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return [];
  }
}

function splitPlayerName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(' ');

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(' ');

  return { firstName, lastName };
}

function generateId(): string {
  return createId();
}

function getRandomGroup(): string {
  const groups = ['A', 'B', 'C', 'D', 'E', 'F'];
  return groups[Math.floor(Math.random() * groups.length)];
}

async function upsertPlayerProfile(
  dgId: number,
  playerName: string,
  country: string,
  ranking: number,
): Promise<string | null> {
  try {
    const { firstName, lastName } = splitPlayerName(playerName);

    const existingProfileByExternalId = await database
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.external_id, String(dgId)))
      .execute();

    if (existingProfileByExternalId.length > 0) {
      await database
        .update(playerProfiles)
        .set({
          first_name: firstName,
          last_name: lastName,
          country: country,
          ranking: ranking,
          updated_at: new Date(),
        })
        .where(eq(playerProfiles.external_id, String(dgId)))
        .execute();

      console.log(`✅ Updated player profile: ${playerName} (DG ID: ${dgId}) [matched by external_id]`);
      return existingProfileByExternalId[0].id;
    }

    const existingProfileByName = await database
      .select()
      .from(playerProfiles)
      .where(
        and(
          sql`LOWER(${playerProfiles.first_name}) = LOWER(${firstName})`,
          sql`LOWER(${playerProfiles.last_name}) = LOWER(${lastName})`,
          sql`LOWER(${playerProfiles.country}) = LOWER(${country})`,
        ),
      )
      .execute();

    if (existingProfileByName.length > 0) {
      await database
        .update(playerProfiles)
        .set({
          external_id: String(dgId),
          first_name: firstName,
          last_name: lastName,
          country: country,
          ranking: ranking,
          updated_at: new Date(),
        })
        .where(eq(playerProfiles.id, existingProfileByName[0].id))
        .execute();

      console.log(`✅ Updated player profile: ${playerName} (DG ID: ${dgId}) [matched by name & country]`);
      return existingProfileByName[0].id;
    }

    const playerProfileId = generateId();
    const newProfile = {
      id: playerProfileId,
      first_name: firstName,
      external_id: String(dgId),
      last_name: lastName,
      country: country,
      age: 0,
      ranking: ranking,
      profile_picture: '',
      group: getRandomGroup(),
    };

    await database.insert(playerProfiles).values(newProfile).execute();

    console.log(`✅ Created player profile: ${playerName} (DG ID: ${dgId})`);
    return playerProfileId;
  } catch (error: any) {
    console.error(`❌ Error upserting player profile for ${playerName}:`, error.message);
    return null;
  }
}

async function upsertPlayer(
  dgId: number,
  profileId: string,
  level: number = 1,
): Promise<string | null> {
  try {
    const existingPlayers = await database
      .select()
      .from(players)
      .where(eq(players.external_id, String(dgId)))
      .execute();

    const existingPlayer = existingPlayers.find((p: Player) => p.profile_id === profileId);

    if (existingPlayer) {
      await database
        .update(players)
        .set({
          profile_id: profileId,
          level: level,
          updated_at: new Date(),
        })
        .where(eq(players.id, existingPlayer.id))
        .execute();

      console.log(`   ↳ Updated player entry (ID: ${existingPlayer.id})`);
      return existingPlayer.id;
    } else {
      const playerId = generateId();
      const newPlayer = {
        id: playerId,
        external_id: String(dgId),
        level: level,
        profile_id: profileId,
        current_score: 0,
        position: 0,
        missed_cut: false,
        odds: 0,
      };

      await database.insert(players).values(newPlayer).execute();

      console.log(`   ↳ Created player entry (ID: ${playerId})`);
      return playerId;
    }
  } catch (error: any) {
    console.error(`❌ Error upserting player for profile ${profileId}:`, error.message);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Error: Tournament ID is required');
    console.log('\nUsage: yarn sync:player-profiles <tournament_id>');
    console.log('Example: yarn sync:player-profiles 12');
    console.log('\nTo get tournament IDs, visit: https://datagolf.com/api-docs');
    process.exit(1);
  }

  const tournamentId = args[0];

  console.log('🏌️ Starting player profile sync job...');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Tournament ID: ${tournamentId}\n`);

  try {
    console.log('⏳ Waiting for database connection...');
    await ensureDatabaseReady();
    console.log('✅ Database connection established\n');

    console.log(`📋 Fetching tournament field for event ${tournamentId}...`);
    const tournamentField = await fetchTournamentField(tournamentId);

    if (tournamentField.length === 0) {
      console.error('❌ No players found in tournament field');
      console.log('Please verify:');
      console.log('1. The tournament ID is correct');
      console.log('2. The tournament exists in DataGolf');
      console.log('3. Your API key has access to this data');
      process.exit(1);
    }

    console.log(`✅ Found ${tournamentField.length} players in tournament field\n`);

    console.log('📋 Fetching player list from DataGolf...');
    const playerList = await fetchPlayerList();
    console.log(`✅ Fetched ${playerList.length} players from player list\n`);

    console.log('📊 Fetching rankings from DataGolf...');
    const rankings = await fetchRankings();
    console.log(`✅ Fetched ${rankings.length} rankings\n`);

    const playerMap = new Map<number, DataGolfPlayerListItem>();
    playerList.forEach(player => {
      playerMap.set(player.dg_id, player);
    });

    const rankingMap = new Map<number, DataGolfRankingItem>();
    rankings.forEach(ranking => {
      rankingMap.set(ranking.dg_id, ranking);
    });

    console.log('🔄 Creating/updating player profiles and player entries...\n');

    let successCount = 0;
    let missingDataCount = 0;
    const playerIds: string[] = [];

    for (const fieldPlayer of tournamentField) {
      const dgId = fieldPlayer.dg_id;
      const playerData = playerMap.get(dgId);
      const rankingData = rankingMap.get(dgId);

      if (!playerData) {
        console.log(`⚠️  Player ${fieldPlayer.player_name} (ID: ${dgId}) not found in player list`);
        missingDataCount++;
        continue;
      }

      const ranking = rankingData?.rank || 999;

      let level = 3;
      if (ranking <= 50) {
        level = 1;
      } else if (ranking <= 150) {
        level = 2;
      }

      const profileId = await upsertPlayerProfile(
        dgId,
        playerData.player_name,
        playerData.country,
        ranking,
      );

      if (profileId) {
        const playerId = await upsertPlayer(dgId, profileId, level);
        if (playerId) {
          playerIds.push(playerId);
        }
        successCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully processed: ${successCount} players`);
    console.log(`⚠️  Missing data: ${missingDataCount} players`);
    console.log(`📋 Total in field: ${tournamentField.length} players`);
    console.log('='.repeat(60));

    console.log(`\n🏆 Updating tournament with player IDs...`);

    const existingTournament = await database
      .select()
      .from(tournaments)
      .where(eq(tournaments.external_id, tournamentId))
      .execute();

    if (existingTournament.length > 0) {
      await database
        .update(tournaments)
        .set({
          players: playerIds,
          updated_at: new Date(),
        })
        .where(eq(tournaments.external_id, tournamentId))
        .execute();

      console.log(
        `✅ Updated tournament "${existingTournament[0].name}" with ${playerIds.length} player IDs`,
      );
    } else {
      console.log(
        `⚠️  Tournament with external_id "${tournamentId}" not found in database. Skipping tournament update.`,
      );
      console.log(
        `   💡 If you want to update the tournament, make sure it exists with external_id: ${tournamentId}`,
      );
    }

    console.log('\n✅ Player profile sync job completed successfully');
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
