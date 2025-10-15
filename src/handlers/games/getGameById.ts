import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { bets, games, tournaments } from '../../models';
import { database } from '../../services';

/**
 * Get game by ID (authenticated endpoint)
 * @params id - required
 * @returns Game with Tournament and Bets
 */
export const getGameByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.id) {
      return res.status(422).send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    const existingGame = await database.select().from(games).where(eq(games.id, req.params.id)).limit(1).execute();

    if (existingGame.length === 0) {
      return res.status(403).send({ error: 'Missing game', message: "Game doesn't exist" });
    }

    const fetchedTournaments = await database.select().from(tournaments).where(eq(tournaments.id, existingGame[0].tournament_id)).limit(1).execute();
    const fetchedBets = await database.select().from(bets).where(eq(bets.game_id, existingGame[0].id)).limit(1).execute();

    const gameData = {
      game: existingGame[0],
      tournament: fetchedTournaments[0] || {},
      user_bets: fetchedBets,
    };
    return res.status(200).send({ data: gameData });
  } catch (error: any) {
    console.log(`GET GAME BY ID ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getGameByIdHandler.apiDescription = {
  responses: {
    200: {
      description: '200 OK',
      content: {
        'application/json': {
          schema: {
            type: 'object',
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
      description: '422 validation Error',
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
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
