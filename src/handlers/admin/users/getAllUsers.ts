import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { users } from '../../../models';
import { database } from '../../../services';

/**
 * Get all users (admin endpoint)
 * @query email - optional
 * @returns User[]
 */
export const getAllUsersHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.query.email as string | undefined;

    const existingUsers = await database
      .select()
      .from(users)
      .where(email ? eq(users.email, email) : undefined)
      .execute();

    return res.status(200).send({ data: existingUsers });
  } catch (error: any) {
    console.log(`GET ALL USERS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getAllUsersHandler.apiDescription = {
  responses: {
    200: {
      description: '200 OK',
      content: {
        'application/json': {
          schema: {
            type: 'array',
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
  parameters: [
    {
      name: 'email',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'Email of the user to fetch',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
