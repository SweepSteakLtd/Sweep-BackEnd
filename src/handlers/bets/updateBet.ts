import { and, eq, inArray } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { bets, players, teams, User } from '../../models';
import { database } from '../../services';

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
    const user = res.locals.user as User;

    const { id } = req.params;
    if (!id) {
      console.log('[debug] missing id in request params');
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    if (
      req.body.team_id === undefined &&
      req.body.player_ids !== undefined &&
      req.body.player_ids.length > 0
    ) {
      return res.status(422).send({
        error: 'Invalid team update',
        message: 'team_id must be provided when updating player_ids',
      });
    }

    if (req.body.player_ids === undefined && req.body.amount === undefined) {
      console.log('[debug] no properties to update in request body');
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'no properties to update' });
    }

    if (req.body.amount !== undefined) {
      const amount = req.body.amount;
      if (amount <= 0) {
        console.log('DEBUG: Bet amount must be greater than zero');
        return res.status(422).send({
          error: 'Invalid bet amount',
          message: 'Bet amount must be greater than zero',
        });
      }
      if (amount > user.current_balance) {
        console.log(
          'DEBUG: Insufficient balance for user to place bet',
          amount,
          user.current_balance,
        );
        return res.status(422).send({
          error: 'Insufficient balance',
          message: `User current balance is not enough to place this bet`,
        });
      }

      if (amount > user.betting_limit) {
        console.log('DEBUG: Betting limit exceeded for user', amount, user.betting_limit);
        return res.status(422).send({
          error: 'Betting limit exceeded',
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
  responses: {
    200: {
      description: '200 updated',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              owner_id: { type: 'string' },
              league_id: { type: 'string' },
              team_id: { type: 'string' },
              amount: { type: 'number' },
              created_at: { type: 'string' },
              updated_at: { type: 'string' },
            },
          },
        },
      },
    },
    403: {
      description: '403 Forbidden',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    422: {
      description: '422 Validation Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'array' },
            },
          },
        },
      },
    },
    500: {
      description: '500 Internal Server Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
      },
      description: 'ID of the bet to update',
    },
  ],
  requestBody: {
    content: {
      'application/json': {
        example: {
          player_ids: ['1', '2', '3'],
          amount: 1000,
        },
      },
    },
    required: true,
  },
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
