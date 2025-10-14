import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { games } from '../../models';
import { database } from '../../services';

/**
 * Get all games (authenticated endpoint)
 * @returns Game[]
 */
export const getAllGamesHandler = async (_: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user;
    const existingGame = await database.select().from(games).where(eq(games.owner_id, user.id)).execute();
    // TODO: should we return finished games or only games in progress?
    return res.status(200).send({ data: existingGame });
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
};
