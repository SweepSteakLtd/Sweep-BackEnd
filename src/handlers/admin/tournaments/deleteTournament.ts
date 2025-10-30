import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { tournaments } from '../../../models';
import { database } from '../../../services';

/**
 * Delete tournament (admin endpoint)
 * @params id - required
 * @returns void
 */
export const deleteTournamentHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id) {
      console.log('[debug] missing id in request params');
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    const existing = await database
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
      .limit(1)
      .execute();
    if (!existing || existing.length === 0) {
      return res
        .status(403)
        .send({ error: 'Missing tournament', message: "Tournament doesn't exist" });
    }

    await database.delete(tournaments).where(eq(tournaments.id, id)).execute();

    return res.status(204).send({ data: {} });
  } catch (error: any) {
    console.log(`DELETE TOURNAMENT ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

deleteTournamentHandler.apiDescription = {
  responses: {
    204: { description: '204 No Content' },
    403: { description: '403 Forbidden' },
    500: { description: '500 Internal Server Error' },
  },
  parameters: [
    {
      name: 'id',
      in: 'param',
      required: true,
      schema: {
        type: 'string',
      },
      description: 'delete tournament by id',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
