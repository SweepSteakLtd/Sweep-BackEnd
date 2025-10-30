import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { users } from '../../../models';
import { database } from '../../../services';

/**
 * Delete user (admin endpoint)
 * @params id - required
 * @returns void
 */
export const deleteUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res
        .status(422)
        .send({ error: 'Invalid request params', message: 'user id is required' });
    }

    await database.delete(users).where(eq(users.id, userId)).execute();

    return res.status(204).send({ data: {} });
  } catch (error: any) {
    console.log(`DELETE USER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

deleteUserHandler.apiDescription = {
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
      description: 'Delete user by id',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
