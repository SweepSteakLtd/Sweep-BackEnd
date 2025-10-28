import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Game, games } from '../../../models';
import { database } from '../../../services';

/**
 * Get all games (admin endpoint)
 * @query owner_id - optional
 * @query entry_fee - optional
 * @query tournament_id - optional
 * @query search_term - optional
 * @returns Game[]
 */
export const getAllGamesAdminHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existingGame = database.select().from(games);

    const allowedFilters = ['entry_fee', 'owner_id', 'tournament_id'];
    const filters = [];

    allowedFilters.forEach(filter => {
      const currentFilter = req.query[filter];
      if (currentFilter) {
        filters.push(eq(games[filter], currentFilter));
      }
    });

    let finalResult: Game[] | null = null;
    if (filters.length > 0) {
      finalResult = await existingGame
        .where(filters.length > 1 ? and(...filters) : filters[0])
        .execute();
    } else {
      finalResult = await existingGame.execute();
    }
    if (finalResult.length !== 0 && req.query.search_term !== undefined) {
      finalResult = finalResult.filter(
        game =>
          game.name.toLowerCase().includes((req.query.search_term as string).toLowerCase()) ||
          game.description.toLowerCase().includes((req.query.search_term as string).toLowerCase()),
      );
    }

    // TODO: should we return finished games or only games in progress?
    return res.status(200).send({ data: finalResult });
  } catch (error: any) {
    console.log(`GET ALL GAMES ADMIN ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getAllGamesAdminHandler.apiDescription = {
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
  parameters: [
    {
      name: 'owener_id',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'Filter games by owner ID',
    },
    {
      name: 'search_term',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'Search term to filter games by name or description',
    },
    {
      name: 'tournament_id',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'Filter games by tournament ID',
    },
    {
      name: 'entry_fee',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'Filter games by entry fee',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
