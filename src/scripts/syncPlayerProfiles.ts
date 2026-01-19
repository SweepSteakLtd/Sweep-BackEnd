import { createId } from '@paralleldrive/cuid2';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';
import { and, eq, sql } from 'drizzle-orm';
import { Player, playerProfiles, players, tournaments } from '../models';
import { database, ensureDatabaseReady, firebaseStorage } from '../services';
import { mapDataGolfCountryCode } from '../utils/countryCodeMapper';
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

async function fetchTournamentField(
  tournamentId: string,
  tour: string,
): Promise<DataGolfFieldPlayer[]> {
  try {
    const endpoint = `/field-updates?tour=${tour}&event_id=${tournamentId}&file_format=json&key=${DATAGOLF_API_KEY}`;

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

async function scrapePlayerProfileImage(dgId: number): Promise<string | null> {
  try {
    const profileUrl = `https://datagolf.com/player-profiles?dg_id=${dgId}`;
    const response = await axios.get(profileUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const playerPicSrc = $('.player-pic').attr('src');

    if (!playerPicSrc) {
      console.log(`   ⚠️  No profile image found for player ${dgId}`);
      return null;
    }

    const fullImageUrl = playerPicSrc.startsWith('http')
      ? playerPicSrc
      : `https://datagolf.com${playerPicSrc}`;

    console.log(`   📸 Found profile image: ${fullImageUrl}`);
    return fullImageUrl;
  } catch (error: any) {
    console.error(`   ❌ Error scraping profile image for player ${dgId}:`, error.message);
    return null;
  }
}

async function uploadImageToFirebase(imageUrl: string, dgId: number): Promise<string | null> {
  try {
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
    });

    const bucket = firebaseStorage.bucket('gs://sweepsteak-64dd0.firebasestorage.app');
    const fileExtension = imageUrl.split('.').pop() || 'png';
    const fileName = `player-profiles/${dgId}.${fileExtension}`;
    const file = bucket.file(fileName);

    await file.save(Buffer.from(imageResponse.data), {
      metadata: {
        contentType: imageResponse.headers['content-type'] || 'image/png',
      },
    });

    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    console.log(`   ✅ Uploaded image to Firebase Storage: ${publicUrl}`);
    return publicUrl;
  } catch (error: any) {
    console.error(`   ❌ Error uploading image to Firebase:`, error.message);
    return null;
  }
}

async function upsertPlayerProfile(
  dgId: number,
  playerName: string,
  countryCode: string,
  ranking: number,
  profilePictureUrl: string = '',
): Promise<{ id: string; existingProfilePicture: string } | null> {
  try {
    const { firstName, lastName } = splitPlayerName(playerName);

    const existingProfileByExternalId = await database
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.external_id, String(dgId)))
      .execute();

    if (existingProfileByExternalId.length > 0) {
      const existingPicture = existingProfileByExternalId[0].profile_picture || '';

      const updateData: any = {
        first_name: firstName,
        last_name: lastName,
        country: countryCode,
        ranking: ranking,
        updated_at: new Date(),
      };

      if (profilePictureUrl) {
        updateData.profile_picture = profilePictureUrl;
      }

      await database
        .update(playerProfiles)
        .set(updateData)
        .where(eq(playerProfiles.external_id, String(dgId)))
        .execute();

      console.log(
        `✅ Updated player profile: ${playerName} (DG ID: ${dgId}) [matched by external_id]`,
      );
      return {
        id: existingProfileByExternalId[0].id,
        existingProfilePicture: existingPicture,
      };
    }

    const existingProfileByName = await database
      .select()
      .from(playerProfiles)
      .where(
        and(
          sql`LOWER(${playerProfiles.first_name}) = LOWER(${firstName})`,
          sql`LOWER(${playerProfiles.last_name}) = LOWER(${lastName})`,
          sql`LOWER(${playerProfiles.country}) = LOWER(${countryCode})`,
        ),
      )
      .execute();

    if (existingProfileByName.length > 0) {
      const existingPicture = existingProfileByName[0].profile_picture || '';

      const updateData: any = {
        external_id: String(dgId),
        first_name: firstName,
        last_name: lastName,
        country: countryCode,
        ranking: ranking,
        updated_at: new Date(),
      };

      if (profilePictureUrl) {
        updateData.profile_picture = profilePictureUrl;
      }

      await database
        .update(playerProfiles)
        .set(updateData)
        .where(eq(playerProfiles.id, existingProfileByName[0].id))
        .execute();

      console.log(
        `✅ Updated player profile: ${playerName} (DG ID: ${dgId}) [matched by name & country]`,
      );
      return {
        id: existingProfileByName[0].id,
        existingProfilePicture: existingPicture,
      };
    }

    const playerProfileId = generateId();
    const newProfile = {
      id: playerProfileId,
      first_name: firstName,
      external_id: String(dgId),
      last_name: lastName,
      country: countryCode,
      age: 0,
      ranking: ranking,
      profile_picture: profilePictureUrl,
      group: getRandomGroup(),
    };

    await database.insert(playerProfiles).values(newProfile).execute();

    console.log(`✅ Created player profile: ${playerName} (DG ID: ${dgId})`);
    return {
      id: playerProfileId,
      existingProfilePicture: '',
    };
  } catch (error: any) {
    console.error(`❌ Error upserting player profile for ${playerName}:`, error.message);
    return null;
  }
}

async function upsertPlayer(
  dgId: number,
  profileId: string,
  level: number = 1,
  eventId: string,
): Promise<string | null> {
  try {
    const existingPlayers = await database
      .select()
      .from(players)
      .where(eq(players.external_id, String(dgId)))
      .execute();

    const existingPlayer = existingPlayers.find(
      (p: Player) => p.profile_id === profileId && p.tournament_id === eventId,
    );

    if (existingPlayer) {
      await database
        .update(players)
        .set({
          profile_id: profileId,
          level: level,
          updated_at: new Date(),
        })
        .where(and(eq(players.id, existingPlayer.id), eq(players.tournament_id, eventId)))
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
        tournament_id: eventId,
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

    const databaseTournamentTour = await database
      .select(tournaments)
      .from(tournaments)
      .where(eq(tournaments.external_id, args[0]))
      .execute();

    console.log(
      `📋 Fetching tournament field for event ${tournamentId}...`,
      databaseTournamentTour[0].tour,
    );
    const tournamentField = await fetchTournamentField(
      tournamentId,
      databaseTournamentTour[0].tour || 'pga',
    );

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

      // Map DataGolf country code to ISO 3166-1 alpha-2 format
      const isoCountryCode = mapDataGolfCountryCode(playerData.country_code);

      const profileResult = await upsertPlayerProfile(
        dgId,
        playerData.player_name,
        isoCountryCode,
        ranking,
        '',
      );

      if (profileResult) {
        if (!profileResult.existingProfilePicture) {
          console.log(`   📸 No existing profile picture, fetching from DataGolf...`);
          const imageUrl = await scrapePlayerProfileImage(dgId);
          if (imageUrl) {
            const uploadedUrl = await uploadImageToFirebase(imageUrl, dgId);
            if (uploadedUrl) {
              await upsertPlayerProfile(
                dgId,
                playerData.player_name,
                isoCountryCode,
                ranking,
                uploadedUrl,
              );
            }
          }
        } else {
          console.log(`   ✓ Profile already has image: ${profileResult.existingProfilePicture}`);
        }

        successCount++;
      }
      const playerId = await upsertPlayer(dgId, profileResult.id, level, tournamentId);
      if (playerId) {
        playerIds.push(playerId);
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
