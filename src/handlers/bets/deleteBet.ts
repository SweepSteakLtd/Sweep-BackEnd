import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';

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
  responses: {
    204: {
      description: '204 deleted',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {},
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
