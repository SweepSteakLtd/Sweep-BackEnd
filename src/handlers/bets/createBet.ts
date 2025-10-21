import { createId } from '@paralleldrive/cuid2';
import { eq, inArray } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Bet, bets, Game, games, players, Team, teams, User } from '../../models';
import { database } from '../../services';

/**
 * Create bet (authenticated endpoint)
 * @body game_id - string - required
 * @body player_ids - array<string> - required
 * @body amount - number - required
 * @returns Bet
 */
export const createBetHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user as User;
    const { game_id, player_ids, amount } = req.body;

    if (!game_id || !player_ids || amount === undefined) {
      console.log('DEBUG: Missing required fields in request body');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'required properties missing',
      });
    }

    if (amount <= 0) {
      console.log('DEBUG: Bet amount must be greater than zero');
      return res.status(422).send({
        error: 'Invalid bet amount',
        message: 'Bet amount must be greater than zero',
      });
    }

    if (player_ids.length === 0) {
      console.log('DEBUG: Player IDs array is empty');
      return res.status(422).send({
        error: 'Invalid players',
        message: 'At least one player ID must be provided',
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

    const existingGame: Game[] = await database
      .select()
      .from(games)
      .where(eq(games.id, game_id))
      .execute();

    if (existingGame.length === 0) {
      console.log('DEBUG: Invalid game ID', game_id);
      return res.status(422).send({
        error: 'Invalid game',
        message: `Game with does not exist`,
      });
    }

    if (existingGame[0].end_time < new Date()) {
      console.log('DEBUG: Cannot place bet on finished game', game_id);
      return res.status(422).send({
        error: 'Game has ended',
        message: `Cannot place bet on a finished game`,
      });
    }

    if (existingGame[0].start_time < new Date()) {
      console.log('DEBUG: Cannot place bet on started game', game_id);
      return res.status(422).send({
        error: 'Game has started',
        message: `Cannot place bet on a game that has started`,
      });
    }

    if (existingGame[0].entry_fee > amount) {
      console.log(
        'DEBUG: Bet amount is less than game entry fee',
        amount,
        existingGame[0].entry_fee,
      );
      return res.status(422).send({
        error: 'Invalid bet amount',
        message: `Bet amount must be at least equal to the game's entry fee of ${existingGame[0].entry_fee}`,
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

    const newTeamId = createId();
    const newTeam: Team = {
      id: newTeamId,
      owner_id: user.id,
      player_ids,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await database.insert(teams).values(newTeam).execute();

    const newBet: Bet = {
      id: createId(),
      owner_id: user.id,
      game_id,
      team_id: newTeamId,
      amount,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await database.insert(bets).values(newBet).execute();

    return res.status(201).send({ data: newBet });
  } catch (error: any) {
    console.log(`CREATE BET ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

createBetHandler.apiDescription = {
  responses: {
    201: {
      description: '201 Created',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              owner_id: { type: 'string' },
              game_id: { type: 'string' },
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
  requestBody: {
    content: {
      'application/json': {
        example: {
          game_id: '12345',
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
