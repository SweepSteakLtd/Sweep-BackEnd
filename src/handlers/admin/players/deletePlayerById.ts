import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { players } from '../../../models';
import { database } from '../../../services';

/**
 * Delete player by ID (admin endpoint)
 * @params id - required
 * @returns void
 */
export const deletePlayerByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const playerId = req.params.id;

    if (!playerId) {
      console.log('[DEBUG] missing id in request params');
      return res
        .status(422)
        .send({ error: 'Invalid request params', message: 'required properties missing' });
    }
    await database.delete(players).where(eq(players.id, playerId)).execute();

    return res.status(204).send({ data: {} });
  } catch (error: any) {
    console.log(`DELETE PLAYER BY ID ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
deletePlayerByIdHandler.apiDescription = {
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
      description: 'ID of the player to delete',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
