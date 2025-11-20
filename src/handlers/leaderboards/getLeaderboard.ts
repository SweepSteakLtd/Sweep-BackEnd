import { eq, inArray } from 'drizzle-orm';
import { Request, Response } from 'express';
import { bets, leagues, players, playerProfiles, teams, users } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, dataWrapper, standardResponses } from '../schemas';

interface LeaderboardPlayer {
  group: string;
  player_name: string;
  score: number;
  status: string;
}

interface LeaderboardEntry {
  rank: number;
  name: {
    main: string;
    substring: string;
  };
  total: number;
  players: LeaderboardPlayer[];
  bestScore: number[];
  prize: string;
}

/**
 * Get leaderboard for a league (authenticated endpoint)
 * @params league_id - required
 * @returns LeaderboardEntry[]
 */
export const getLeaderboardHandler = async (req: Request, res: Response) => {
  try {
    const { league_id } = req.params;

    if (!league_id) {
      console.log('[DEBUG] missing league_id in request params');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Missing required parameter: league_id',
      });
    }

    // Validate league_id is non-empty string
    if (typeof league_id !== 'string' || league_id.trim().length === 0) {
      console.log('[DEBUG] Invalid league_id: must be non-empty string');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'league_id must be a non-empty string',
      });
    }

    // Check if league exists
    const existingLeague = await database
      .select()
      .from(leagues)
      .where(eq(leagues.id, league_id))
      .limit(1)
      .execute();

    if (!existingLeague.length) {
      console.log('[DEBUG] League not found:', league_id);
      return res.status(404).send({
        error: 'Not found',
        message: 'League not found',
      });
    }

    // Get all bets for this league
    const leagueBets = await database
      .select()
      .from(bets)
      .where(eq(bets.league_id, league_id))
      .execute();

    if (!leagueBets.length) {
      // No bets, return empty leaderboard
      return res.status(200).send({ data: [] });
    }

    // Get all teams for these bets
    const teamIds = leagueBets.map((bet: any) => bet.team_id);
    const leagueTeams = await database
      .select()
      .from(teams)
      .where(inArray(teams.id, teamIds))
      .execute();

    // Get team owners
    const ownerIds = leagueTeams.map((team: any) => team.owner_id);
    const uniqueOwnerIds = [...new Set(ownerIds)] as string[];
    const teamOwners = await database
      .select()
      .from(users)
      .where(inArray(users.id, uniqueOwnerIds))
      .execute();

    // Get all players for these teams
    const allPlayerIds = leagueTeams.flatMap((team: any) => team.player_ids);
    const uniquePlayerIds = [...new Set(allPlayerIds)] as string[];

    let leaguePlayers: any[] = [];
    let leaguePlayerProfiles: any[] = [];

    if (uniquePlayerIds.length > 0) {
      leaguePlayers = await database
        .select()
        .from(players)
        .where(inArray(players.id, uniquePlayerIds as string[]))
        .execute();

      // Get player profiles
      const profileIds = leaguePlayers.map((p: any) => p.profile_id) as string[];
      leaguePlayerProfiles = await database
        .select()
        .from(playerProfiles)
        .where(inArray(playerProfiles.id, profileIds))
        .execute();
    }

    // Build leaderboard entries
    const leaderboardEntries: LeaderboardEntry[] = [];

    for (const team of leagueTeams as any[]) {
      // Get team players
      const teamPlayers = leaguePlayers.filter((p: any) => team.player_ids.includes(p.id));

      // Calculate total score
      const totalScore = teamPlayers.reduce(
        (sum: number, player: any) => sum + (player.current_score || 0),
        0,
      );

      // Get best scores (top 3 player scores)
      const sortedScores = teamPlayers
        .map((p: any) => p.current_score || 0)
        .sort((a: number, b: number) => a - b)
        .slice(0, 3);

      // Build players array
      const leaderboardPlayers: LeaderboardPlayer[] = teamPlayers.map((player: any) => {
        const profile = leaguePlayerProfiles.find((p: any) => p.id === player.profile_id);
        return {
          group: String.fromCharCode(65 + (player.level - 1)), // A, B, C, D, E based on level
          player_name: profile
            ? `${profile.first_name} ${profile.last_name}`
            : `Player ${player.id}`,
          score: player.current_score || 0,
          status: player.missed_cut ? 'MC' : 'F',
        };
      });

      // Get team owner name
      const owner = teamOwners.find((u: any) => u.id === team.owner_id);
      const ownerName = owner
        ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || 'Unknown Owner'
        : 'Unknown Owner';

      leaderboardEntries.push({
        rank: 0, // Will be set after sorting
        name: {
          main: team.name || 'Unnamed Team',
          substring: ownerName,
        },
        total: totalScore,
        players: leaderboardPlayers,
        bestScore: sortedScores,
        prize: '$0', // Prize calculation would be based on league rewards
      });
    }

    // Sort by total score (ascending for golf scoring)
    leaderboardEntries.sort((a, b) => a.total - b.total);

    // Assign ranks
    leaderboardEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Calculate prizes based on league rewards
    const league = existingLeague[0];
    if (league.rewards && Array.isArray(league.rewards) && league.rewards.length > 0) {
      const totalPot = league.entry_fee * leagueBets.length;

      for (const reward of league.rewards as any[]) {
        const position = reward.position;
        if (position > 0 && position <= leaderboardEntries.length) {
          const prizeAmount = (totalPot * reward.percentage) / 100;
          leaderboardEntries[position - 1].prize = `$${prizeAmount.toFixed(2)}`;
        }
      }
    }

    return res.status(200).send({ data: leaderboardEntries });
  } catch (error: any) {
    console.log(`GET LEADERBOARD ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getLeaderboardHandler.apiDescription = {
  summary: 'Get leaderboard for a league',
  description:
    'Retrieves the leaderboard for a specific league. Returns ranked teams with their players, scores, and potential prizes based on league rewards.',
  operationId: 'getLeaderboard',
  tags: ['leaderboards'],
  responses: {
    200: {
      description: 'Leaderboard retrieved successfully',
      content: {
        'application/json': {
          schema: dataWrapper({
            type: 'array',
            items: {
              type: 'object',
              required: ['rank', 'name', 'total', 'players', 'bestScore', 'prize'],
              properties: {
                rank: {
                  type: 'number',
                  minimum: 1,
                  description: 'Team rank in the leaderboard',
                  example: 1,
                },
                name: {
                  type: 'object',
                  required: ['main', 'substring'],
                  properties: {
                    main: {
                      type: 'string',
                      description: 'Team name',
                      example: 'Dream Team',
                    },
                    substring: {
                      type: 'string',
                      description: 'Team owner full name',
                      example: 'John Smith',
                    },
                  },
                },
                total: {
                  type: 'number',
                  description: 'Total team score',
                  example: -37,
                },
                players: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['group', 'player_name', 'score', 'status'],
                    properties: {
                      group: {
                        type: 'string',
                        description: 'Player group (A-E based on level)',
                        example: 'A',
                      },
                      player_name: {
                        type: 'string',
                        description: 'Player full name',
                        example: 'Tiger Woods',
                      },
                      score: {
                        type: 'number',
                        description: 'Player score',
                        example: -10,
                      },
                      status: {
                        type: 'string',
                        description: 'Player status (F for final, MC for missed cut)',
                        example: 'F',
                      },
                    },
                  },
                },
                bestScore: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Top 3 player scores for this team',
                  example: [-14, -13, -7],
                },
                prize: {
                  type: 'string',
                  description: 'Prize amount if team is in winning position',
                  example: '$216066',
                },
              },
            },
          }),
          examples: {
            success: {
              summary: 'League leaderboard',
              value: {
                data: [
                  {
                    rank: 1,
                    name: {
                      main: 'Dream Team',
                      substring: 'John Smith',
                    },
                    total: -37,
                    players: [
                      {
                        group: 'A',
                        player_name: 'Tiger Woods',
                        score: -10,
                        status: 'F',
                      },
                      {
                        group: 'B',
                        player_name: 'Rory McIlroy',
                        score: -14,
                        status: 'F',
                      },
                      {
                        group: 'C',
                        player_name: 'Jordan Spieth',
                        score: -13,
                        status: 'F',
                      },
                    ],
                    bestScore: [-14, -13, -10],
                    prize: '$216066',
                  },
                  {
                    rank: 2,
                    name: {
                      main: 'Eagles United',
                      substring: 'Jane Doe',
                    },
                    total: -32,
                    players: [
                      {
                        group: 'A',
                        player_name: 'Phil Mickelson',
                        score: -11,
                        status: 'F',
                      },
                      {
                        group: 'B',
                        player_name: 'Justin Thomas',
                        score: -12,
                        status: 'F',
                      },
                      {
                        group: 'C',
                        player_name: 'Brooks Koepka',
                        score: -9,
                        status: 'F',
                      },
                    ],
                    bestScore: [-12, -11, -9],
                    prize: '$129640',
                  },
                ],
              },
            },
            emptyLeaderboard: {
              summary: 'No bets in league',
              value: {
                data: [],
              },
            },
          },
        },
      },
    },
    404: standardResponses[404],
    422: standardResponses[422],
    403: standardResponses[403],
    500: standardResponses[500],
  },
  parameters: [
    {
      name: 'league_id',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
      },
      description: 'Unique identifier of the league',
      example: 'league_abc123',
    },
  ],
  security: [apiKeyAuth],
};
