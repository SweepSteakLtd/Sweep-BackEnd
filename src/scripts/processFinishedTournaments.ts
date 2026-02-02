import { createId } from '@paralleldrive/cuid2';
import * as dotenv from 'dotenv';
import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import {
  League,
  Player,
  RewardSplitData,
  Tournament,
  User,
  leagues,
  players,
  teams,
  tournaments,
  transactions,
  users,
} from '../models';
import { database, ensureDatabaseReady } from '../services';
import { calculateRewardAmount, calculateTotalPot, validateRewardPercentages } from '../utils';

dotenv.config();

interface TeamScore {
  teamId: string;
  ownerId: string;
  totalScore: number;
  rank: number;
}

interface AuditLogEntry {
  timestamp: string;
  tournamentId: string;
  tournamentName: string;
  action: string;
  details: Record<string, unknown>;
}

const auditLog: AuditLogEntry[] = [];

function log(
  tournamentId: string,
  tournamentName: string,
  action: string,
  details: Record<string, unknown> = {},
) {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    tournamentId,
    tournamentName,
    action,
    details,
  };
  auditLog.push(entry);
  console.log(
    `[${entry.timestamp}] [${tournamentName}] ${action}${Object.keys(details).length > 0 ? ': ' + JSON.stringify(details) : ''}`,
  );
}

/**
 * Get tournaments that have finished but haven't been processed yet
 */
async function getFinishedTournaments(): Promise<Tournament[]> {
  try {
    const now = new Date();

    // Find tournaments where:
    // 1. finishes_at is in the past
    // 2. status is 'active' (not already processed)
    const finishedTournaments = await database
      .select()
      .from(tournaments)
      .where(and(lte(tournaments.finishes_at, now), eq(tournaments.status, 'active')))
      .execute();

    console.log(`\n📋 Found ${finishedTournaments.length} finished tournaments to process`);
    return finishedTournaments;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error fetching finished tournaments:', errorMessage);
    return [];
  }
}

/**
 * Calculate team scores and rankings for a league
 */
async function calculateLeaderboard(
  league: League,
  tournamentId: string,
  tournamentName: string,
): Promise<TeamScore[]> {
  try {
    log(tournamentId, tournamentName, 'Calculating leaderboard', { leagueId: league.id });

    // Get all teams in this league
    const leagueTeams = await database
      .select()
      .from(teams)
      .where(eq(teams.league_id, league.id))
      .execute();

    if (leagueTeams.length === 0) {
      log(tournamentId, tournamentName, 'No teams found in league', { leagueId: league.id });
      return [];
    }

    log(tournamentId, tournamentName, 'Teams found', { count: leagueTeams.length });

    // Get all unique player IDs from all teams
    const allPlayerIds = leagueTeams.flatMap(team => team.player_ids || []);
    const uniquePlayerIds = Array.from(new Set(allPlayerIds));

    if (uniquePlayerIds.length === 0) {
      log(tournamentId, tournamentName, 'No players found in teams', { leagueId: league.id });
      return [];
    }

    // Fetch all players' scores
    const leaguePlayers = await database
      .select()
      .from(players)
      .where(inArray(players.id, uniquePlayerIds as string[]))
      .execute();

    // Calculate score for each team
    const teamScores: TeamScore[] = [];

    for (const team of leagueTeams) {
      const teamPlayers = leaguePlayers.filter((p: Player) => team.player_ids.includes(p.id));

      // Get best 4 scores (lowest scores in golf)
      const sortedScores = teamPlayers
        .map((p: Player) => p.current_score || 0)
        .sort((a: number, b: number) => a - b)
        .slice(0, 4);

      const totalScore = sortedScores.reduce((sum: number, score: number) => sum + score, 0);

      teamScores.push({
        teamId: team.id,
        ownerId: team.owner_id,
        totalScore,
        rank: 0, // Will be set after sorting
      });

      log(tournamentId, tournamentName, 'Team score calculated', {
        teamId: team.id,
        totalScore,
        playerCount: teamPlayers.length,
      });
    }

    // Sort by score (ascending for golf) and assign ranks
    teamScores.sort((a, b) => a.totalScore - b.totalScore);
    teamScores.forEach((team, index) => {
      team.rank = index + 1;
    });

    log(tournamentId, tournamentName, 'Leaderboard calculated', {
      leagueId: league.id,
      teamCount: teamScores.length,
    });

    return teamScores;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error calculating leaderboard for league ${league.id}:`, errorMessage);
    log(tournamentId, tournamentName, 'Error calculating leaderboard', {
      leagueId: league.id,
      error: errorMessage,
    });
    return [];
  }
}

/**
 * Assign rewards to winners based on league reward structure
 */
async function assignRewards(
  league: League,
  leaderboard: TeamScore[],
  tournamentId: string,
  tournamentName: string,
): Promise<void> {
  try {
    log(tournamentId, tournamentName, 'Starting reward assignment', {
      leagueId: league.id,
      totalTeams: leaderboard.length,
    });

    // Validation: Entry fee must be positive
    if (!league.entry_fee || league.entry_fee <= 0) {
      log(tournamentId, tournamentName, 'Invalid entry fee', {
        leagueId: league.id,
        entryFee: league.entry_fee,
      });
      throw new Error(`League ${league.id} has invalid entry fee: ${league.entry_fee}`);
    }

    const totalPot = calculateTotalPot(league.entry_fee, leaderboard.length);

    log(tournamentId, tournamentName, 'Prize pool calculated', {
      entryFee: league.entry_fee,
      teamCount: leaderboard.length,
      platformFee: '10%',
      totalPot,
    });

    // Default reward distribution if not specified in league
    const defaultRewards: RewardSplitData[] = [
      { position: 1, percentage: 0.6, type: 'cash', product_id: '' },
      { position: 2, percentage: 0.15, type: 'cash', product_id: '' },
      { position: 3, percentage: 0.125, type: 'cash', product_id: '' },
      { position: 4, percentage: 0.075, type: 'cash', product_id: '' },
      { position: 5, percentage: 0.05, type: 'cash', product_id: '' },
    ];

    const rewardStructure =
      league.rewards && league.rewards.length > 0 ? league.rewards : defaultRewards;

    // Validation: Reward percentages must not exceed 100%
    const { isValid, totalPercentage } = validateRewardPercentages(rewardStructure);
    if (!isValid) {
      log(tournamentId, tournamentName, 'Invalid reward percentages', {
        leagueId: league.id,
        totalPercentage,
      });
      throw new Error(
        `League ${league.id} rewards exceed 100%: ${(totalPercentage * 100).toFixed(1)}%`,
      );
    }

    // Fetch all users upfront to avoid N+1 query problem
    const ownerIds = leaderboard.map(t => t.ownerId);
    const allUsers = await database
      .select()
      .from(users)
      .where(inArray(users.id, ownerIds))
      .execute();
    const userMap = new Map<string, User>(allUsers.map((u: User) => [u.id, u]));

    let totalAwarded = 0;

    for (const reward of rewardStructure) {
      // Wrap each reward assignment in try-catch to handle partial failures
      try {
        // Find the team at this position
        const teamAtPosition = leaderboard.find(t => t.rank === reward.position);

        if (!teamAtPosition) {
          log(tournamentId, tournamentName, 'No team at position', { position: reward.position });
          continue;
        }

        const rewardAmount = calculateRewardAmount(totalPot, reward.percentage);

        if (rewardAmount <= 0) {
          log(tournamentId, tournamentName, 'Reward amount is zero', {
            position: reward.position,
            percentage: reward.percentage,
          });
          continue;
        }

        // Get user from map (already fetched)
        const user = userMap.get(teamAtPosition.ownerId);

        if (!user) {
          log(tournamentId, tournamentName, 'User not found', { userId: teamAtPosition.ownerId });
          continue;
        }

        const transactionId = createId();

        // ✅ FIX: Wrap balance update and transaction creation in database transaction
        await database.transaction(async (tx: any) => {
          // ✅ FIX: Use atomic SQL increment for balance update
          await tx
            .update(users)
            .set({
              current_balance: sql`${users.current_balance} + ${rewardAmount}`,
              updated_at: new Date(),
            })
            .where(eq(users.id, teamAtPosition.ownerId));

          // Create transaction record
          await tx.insert(transactions).values({
            id: transactionId,
            name: `Prize - ${league.name} (${tournamentName})`,
            value: rewardAmount,
            type: 'prize',
            user_id: teamAtPosition.ownerId,
            payment_status: 'COMPLETED',
            metadata: {
              tournament_id: tournamentId,
              tournament_name: tournamentName,
              league_id: league.id,
              league_name: league.name,
              team_id: teamAtPosition.teamId,
              position: reward.position,
              total_pot: totalPot,
              percentage: reward.percentage,
            },
            created_at: new Date(),
            updated_at: new Date(),
          });
        });

        totalAwarded += rewardAmount;

        const newBalance = (user.current_balance || 0) + rewardAmount;

        log(tournamentId, tournamentName, 'Reward assigned', {
          userId: teamAtPosition.ownerId,
          position: reward.position,
          amount: rewardAmount,
          percentage: reward.percentage,
          transactionId,
          newBalance,
        });
      } catch (rewardError: unknown) {
        const errorMessage = rewardError instanceof Error ? rewardError.message : 'Unknown error';
        console.error(`❌ Failed to assign reward for position ${reward.position}:`, errorMessage);
        log(tournamentId, tournamentName, 'Reward assignment failed', {
          position: reward.position,
          error: errorMessage,
        });
        // Continue with next position instead of stopping
      }
    }

    log(tournamentId, tournamentName, 'All rewards assigned', {
      leagueId: league.id,
      totalPot,
      totalAwarded,
      platformFee: totalPot - totalAwarded,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error assigning rewards for league ${league.id}:`, errorMessage);
    log(tournamentId, tournamentName, 'Error assigning rewards', {
      leagueId: league.id,
      error: errorMessage,
    });
    throw error;
  }
}

/**
 * Update team positions in the database
 */
async function updateTeamPositions(
  leaderboard: TeamScore[],
  tournamentId: string,
  tournamentName: string,
): Promise<void> {
  try {
    // ✅ FIX: Use Promise.all for parallel updates instead of sequential
    await Promise.all(
      leaderboard.map(teamScore =>
        database
          .update(teams)
          .set({
            position: String(teamScore.rank),
            updated_at: new Date(),
          })
          .where(eq(teams.id, teamScore.teamId))
          .execute()
          .then(() => {
            log(tournamentId, tournamentName, 'Team position updated', {
              teamId: teamScore.teamId,
              position: teamScore.rank,
              score: teamScore.totalScore,
            });
          }),
      ),
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error updating team positions:`, errorMessage);
    log(tournamentId, tournamentName, 'Error updating team positions', { error: errorMessage });
    throw error;
  }
}

/**
 * Process a single tournament
 */
async function processTournament(tournament: Tournament): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  log(tournament.id, tournament.name, 'Processing tournament', {
    id: tournament.id,
    finishedAt: tournament.finishes_at,
  });

  // ✅ FIX: Mark as 'processing' FIRST using optimistic locking
  const updateResult = await database
    .update(tournaments)
    .set({
      status: 'processing',
      updated_at: new Date(),
    })
    .where(and(eq(tournaments.id, tournament.id), eq(tournaments.status, 'active')))
    .execute();

  // Check if we actually acquired the lock
  if (updateResult.length === 0) {
    log(tournament.id, tournament.name, 'Already processing or finished, skipping');
    console.log(
      `⏭️  Tournament ${tournament.name} is already being processed or finished. Skipping.`,
    );
    return;
  }

  log(tournament.id, tournament.name, 'Tournament locked for processing', {
    status: 'processing',
  });

  try {
    // Find all leagues for this tournament
    const tournamentLeagues = await database
      .select()
      .from(leagues)
      .where(eq(leagues.tournament_id, tournament.id))
      .execute();

    if (tournamentLeagues.length === 0) {
      log(tournament.id, tournament.name, 'No leagues found');
      // Still mark as finished even if no leagues
      await markTournamentAsFinished(tournament);
      return;
    }

    log(tournament.id, tournament.name, 'Leagues found', { count: tournamentLeagues.length });

    // Process each league
    for (const league of tournamentLeagues) {
      console.log(`\n${'-'.repeat(60)}`);
      log(tournament.id, tournament.name, 'Processing league', {
        leagueId: league.id,
        leagueName: league.name,
      });

      // Calculate leaderboard
      const leaderboard = await calculateLeaderboard(league, tournament.id, tournament.name);

      if (leaderboard.length === 0) {
        log(tournament.id, tournament.name, 'Empty leaderboard, skipping', {
          leagueId: league.id,
        });
        continue;
      }

      // Update team positions
      await updateTeamPositions(leaderboard, tournament.id, tournament.name);

      // Assign rewards
      await assignRewards(league, leaderboard, tournament.id, tournament.name);

      log(tournament.id, tournament.name, 'League processing complete', {
        leagueId: league.id,
        teamsProcessed: leaderboard.length,
      });
    }

    // Mark tournament as finished
    await markTournamentAsFinished(tournament);

    log(tournament.id, tournament.name, 'Tournament processing complete', {
      leaguesProcessed: tournamentLeagues.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`❌ Error processing tournament ${tournament.id}:`, errorMessage);
    log(tournament.id, tournament.name, 'Error processing tournament', {
      error: errorMessage,
      stack: errorStack,
    });
    // Tournament remains in 'processing' state - manual intervention needed
    console.log(
      `⚠️  Tournament ${tournament.name} remains in 'processing' state due to error. Manual intervention required.`,
    );
    throw error;
  }
}

/**
 * Mark tournament as finished
 */
async function markTournamentAsFinished(tournament: Tournament): Promise<void> {
  try {
    await database
      .update(tournaments)
      .set({
        status: 'finished',
        updated_at: new Date(),
      })
      .where(eq(tournaments.id, tournament.id))
      .execute();

    log(tournament.id, tournament.name, 'Tournament marked as finished');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error marking tournament ${tournament.id} as finished:`, errorMessage);
    log(tournament.id, tournament.name, 'Error marking as finished', { error: errorMessage });
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🏆 Starting finished tournament processing job...');
  console.log(`📅 Timestamp: ${new Date().toISOString()}\n`);

  try {
    console.log('⏳ Waiting for database connection...');
    await ensureDatabaseReady();
    console.log('✅ Database connection established\n');

    // Get all finished tournaments that need processing
    const finishedTournaments = await getFinishedTournaments();

    if (finishedTournaments.length === 0) {
      console.log('ℹ️  No finished tournaments to process. Exiting.');
      return;
    }

    console.log(`\n🎯 Processing ${finishedTournaments.length} tournament(s)...\n`);

    let successCount = 0;
    let errorCount = 0;

    // Process each tournament
    for (const tournament of finishedTournaments) {
      try {
        await processTournament(tournament);
        successCount++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to process tournament ${tournament.id}:`, errorMessage);
        errorCount++;
        // Continue with next tournament even if one fails
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n✅ Processing complete!`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Failed: ${errorCount}`);
    console.log(`   Total: ${finishedTournaments.length}`);

    // Output audit log summary
    console.log(`\n📊 Audit Log Summary:`);
    console.log(`   Total actions: ${auditLog.length}`);

    // Group actions by type
    const actionCounts: Record<string, number> = {};
    auditLog.forEach(entry => {
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
    });

    console.log(`   Actions breakdown:`);
    Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([action, count]) => {
        console.log(`     - ${action}: ${count}`);
      });

    console.log('\n✅ Finished tournament processing job completed successfully');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('❌ Fatal error in main execution:', errorMessage);
    if (errorStack) {
      console.error(errorStack);
    }
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
