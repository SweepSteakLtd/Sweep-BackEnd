import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { players } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, standardResponses } from '../../schemas';

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
  summary: 'Delete player (Admin)',
  description:
    'Admin endpoint to permanently delete a player by ID. This operation cannot be undone.',
  operationId: 'adminDeletePlayer',
  tags: ['admin', 'players'],
  responses: {
    204: {
      description: 'Player deleted successfully - No content returned',
    },
    422: standardResponses[422],
    403: standardResponses[403],
    500: standardResponses[500],
  },
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
        format: 'uuid',
      },
      description: 'Unique identifier of the player to delete',
      example: 'player_abc123',
    },
  ],
  security: [apiKeyAuth],
};
