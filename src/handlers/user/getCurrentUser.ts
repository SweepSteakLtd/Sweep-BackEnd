import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { depositLimits } from '../../models';
import { database } from '../../services';
/**
 * Get current user (authenticated endpoint)
 * @returns User
 */
export const getCurrentUserHandler = async (_: Request, res: Response, next: NextFunction) => {
  try {
    if (res.locals.user) {
      const depositLimit = database
        .select(depositLimits)
        .from(depositLimits)
        .where(eq(depositLimits.owner_id, res.locals.user.id))
        .execute();

      return res.status(200).send({ data: { ...res.locals.user, deposit_limit: depositLimit[0] } });
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
              nickname: { type: 'string' },
              email: { type: 'string' },
              bio: { type: 'string' },
              profile_picture: { type: 'string' },
              phone_number: { type: 'string' },
              game_stop_id: { type: 'string' },
              is_auth_verified: { type: 'boolean' },
              is_identity_verified: { type: 'boolean' },
              deposit_limit: {
                type: 'object',
                properties: {
                  daily: { type: 'number' },
                  weekly: { type: 'number' },
                  monthly: { type: 'number' },
                },
              },
              betting_limit: { type: 'number' },
              payment_id: { type: 'string' },
              current_balance: { type: 'number' },
              is_self_exclusion: { type: 'boolean' },
              exclusion_ending: { type: 'string' },
              created_at: { type: 'string' },
              updated_at: { type: 'string' },
              address: {
                type: 'object',
                properties: {
                  street_name: { type: 'string' },
                  street_number: { type: 'number' },
                  unit: { type: 'string' },
                  postal_code: { type: 'string' },
                  city: { type: 'string' },
                  state_province: { type: 'string' },
                  country_code: { type: 'string' },
                },
              },
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
