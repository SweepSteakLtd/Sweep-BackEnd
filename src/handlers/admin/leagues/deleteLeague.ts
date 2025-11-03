import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { leagues } from '../../../models';
import { database } from '../../../services';

/**
 * Delete league (admin endpoint)
 * @params id - required
 * @returns void
 */
export const deleteLeagueAdminHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.id) {
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    const existingLeague = await database
      .select()
      .from(leagues)
      .where(eq(leagues.id, req.params.id))
      .limit(1)
      .execute();

    if (existingLeague.length === 0) {
      return res.status(403).send({ error: 'Missing league', message: "League doesn't exist" });
    }

    await database.delete(leagues).where(eq(leagues.id, req.params.id)).execute();

    return res.status(204).send({ data: {} });
  } catch (error: any) {
    console.log(`DELETE GAME ADMIN ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

deleteLeagueAdminHandler.apiDescription = {
  responses: {
    204: { description: '204 No Content' },
    403: { description: '403 Forbidden' },
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
      description: 'ID of the game to delete',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
