import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { games } from '../../models';
import { database } from '../../services';

/**
 * Get all games (authenticated endpoint)
 * @returns Game[]
 */
export const getAllGamesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existingGame = database.select().from(games);

    const allowedFilters = ['entry_fee', 'tournament_id'];
    const filters = [];

    allowedFilters.forEach(filter => {
      const currentFilter = req.query[filter];
      if (currentFilter) {
        filters.push(eq(games[filter], currentFilter));
      }
    });

    let finalResult = null;
    if (filters.length > 0) {
      finalResult = await existingGame.where(filters.length > 1 ? and(...filters) : filters[0]).execute();
    } else {
      finalResult = await existingGame.execute();
    }
    // TODO: should we return finished games or only games in progress?
    return res.status(200).send({ data: finalResult });
  } catch (error: any) {
    console.log(`GET ALL GAMES ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getAllGamesHandler.apiDescription = {
  responses: {
    200: {
      description: '200 OK',
      content: {
        'application/json': {
          schema: {
            type: 'array',
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
