import { and, eq, ilike } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { League, leagues } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, arrayDataWrapper, leagueSchema, standardResponses } from '../schemas';

/**
 * Get all leagues (authenticated endpoint)
 * @returns league[]
 */
export const getAllLeaguesHandler = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const nameQuery = req.query.name as string | undefined;

    if (nameQuery) {
      const nameResults = await database
        .select()
        .from(leagues)
        .where(ilike(leagues.name, nameQuery))
        .execute();

      const userId = res.locals.user?.id;
      const sanitizedResult = nameResults.map((league: League) => {
        if (league.owner_id === userId) {
          return league;
        } else {
          const { join_code, ...leagueWithoutJoinCode } = league;
          return leagueWithoutJoinCode;
        }
      });

      return res.status(200).send({ data: sanitizedResult });
    }

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

    const userId = res.locals.user?.id;
    const sanitizedResult = finalResult
      .map((league: League) => {
        if (league.owner_id === userId) {
          return league;
        } else {
          const { join_code, ...leagueWithoutJoinCode } = league;
          return leagueWithoutJoinCode;
        }
      })
      .filter((league: League) => league.type !== 'private' || league.owner_id === userId);

    // TODO: should we return finished leagues or only leagues in progress?
    return res.status(200).send({ data: sanitizedResult });
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
    'Retrieves all leagues with optional filtering. When using the "name" parameter, searches for leagues by name pattern match (case-insensitive LIKE) and bypasses privacy filters (returns both public and private leagues). Without "name", filters can be applied by tournament, entry fee, owner, or search term. Search term filters by league name or description (case-insensitive substring match) and respects privacy filters. Privacy: join_code is only included in responses for leagues owned by the authenticated user; it is omitted for leagues owned by others.',
  operationId: 'getAllLeagues',
  tags: ['leagues'],
  responses: {
    200: {
      description:
        'Leagues retrieved successfully. Note: join_code only appears for leagues owned by the requesting user.',
      content: {
        'application/json': {
          schema: arrayDataWrapper(leagueSchema),
          examples: {
            mixedOwnership: {
              summary: 'Multiple leagues (authenticated as user_xyz789)',
              description:
                'Shows join_code for owned league (first item) but not for other users leagues (second item)',
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
                    join_code: 'ABC123',
                    max_participants: 50,
                    rewards: [],
                    start_time: '2025-04-10T12:00:00Z',
                    end_time: '2025-04-14T18:00:00Z',
                    type: 'private',
                    user_id_list: [],
                    joined_players: ['user_xyz789'],
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
                    max_participants: 100,
                    rewards: [],
                    start_time: '2025-06-15T12:00:00Z',
                    end_time: '2025-06-18T18:00:00Z',
                    type: 'private',
                    user_id_list: [],
                    joined_players: ['user_abc456'],
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
      name: 'name',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        minLength: 1,
      },
      description: 'Search for leagues by name using pattern matching (case-insensitive LIKE). When provided, bypasses privacy filters and returns all matching leagues regardless of public/private status. Takes precedence over other filters.',
      example: 'Masters',
    },
    {
      name: 'search_term',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        minLength: 1,
      },
      description: 'Case-insensitive search term to filter leagues by name or description. Respects privacy filters (only shows public leagues or private leagues owned by user).',
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
