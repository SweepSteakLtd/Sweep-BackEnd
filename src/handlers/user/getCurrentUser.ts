import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { depositLimits } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, dataWrapper, standardResponses, userSchema } from '../schemas';
/**
 * Get current user (authenticated endpoint)
 * @returns User
 */
export const getCurrentUserHandler = async (_: Request, res: Response, next: NextFunction) => {
  try {
    if (res.locals.user) {
      const depositLimit = await database
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
  summary: 'Get current user',
  description:
    'Retrieves the profile of the currently authenticated user, including their deposit limits.',
  operationId: 'getCurrentUser',
  tags: ['users'],
  responses: {
    200: {
      description: 'User profile retrieved successfully',
      content: {
        'application/json': {
          schema: dataWrapper(userSchema),
          examples: {
            success: {
              summary: 'Current user profile',
              value: {
                data: {
                  id: 'user_abc123',
                  first_name: 'John',
                  last_name: 'Doe',
                  nickname: 'Johnny',
                  email: 'john.doe@example.com',
                  bio: 'Golf enthusiast and sports bettor',
                  profile_picture: 'https://example.com/avatar.jpg',
                  phone_number: '+12345678901',
                  game_stop_id: null,
                  is_auth_verified: true,
                  is_identity_verified: true,
                  deposit_limit: {
                    daily: 100,
                    weekly: 500,
                    monthly: 2000,
                  },
                  betting_limit: 1000,
                  payment_id: 'pay_xyz789',
                  current_balance: 250.5,
                  is_self_excluded: false,
                  is_admin: false,
                  kyc_completed: true,
                  kyc_instance_id: 'kyc_abc456',
                  exclusion_ending: null,
                  address: {
                    street_name: 'Main St',
                    street_number: 123,
                    unit: 'Apt 4B',
                    postal_code: '12345',
                    city: 'New York',
                    state_province: 'NY',
                    country_code: 'US',
                  },
                  created_at: '2025-01-15T10:30:00Z',
                  updated_at: '2025-01-20T14:15:00Z',
                },
              },
            },
          },
        },
      },
    },
    401: {
      description: 'Unauthorized - User not authenticated',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Failed getting the user' },
            },
          },
        },
      },
    },
    403: standardResponses[403],
    500: standardResponses[500],
  },
  security: [apiKeyAuth],
};
