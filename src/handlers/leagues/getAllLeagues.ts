import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { League, leagues } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, arrayDataWrapper, leagueSchema, standardResponses } from '../schemas';

/**
 * Get all leagues (authenticated endpoint)
 * @returns league[]
 */
export const getAllLeaguesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existingleague = database.select().from(leagues);

    const allowedFilters = ['entry_fee', 'tournament_id', 'owner_id'];
    const filters = [];

    allowedFilters.forEach(filter => {
      const currentFilter = req.query[filter];
      if (currentFilter) {
        filters.push(eq(leagues[filter], currentFilter));
      }
    });

    let finalResult: League[] | null = null;
    if (filters.length > 0) {
      finalResult = await existingleague
        .where(filters.length > 1 ? and(...filters) : filters[0])
        .execute();
    } else {
      finalResult = await existingleague.execute();
    }
    if (finalResult.length !== 0 && req.query.search_term !== undefined) {
      finalResult = finalResult.filter(
        league =>
          league.name.toLowerCase().includes((req.query.search_term as string).toLowerCase()) ||
          league.description
            .toLowerCase()
            .includes((req.query.search_term as string).toLowerCase()),
      );
    }

    // TODO: should we return finished leagues or only leagues in progress?
    return res.status(200).send({ data: finalResult });
  } catch (error: any) {
    console.log(`GET ALL leagueS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getAllLeaguesHandler.apiDescription = {
  summary: 'Get all leagues',
  description:
    'Retrieves all leagues with optional filtering by tournament, entry fee, owner, or search term. Search term filters by league name or description (case-insensitive).',
  operationId: 'getAllLeagues',
  tags: ['leagues'],
  responses: {
    200: {
      description: 'Leagues retrieved successfully',
      content: {
        'application/json': {
          schema: arrayDataWrapper(leagueSchema),
          examples: {
            allLeagues: {
              summary: 'Multiple leagues',
              value: {
                data: [
                  {
                    id: 'league_abc123',
                    name: 'Masters Championship League',
                    description: 'Compete for the top spot',
                    entry_fee: 100,
                    contact_phone: '+12345678901',
                    contact_email: 'organizer@sweepstake.com',
                    contact_visibility: true,
                    join_code: null,
                    max_participants: 50,
                    rewards: [],
                    start_time: '2025-04-10T12:00:00Z',
                    end_time: '2025-04-14T18:00:00Z',
                    type: 'public',
                    user_id_list: [],
                    tournament_id: 'tournament_masters2025',
                    owner_id: 'user_xyz789',
                    created_at: '2025-01-15T10:30:00Z',
                    updated_at: '2025-01-15T10:30:00Z',
                  },
                  {
                    id: 'league_def456',
                    name: 'US Open Challenge',
                    description: 'Battle it out in this exciting competition',
                    entry_fee: 75,
                    contact_phone: null,
                    contact_email: null,
                    contact_visibility: false,
                    join_code: null,
                    max_participants: 100,
                    rewards: [],
                    start_time: '2025-06-15T12:00:00Z',
                    end_time: '2025-06-18T18:00:00Z',
                    type: 'public',
                    user_id_list: [],
                    tournament_id: 'tournament_usopen2025',
                    owner_id: 'user_abc456',
                    created_at: '2025-01-20T14:00:00Z',
                    updated_at: '2025-01-20T14:00:00Z',
                  },
                ],
              },
            },
            empty: {
              summary: 'No leagues found',
              value: {
                data: [],
              },
            },
          },
        },
      },
    },
    403: standardResponses[403],
    500: standardResponses[500],
  },
  parameters: [
    {
      name: 'search_term',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        minLength: 1,
      },
      description: 'Case-insensitive search term to filter leagues by name or description',
      example: 'masters',
    },
    {
      name: 'tournament_id',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        format: 'uuid',
      },
      description: 'Filter leagues by tournament ID',
      example: 'tournament_masters2025',
    },
    {
      name: 'entry_fee',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'Filter leagues by exact entry fee amount',
      example: '100',
    },
    {
      name: 'owner_id',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        format: 'uuid',
      },
      description: 'Filter leagues by owner user ID',
      example: 'user_xyz789',
    },
  ],
  security: [apiKeyAuth],
};
