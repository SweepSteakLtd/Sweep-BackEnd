import { eq, inArray } from 'drizzle-orm';
import { Request, Response } from 'express';
import {
  Player,
  PlayerProfile,
  Team,
  Tournament,
  User,
  leagues,
  playerProfiles,
  players,
  teams,
  tournaments,
  users,
} from '../../models';
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
  prize: number;
}

/**
 * Get leaderboard for a league (authenticated endpoint)
 * @params league_id - required
 * @returns Object with entries (LeaderboardEntry[]) and total_pot (number)
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

    let league = res.locals.league;

    if (!league) {
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

      league = existingLeague[0];
    }

    // Fetch tournament to calculate current round
    const existingTournament = await database
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, league.tournament_id))
      .limit(1)
      .execute();

    if (!existingTournament.length) {
      console.log('[DEBUG] Tournament not found for league:', league_id);
      return res.status(404).send({
        error: 'Not found',
        message: 'Tournament not found',
      });
    }

    const tournament: Tournament = existingTournament[0];

    // Calculate current round based on tournament start date
    // Round 1 = starting day, Round 2 = day 2, etc. (max 4 rounds)
    const now = new Date();
    const tournamentStart = new Date(tournament.starts_at);

    // Set both dates to midnight for accurate day comparison
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(tournamentStart.getFullYear(), tournamentStart.getMonth(), tournamentStart.getDate());

    // Calculate difference in days
    const daysDifference = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Determine round format: "1/4", "2/4", "3/4", "4/4", or "Tournament finished"
    let roundDisplay: string;
    if (daysDifference >= 4) {
      roundDisplay = 'Tournament finished';
    } else {
      const roundNumber = Math.max(1, daysDifference + 1);
      roundDisplay = `${roundNumber}/4`;
    }

    const leagueTeams: Team[] = await database
      .select()
      .from(teams)
      .where(eq(teams.league_id, league_id))
      .execute();

    // Get team owners
    const ownerIds = leagueTeams.map(team => team.owner_id);
    const uniqueOwnerIds = [...new Set(ownerIds)];
    const teamOwners: User[] = await database
      .select()
      .from(users)
      .where(inArray(users.id, uniqueOwnerIds))
      .execute();

    // Get all players for these teams
    const allPlayerIds = leagueTeams.flatMap(team => team.player_ids);
    const uniquePlayerIds = [...new Set(allPlayerIds)];

    let leaguePlayers: Player[] = [];
    let leaguePlayerProfiles: PlayerProfile[] = [];

    if (uniquePlayerIds.length > 0) {
      leaguePlayerProfiles = await database
        .select()
        .from(playerProfiles)
        .where(inArray(playerProfiles.id, uniquePlayerIds))
        .execute();

      const allPlayerProfileIds = leaguePlayerProfiles.map(profile => profile.id);

      leaguePlayers = await database
        .select()
        .from(players)
        .where(inArray(players.profile_id, allPlayerProfileIds))
        .execute();
    }

    // Check if tournament has started
    const tournamentHasStarted = now >= new Date(tournament.starts_at);

    // Build leaderboard entries
    const leaderboardEntries: LeaderboardEntry[] = [];

    for (const team of leagueTeams) {
      // Get team players
      const teamProfiles = leaguePlayerProfiles.filter(p => team.player_ids.includes(p.id));
      const teamProfileIds = teamProfiles.map(profile => profile.id);
      const teamPlayers = leaguePlayers.filter(p => teamProfileIds.includes(p.profile_id));

      // Calculate total score
      const totalScore = teamPlayers.reduce((sum, player) => sum + (player.current_score || 0), 0);

      // Get best scores (top 4 player scores)
      const sortedScores = teamPlayers
        .map(p => p.current_score || 0)
        .sort((a, b) => a - b)
        .slice(0, 4);

      // Build players array (only if tournament has started)
      const leaderboardPlayers: LeaderboardPlayer[] = tournamentHasStarted
        ? teamPlayers.map(player => {
            const profile = leaguePlayerProfiles.find(p => p.id === player.profile_id);
            return {
              group: profile?.group || '',
              player_name: profile
                ? `${profile.first_name} ${profile.last_name}`
                : `Player ${player.id}`,
              score: player.current_score || 0,
              status: player.missed_cut ? 'MC' : 'F',
            };
          })
        : [];

      // Get team owner name
      const owner = teamOwners.find(u => u.id === team.owner_id);
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
        players: tournamentHasStarted
          ? leaderboardPlayers.sort((a, b) => a.group.localeCompare(b.group))
          : [],
        bestScore: tournamentHasStarted ? sortedScores : [],
        prize: 0, // Prize will be assigned based on position and fixed distribution
      });
    }

    // Sort by total score (ascending for golf scoring)
    leaderboardEntries.sort((a, b) => a.total - b.total);

    // Assign ranks
    leaderboardEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    const totalPot = league.entry_fee * leagueTeams.length * 0.9; // 10% platform fee

    // Fixed prize distribution percentages
    const distributionPercentages = [
      { position: 1, percentage: 0.6 },    // 60%
      { position: 2, percentage: 0.15 },   // 15%
      { position: 3, percentage: 0.125 },  // 12.5%
      { position: 4, percentage: 0.075 },  // 7.5%
      { position: 5, percentage: 0.05 },   // 5%
    ];

    // Build prize distribution array with calculated amounts (only if tournament has started)
    const prizeDistribution = tournamentHasStarted
      ? distributionPercentages.map(dist => ({
          position: dist.position,
          percentage: dist.percentage,
          amount: totalPot * dist.percentage,
        }))
      : [];

    // Assign prizes to teams based on prize distribution (only if tournament has started)
    if (tournamentHasStarted) {
      prizeDistribution.forEach((prize: { position: number; percentage: number; amount: number }) => {
        if (prize.position > 0 && prize.position <= leaderboardEntries.length) {
          leaderboardEntries[prize.position - 1].prize = prize.amount;
        }
      });
    }

    return res.status(200).send({
      data: {
        entries: leaderboardEntries,
        total_pot: totalPot,
        round: roundDisplay,
        prize_distribution: prizeDistribution,
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`GET LEADERBOARD ERROR: ${errorMessage} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getLeaderboardHandler.apiDescription = {
  summary: 'Get leaderboard for a league',
  description:
    'Retrieves the leaderboard for a specific league. Returns ranked teams with names, the total pot amount, and the current tournament round. Player details (players array and bestScore), and prize information (individual prizes and prize_distribution) are only included after the tournament has started. Prizes use a fixed distribution (60%, 15%, 12.5%, 7.5%, 5% for positions 1-5). For private leagues, a valid join_code is required in the query parameters.',
  operationId: 'getLeaderboard',
  tags: ['leaderboards'],
  responses: {
    200: {
      description: 'Leaderboard retrieved successfully',
      content: {
        'application/json': {
          schema: dataWrapper({
            type: 'object',
            required: ['entries', 'total_pot', 'round', 'prize_distribution'],
            properties: {
              entries: {
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
                      description: 'Team players with their scores and status. Only populated after tournament has started, otherwise empty array.',
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
                      description: 'Top 4 player scores for this team. Only populated after tournament has started, otherwise empty array.',
                      example: [-14, -13, -7, -3],
                    },
                    prize: {
                      type: 'number',
                      description: 'Prize amount if team is in winning position. Only populated after tournament has started, otherwise 0.',
                      example: 216066,
                    },
                  },
                },
              },
              total_pot: {
                type: 'number',
                description: 'Total pot amount for the league (entry fee * team count * 0.9)',
                example: 432132,
              },
              round: {
                type: 'string',
                description: 'Current tournament round in format "X/4" (e.g., "1/4", "2/4", "3/4", "4/4") where X is the current round. Returns "Tournament finished" if 5 or more days have passed since tournament start.',
                example: '2/4',
              },
              prize_distribution: {
                type: 'array',
                description: 'Prize distribution breakdown showing position, percentage, and amount for each prize tier. Only populated after tournament has started, otherwise empty array.',
                items: {
                  type: 'object',
                  required: ['position', 'percentage', 'amount'],
                  properties: {
                    position: {
                      type: 'number',
                      minimum: 1,
                      description: 'Prize position (1 for 1st place, 2 for 2nd place, etc.)',
                      example: 1,
                    },
                    percentage: {
                      type: 'number',
                      minimum: 0,
                      maximum: 1,
                      description: 'Percentage of total pot allocated to this position (0.6 = 60%)',
                      example: 0.6,
                    },
                    amount: {
                      type: 'number',
                      minimum: 0,
                      description: 'Prize amount in pence/cents for this position',
                      example: 2160,
                    },
                  },
                },
              },
            },
          }),
          examples: {
            success: {
              summary: 'League leaderboard',
              value: {
                data: {
                  entries: [
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
                      prize: 216066,
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
                      prize: 129640,
                    },
                  ],
                  total_pot: 432132,
                  round: '2/4',
                  prize_distribution: [
                    {
                      position: 1,
                      percentage: 0.6,
                      amount: 259279.2,
                    },
                    {
                      position: 2,
                      percentage: 0.15,
                      amount: 64819.8,
                    },
                    {
                      position: 3,
                      percentage: 0.125,
                      amount: 54016.5,
                    },
                    {
                      position: 4,
                      percentage: 0.075,
                      amount: 32409.9,
                    },
                    {
                      position: 5,
                      percentage: 0.05,
                      amount: 21606.6,
                    },
                  ],
                },
              },
            },
            emptyLeaderboard: {
              summary: 'No teams in league',
              value: {
                data: {
                  entries: [],
                  total_pot: 0,
                  round: '1/4',
                  prize_distribution: [],
                },
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
    {
      name: 'join_code',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description:
        'Join code required to access private leagues. Not required for public leagues or if the user has already joined the league.',
      example: 'ABC123XYZ',
    },
  ],
  security: [apiKeyAuth],
};
