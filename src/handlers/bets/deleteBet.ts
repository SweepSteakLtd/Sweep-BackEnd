import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { apiKeyAuth, standardResponses } from '../schemas';

/**
 * Delete bet (authenticated endpoint)
 * @params id - required
 * @returns void
 */
export const deleteBetHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      console.log('[debug] missing id in request params');
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }
    // TODO: Should user be able to delete bet whenever they want?

    await database.delete().from('bets').where('id', id).execute();

    return res.status(204).send({ data: {} });
  } catch (error: any) {
    console.log(`DELETE BET ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

deleteBetHandler.apiDescription = {
  summary: 'Delete a bet',
  description: 'Deletes an existing bet. Returns 204 No Content on successful deletion.',
  operationId: 'deleteBet',
  tags: ['bets'],
  responses: {
    204: {
      description: 'Bet deleted successfully - No content returned',
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
      description: 'Unique identifier of the bet to delete',
      example: 'bet_abc123',
    },
  ],
  security: [apiKeyAuth],
};
