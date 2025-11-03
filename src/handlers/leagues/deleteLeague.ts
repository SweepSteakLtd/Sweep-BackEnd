import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { leagues } from '../../models';
import { database } from '../../services';

/**
 * Delete league (authenticated endpoint)
 * @params id - required
 * @returns void
 */
export const deleteLeagueHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user;

    if (!req.params.id) {
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    const existingleague = await database
      .select()
      .from(leagues)
      .where(and(eq(leagues.id, req.params.id), eq(leagues.owner_id, user.id)))
      .limit(1)
      .execute();

    if (existingleague.length === 0) {
      return res.status(403).send({ error: 'Missing league', message: "league doesn't exist" });
    }

    await database
      .delete(leagues)
      .where(and(eq(leagues.id, req.params.id), eq(leagues.owner_id, user.id)))
      .execute();

    return res.status(204).send({ data: {} });
  } catch (error: any) {
    console.log(`DELETE league ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

deleteLeagueHandler.apiDescription = {
  responses: {
    204: { description: '204 No Content' },
    403: { description: '403 Forbidden' },
    422: { description: '422 validation Error' },
    500: { description: '500 Internal Server Error' },
  },
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
      },
      description: 'ID of the league to delete',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
