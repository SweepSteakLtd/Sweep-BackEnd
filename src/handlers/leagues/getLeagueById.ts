import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { leagues, teams, tournaments } from '../../models';
import { database } from '../../services';
import {
  apiKeyAuth,
  dataWrapper,
  leagueSchema,
  standardResponses,
  tournamentSchema,
} from '../schemas';

/**
 * Get league by ID (authenticated endpoint)
 * @params id - required
 * @returns league with Tournament, user team count, total team count, and total pot
 */
export const getLeagueByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.id) {
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    const existingLeague = await database
      .select()
      .from(leagues)
      .where(eq(leagues.id, req.params.id))
      .limit(1)
      .execute();

    if (existingLeague.length === 0) {
      return res.status(403).send({ error: 'Missing league', message: "league doesn't exist" });
    }

    const fetchedTournaments = await database
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, existingLeague[0].tournament_id))
      .limit(1)
      .execute();

    const fetchedTeams = await database
      .select(teams)
      .from(teams)
      .where(eq(teams.league_id, existingLeague[0].id))
      .execute();

    const userId = res.locals.user?.id;
    const league = existingLeague[0];
    const sanitizedLeague =
      league.owner_id === userId
        ? league
        : (() => {
            const { join_code, ...leagueWithoutJoinCode } = league;
            return leagueWithoutJoinCode;
          })();

    const leagueData = {
      league: sanitizedLeague,
      tournament: fetchedTournaments[0] || {},
      user_team_count: fetchedTeams.filter(team => team.owner_id === userId).length,
      total_team_count: fetchedTeams.length || 0,
      total_pot: fetchedTeams.length * league.entry_fee * 0.9 * 100, // 10% is going to the platform
    };
    return res.status(200).send({ data: leagueData });
  } catch (error: any) {
    console.log(`GET GAME BY ID ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getLeagueByIdHandler.apiDescription = {
  summary: 'Get league by ID',
  description:
    'Retrieves detailed information about a specific league, including its associated tournament, user team count (number of teams the authenticated user has in this league), total team count, and total pot. Private leagues require a valid join_code query parameter for access (validated by middleware). Privacy: join_code is only included in the response for leagues owned by the authenticated user.',
  operationId: 'getLeagueById',
  tags: ['leagues'],
  responses: {
    200: {
      description: 'League retrieved successfully',
      content: {
        'application/json': {
          schema: dataWrapper({
            type: 'object',
            required: ['league', 'tournament', 'user_team_count', 'total_team_count', 'total_pot'],
            properties: {
              league: leagueSchema,
              tournament: tournamentSchema,
              user_team_count: {
                type: 'number',
                description: 'Number of teams the authenticated user has in this league',
              },
              total_team_count: {
                type: 'number',
                description: 'Total number of teams in the league',
              },
              total_pot: {
                type: 'number',
                description: 'Total pot amount (team count * entry fee * 0.9 * 100)',
              },
            },
          }),
          examples: {
            success: {
              summary: 'League with tournament and team count',
              value: {
                data: {
                  league: {
                    id: 'league_abc123',
                    name: 'Masters Championship League',
                    description: 'Compete for the top spot',
                    entry_fee: 100,
                    contact_phone: '+12345678901',
                    contact_email: 'organizer@sweepstake.com',
                    contact_visibility: true,
                    join_code: null,
                    max_participants: 50,
                    rewards: [{ position: 1, percentage: 50, type: 'cash', product_id: '' }],
                    start_time: '2025-04-10T12:00:00Z',
                    end_time: '2025-04-14T18:00:00Z',
                    type: 'public',
                    user_id_list: [],
                    tournament_id: 'tournament_masters2025',
                    owner_id: 'user_xyz789',
                    created_at: '2025-01-15T10:30:00Z',
                    updated_at: '2025-01-15T10:30:00Z',
                  },
                  tournament: {
                    id: 'tournament_masters2025',
                    name: 'The Masters 2025',
                    starts_at: '2025-04-10T12:00:00Z',
                    finishes_at: '2025-04-14T18:00:00Z',
                    description: 'Annual golf tournament',
                    url: 'https://www.masters.com',
                    cover_picture: null,
                    gallery: [],
                    holes: [],
                    ads: [],
                    proposed_entry_fee: 100,
                    maximum_cut_amount: null,
                    maximum_score_generator: null,
                    players: [],
                    created_at: '2025-01-01T00:00:00Z',
                    updated_at: '2025-01-01T00:00:00Z',
                  },
                  user_team_count: 2,
                  total_team_count: 10,
                  total_pot: 90000,
                },
              },
            },
          },
        },
      },
    },
    422: standardResponses[422],
    403: {
      description:
        'Forbidden - Invalid or missing join_code for private league, or league does not exist',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          examples: {
            noJoinCode: {
              summary: 'Private league accessed without join_code',
              value: {
                error: 'Forbidden',
                message: 'This is a private league. A valid join code is required to access it.',
              },
            },
            invalidJoinCode: {
              summary: 'Private league accessed with invalid join_code',
              value: {
                error: 'Forbidden',
                message: 'Invalid join code for this private league.',
              },
            },
            missingLeague: {
              summary: 'League not found',
              value: {
                error: 'Missing league',
                message: "league doesn't exist",
              },
            },
          },
        },
      },
    },
    500: standardResponses[500],
  },
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
        format: 'uuid',
      },
      description: 'Unique identifier of the league to retrieve',
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
        'Join code for accessing private leagues. Required when accessing a private league, optional for public leagues.',
      example: 'GOLF2025',
    },
  ],
  security: [apiKeyAuth],
};
