import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { users } from '../../models';
import { database } from '../../services';
/**
 * Get current user (authenticated endpoint)
 * @returns User
 */
export const getCurrentUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = res.locals.email;
    const existingUser = await database.select().from(users).where(eq(users.email, email)).limit(1).execute();

    if (existingUser.length > 0) {
      return res.status(200).send({ data: existingUser[0] });
    }

    return res.status(401).send({ message: 'Failed getting the user' });
  } catch (error: any) {
    console.log(`GET CURRENT USER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getCurrentUserHandler.apiDescription = {
  responses: {
    200: {
      description: '200 OK',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              email: { type: 'string' },
              bio: { type: 'string' },
              profile_picture: { type: 'string' },
              phone_number: { type: 'string' },
              game_stop_id: { type: 'string' },
              is_auth_verified: { type: 'boolean' },
              is_identity_verified: { type: 'boolean' },
              deposit_limit: { type: 'number' },
              betting_limit: { type: 'number' },
              payment_id: { type: 'string' },
              current_balance: { type: 'number' },
              created_at: { type: 'string' },
              updated_at: { type: 'string' },
            },
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
