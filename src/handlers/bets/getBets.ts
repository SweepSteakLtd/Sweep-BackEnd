import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { bets } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, arrayDataWrapper, betSchema, standardResponses } from '../schemas';

/**
 * Get bets (authenticated endpoint)
 * @query league_id - optional
 * @returns Bet[]
 */
export const getBetsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leagueId = req.query.league_id as string;
    let existingBets = [];
    // TODO: would it make sense to fetch user values?
    if (leagueId) {
      existingBets = await database
        .select()
        .from(bets)
        .where(eq(bets.league_id, leagueId))
        .execute();
    } else {
      existingBets = await database.select().from(bets).execute();
    }

    return res.status(200).send({ data: existingBets });
  } catch (error: any) {
    console.log(`GET BETS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getBetsHandler.apiDescription = {
  summary: 'Get all bets',
  description:
    'Retrieves all bets, optionally filtered by league ID. Returns bets visible to the authenticated user.',
  operationId: 'getBets',
  tags: ['bets'],
  responses: {
    200: {
      description: 'Bets retrieved successfully',
      content: {
        'application/json': {
          schema: arrayDataWrapper(betSchema),
          examples: {
            allBets: {
              summary: 'All bets',
              value: {
                data: [
                  {
                    id: 'bet_abc123',
                    owner_id: 'user_xyz789',
                    league_id: 'league_456',
                    team_id: 'team_789',
                    amount: 1000,
                    status: 'pending',
                    created_at: '2025-01-15T10:30:00Z',
                    updated_at: '2025-01-15T10:30:00Z',
                  },
                  {
                    id: 'bet_def456',
                    owner_id: 'user_xyz789',
                    league_id: 'league_789',
                    team_id: 'team_012',
                    amount: 2500,
                    status: 'won',
                    created_at: '2025-01-14T08:20:00Z',
                    updated_at: '2025-01-16T18:45:00Z',
                  },
                ],
              },
            },
            filteredBets: {
              summary: 'Bets filtered by league',
              value: {
                data: [
                  {
                    id: 'bet_abc123',
                    owner_id: 'user_xyz789',
                    league_id: 'league_456',
                    team_id: 'team_789',
                    amount: 1000,
                    status: 'pending',
                    created_at: '2025-01-15T10:30:00Z',
                    updated_at: '2025-01-15T10:30:00Z',
                  },
                ],
              },
            },
            empty: {
              summary: 'No bets found',
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
      name: 'league_id',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        format: 'uuid',
      },
      description:
        'Optional league ID to filter bets. If provided, returns only bets for the specified league.',
      example: 'league_masters2025',
    },
  ],
  security: [apiKeyAuth],
};
