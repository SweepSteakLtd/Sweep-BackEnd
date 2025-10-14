import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { games } from '../../models';
import { database } from '../../services';

/**
 * Delete game (authenticated endpoint)
 * @params id - required
 * @returns void
 */
export const deleteGameHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user;

    if (!req.params.id) {
      return res.status(422).send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    const existingGame = await database
      .select()
      .from(games)
      .where(and(eq(games.id, req.params.id), eq(games.owner_id, user.id)))
      .limit(1)
      .execute();

    if (existingGame.length === 0) {
      return res.status(403).send({ error: 'Missing game', message: "Game doesn't exist" });
    }

    await database
      .delete(games)
      .where(and(eq(games.id, req.params.id), eq(games.owner_id, user.id)))
      .execute();

    return res.status(200).send({ data: {} });
  } catch (error: any) {
    console.log(`DELETE GAME ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

deleteGameHandler.apiDescription = {
  responses: {
    204: { description: '204 No Content' },
    403: { description: '403 Forbidden' },
    422: { description: '422 validation Error' },
    500: { description: '500 Internal Server Error' },
  },
};
