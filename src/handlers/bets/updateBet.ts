import { and, eq, inArray } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { bets, players, teams, User } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, betSchema, dataWrapper, standardResponses } from '../schemas';
import { Validators as ArrayValidators } from '../validators/arrayValidator';
import { Validators as NumberValidators } from '../validators/numberValidator';
import { validateString } from '../validators/stringValidator';

/**
 * Update bet (authenticated endpoint)
 * @params id - required
 * @body player_ids - array<string> - optional
 * @body team_id - string - optional
 * @body amount - number - optional
 * @returns Bet
 */
export const updateBetHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate user authentication
    if (!res.locals.user || !res.locals.user.id) {
      console.log('[DEBUG] Missing authenticated user information');
      return res.status(403).send({
        error: 'Forbidden',
        message: 'User authentication is required',
      });
    }

    const user = res.locals.user as User;

    const { id } = req.params;

    // Validate id parameter
    if (!id) {
      console.log('[DEBUG] missing id in request params');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Missing required parameter: id',
      });
    }

    // Validate id is non-empty string
    const idValidation = validateString(id, 'id');
    if (!idValidation.valid) {
      console.log('[DEBUG]', idValidation.error);
      return res.status(422).send({
        error: 'Invalid request body',
        message: idValidation.error,
      });
    }

    // Validate amount if provided
    if (req.body.amount !== undefined) {
      const amountValidation = NumberValidators.amount(req.body.amount);
      if (!amountValidation.valid) {
        console.log('[DEBUG]', amountValidation.error);
        return res.status(422).send({
          error: 'Invalid request body',
          message: amountValidation.error,
        });
      }
    }

    // Validate player_ids if provided
    if (req.body.player_ids !== undefined) {
      const playerIdsValidation = ArrayValidators.playerIds(req.body.player_ids);
      if (!playerIdsValidation.valid) {
        console.log('[DEBUG]', playerIdsValidation.error);
        return res.status(422).send({
          error: 'Invalid request body',
          message: playerIdsValidation.error,
        });
      }
    }

    // Validate team_id if provided
    if (req.body.team_id !== undefined) {
      const teamIdValidation = validateString(req.body.team_id, 'team_id');
      if (!teamIdValidation.valid) {
        console.log('[DEBUG]', teamIdValidation.error);
        return res.status(422).send({
          error: 'Invalid request body',
          message: teamIdValidation.error,
        });
      }
    }

    // Business logic: team_id required when updating player_ids
    if (
      req.body.team_id === undefined &&
      req.body.player_ids !== undefined &&
      req.body.player_ids.length > 0
    ) {
      console.log('[DEBUG] team_id required when updating player_ids');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'team_id must be provided when updating player_ids',
      });
    }

    // At least one property must be provided for update
    if (req.body.player_ids === undefined && req.body.amount === undefined) {
      console.log('[DEBUG] no properties to update in request body');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'At least one property (amount or player_ids) must be provided for update',
      });
    }

    if (req.body.amount !== undefined) {
      const amount = req.body.amount;

      if (amount > user.current_balance) {
        console.log(
          '[DEBUG] Insufficient balance for user to place bet',
          amount,
          user.current_balance,
        );
        return res.status(422).send({
          error: 'Invalid request body',
          message: `User current balance is not enough to place this bet`,
        });
      }

      if (amount > user.betting_limit) {
        console.log('[DEBUG] Betting limit exceeded for user', amount, user.betting_limit);
        return res.status(422).send({
          error: 'Invalid request body',
          message: `User betting limit is ${user.betting_limit}, current bet amount is ${amount}`,
        });
      }

      await database
        .update(bets)
        .set({ amount, updated_at: new Date() })
        .where(eq(bets.id, id))
        .execute();
    }

    if (req.body.player_ids !== undefined && req.body.player_ids.length > 0) {
      const player_ids = req.body.player_ids;
      const team_id = req.body.team_id;

      const existingTeam = await database
        .select()
        .from(teams)
        .where(eq(teams.id, team_id))
        .execute();

      if (existingTeam.length === 0) {
        return res.status(422).send({
          error: 'Invalid team',
          message: `Team does not exist`,
        });
      }

      const existingPlayers = await database
        .select()
        .from(players)
        .where(inArray(players.id, player_ids))
        .execute();

      if (existingPlayers.length !== player_ids.length) {
        return res.status(422).send({
          error: 'Invalid players',
          message: `One or more players are invalid`,
        });
      }

      await database
        .update(teams)
        .set({ player_ids, updated_at: new Date() })
        .where(eq(teams.id, team_id))
        .execute();

      await database.update(bets).set({ updated_at: new Date() }).where(eq(bets.id, id)).execute();
    }

    const updatedInstance = await database
      .select()
      .from(bets)
      .where(and(eq(bets.id, id), eq(bets.owner_id, user.id)))
      .execute();

    return res.status(200).send({ data: updatedInstance[0] });
  } catch (error: any) {
    console.log(`UPDATE BET ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

updateBetHandler.apiDescription = {
  summary: 'Update an existing bet',
  description:
    "Updates a bet's amount or team players. Can update either the bet amount, the team players, or both. Validates betting limits and player availability.",
  operationId: 'updateBet',
  tags: ['bets'],
  responses: {
    200: {
      description: 'Bet updated successfully',
      content: {
        'application/json': {
          schema: dataWrapper(betSchema),
          examples: {
            success: {
              summary: 'Updated bet',
              value: {
                data: {
                  id: 'bet_abc123',
                  owner_id: 'user_xyz789',
                  league_id: 'league_456',
                  team_id: 'team_789',
                  amount: 1500,
                  status: 'pending',
                  created_at: '2025-01-15T10:30:00Z',
                  updated_at: '2025-01-15T11:45:00Z',
                },
              },
            },
          },
        },
      },
    },
    422: standardResponses[422],
    403: standardResponses[403],
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
      description: 'Unique identifier of the bet to update',
      example: 'bet_abc123',
    },
  ],
  requestBody: {
    description: 'Bet update details. At least one field must be provided.',
    required: false,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          minProperties: 1,
          properties: {
            player_ids: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              maxItems: 10,
              uniqueItems: true,
              description:
                'New array of player IDs. Must provide team_id when updating player_ids.',
            },
            team_id: {
              type: 'string',
              description: 'Team ID - required when updating player_ids',
            },
            amount: {
              type: 'number',
              minimum: 1,
              description:
                'New bet amount. Must be within betting limit and user must have sufficient balance.',
            },
          },
        },
        examples: {
          updateAmount: {
            summary: 'Update only the amount',
            value: {
              amount: 1500,
            },
          },
          updatePlayers: {
            summary: 'Update team players',
            value: {
              player_ids: ['player_a', 'player_b', 'player_c'],
              team_id: 'team_123',
            },
          },
          updateBoth: {
            summary: 'Update both amount and players',
            value: {
              amount: 2000,
              player_ids: ['player_x', 'player_y'],
              team_id: 'team_456',
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
