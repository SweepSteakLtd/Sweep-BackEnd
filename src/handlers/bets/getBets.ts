import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { bets } from '../../models';
import { database } from '../../services';

/**
 * Get bets (authenticated endpoint)
 * @query game_id - optional
 * @returns Bet[]
 */
export const getBetsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gameId = req.query.game_id as string;
    let existingBets = [];
    // TODO: would it make sense to fetch user values?
    if (gameId) {
      existingBets = await database.select().from(bets).where(eq(bets.game_id, gameId)).execute();
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
