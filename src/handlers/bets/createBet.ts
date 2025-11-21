import { createId } from '@paralleldrive/cuid2';
import { eq, inArray } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Bet, bets, League, leagues, players, Team, teams, User } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, betSchema, dataWrapper, standardResponses } from '../schemas';
import { Validators as ArrayValidators } from '../validators/arrayValidator';
import { Validators as NumberValidators } from '../validators/numberValidator';
import { validateString } from '../validators/stringValidator';

/**
 * Create bet (authenticated endpoint)
 * @body league_id - string - required
 * @body player_ids - array<string> - required
 * @body amount - number - required
 * @returns Bet
 */
export const createBetHandler = async (req: Request, res: Response, next: NextFunction) => {
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
    const { league_id, player_ids, amount } = req.body;

    // Validate required fields presence
    if (!league_id) {
      console.log('[DEBUG] Missing required field: league_id');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Missing required field: league_id',
      });
    }
    if (!player_ids) {
      console.log('[DEBUG] Missing required field: player_ids');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Missing required field: player_ids',
      });
    }
    if (amount === undefined || amount === null) {
      console.log('[DEBUG] Missing required field: amount');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Missing required field: amount',
      });
    }

    // Validate league_id
    const leagueIdValidation = validateString(league_id, 'league_id');
    if (!leagueIdValidation.valid) {
      console.log('[DEBUG]', leagueIdValidation.error);
      return res.status(422).send({
        error: 'Invalid request body',
        message: leagueIdValidation.error,
      });
    }

    // Validate player_ids
    const playerIdsValidation = ArrayValidators.playerIds(player_ids);
    if (!playerIdsValidation.valid) {
      console.log('[DEBUG]', playerIdsValidation.error);
      return res.status(422).send({
        error: 'Invalid request body',
        message: playerIdsValidation.error,
      });
    }

    // Validate amount
    const amountValidation = NumberValidators.amount(amount);
    if (!amountValidation.valid) {
      console.log('[DEBUG]', amountValidation.error);
      return res.status(422).send({
        error: 'Invalid request body',
        message: amountValidation.error,
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

    const existingGame: League[] = await database
      .select()
      .from(leagues)
      .where(eq(leagues.id, league_id))
      .execute();

    if (existingGame.length === 0) {
      console.log('DEBUG: Invalid game ID', league_id);
      return res.status(422).send({
        error: 'Invalid game',
        message: `Game with does not exist`,
      });
    }

    if (existingGame[0].end_time < new Date()) {
      console.log('DEBUG: Cannot place bet on finished game', league_id);
      return res.status(422).send({
        error: 'Game has ended',
        message: `Cannot place bet on a finished game`,
      });
    }

    if (existingGame[0].start_time < new Date()) {
      console.log('DEBUG: Cannot place bet on started game', league_id);
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
      league_id: league_id,
      player_ids,
      name: null, // TODO: what should this be?
      position: null, // TODO: what should this be?
      created_at: new Date(),
      updated_at: new Date(),
    };

    await database.insert(teams).values(newTeam).execute();

    const newBet: Bet = {
      id: createId(),
      owner_id: user.id,
      league_id,
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
  summary: 'Create a new bet',
  description:
    'Creates a new bet for a league with a team of selected players. Validates betting limits and player availability.',
  operationId: 'createBet',
  tags: ['bets'],
  responses: {
    201: {
      description: 'Bet created successfully',
      content: {
        'application/json': {
          schema: dataWrapper(betSchema),
          examples: {
            success: {
              summary: 'Successful bet creation',
              value: {
                data: {
                  id: 'bet_abc123',
                  owner_id: 'user_xyz789',
                  league_id: 'league_456',
                  team_id: 'team_789',
                  amount: 1000,
                  status: 'pending',
                  created_at: '2025-01-15T10:30:00Z',
                  updated_at: '2025-01-15T10:30:00Z',
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
  requestBody: {
    description: 'Bet creation details',
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['league_id', 'player_ids', 'amount'],
          properties: {
            league_id: {
              type: 'string',
              description: 'ID of the league to bet on',
              example: 'league_abc123',
            },
            player_ids: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              maxItems: 10,
              uniqueItems: true,
              description: 'Array of player IDs to include in the team (1-10 unique players)',
              example: ['player_1', 'player_2', 'player_3'],
            },
            amount: {
              type: 'number',
              minimum: 1,
              description:
                'Bet amount in currency units. Must be greater than 0, within betting limit, and user must have sufficient balance.',
              example: 1000,
            },
          },
        },
        examples: {
          standard: {
            summary: 'Standard bet',
            value: {
              league_id: 'league_masters2025',
              player_ids: ['player_tiger', 'player_rory', 'player_jordan'],
              amount: 500,
            },
          },
          large: {
            summary: 'Large bet with many players',
            value: {
              league_id: 'league_usopen2025',
              player_ids: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'],
              amount: 5000,
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
