import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { playerProfiles } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, standardResponses } from '../../schemas';

/**
 * Delete player profile (admin endpoint)
 * @params id - required
 * @returns void
 */
export const deletePlayerProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const playerProfileId = req.params.id;

    if (!playerProfileId) {
      console.log('[DEBUG] missing id in request params');
      return res
        .status(422)
        .send({ error: 'Invalid request params', message: 'required properties missing' });
    }

    await database.delete(playerProfiles).where(eq(playerProfiles.id, playerProfileId)).execute();

    return res.status(204).send({ data: {} });
  } catch (error: any) {
    console.log(`DELETE PLAYER PROFILE ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

deletePlayerProfileHandler.apiDescription = {
  summary: 'Delete player profile (Admin)',
  description:
    'Admin endpoint to permanently delete a player profile by ID. This operation cannot be undone.',
  operationId: 'adminDeletePlayerProfile',
  tags: ['admin', 'player-profiles'],
  responses: {
    204: {
      description: 'Player profile deleted successfully - No content returned',
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
      description: 'Unique identifier of the player profile to delete',
      example: 'profile_abc123',
    },
  ],
  security: [apiKeyAuth],
};
