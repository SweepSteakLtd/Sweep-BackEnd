import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { users } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, arrayDataWrapper, standardResponses, userSchema } from '../../schemas';

/**
 * Get all users (admin endpoint)
 * @query email - optional
 * @returns User[]
 */
export const getAllUsersHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.query.email as string | undefined;

    // Validate email query parameter if provided
    if (email !== undefined && email !== null && email !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof email !== 'string' || !emailRegex.test(email)) {
        console.log('[DEBUG] Invalid email format:', email);
        return res.status(422).send({
          error: 'Invalid query parameter',
          message: 'email must be a valid email address',
        });
      }
    }

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
  summary: 'Get all users (Admin)',
  description:
    'Admin endpoint to retrieve all users with optional email filtering. Returns complete user profiles including sensitive information.',
  operationId: 'adminGetAllUsers',
  tags: ['admin', 'users'],
  responses: {
    200: {
      description: 'Users retrieved successfully',
      content: {
        'application/json': {
          schema: arrayDataWrapper(userSchema),
          examples: {
            allUsers: {
              summary: 'Multiple users',
              value: {
                data: [
                  {
                    id: 'user_abc123',
                    first_name: 'John',
                    last_name: 'Doe',
                    nickname: 'Johnny',
                    email: 'john.doe@example.com',
                    bio: 'Golf enthusiast',
                    profile_picture: 'https://example.com/avatar1.jpg',
                    phone_number: '+12345678901',
                    game_stop_id: null,
                    is_auth_verified: true,
                    is_identity_verified: true,
                    deposit_limit: { daily: 100, weekly: 500, monthly: 2000 },
                    betting_limit: 1000,
                    payment_id: 'pay_xyz789',
                    current_balance: 250,
                    is_self_excluded: false,
                    is_admin: false,
                    kyc_completed: true,
                    kyc_instance_id: 'kyc_abc456',
                    exclusion_ending: null,
                    address: null,
                    created_at: '2025-01-15T10:30:00Z',
                    updated_at: '2025-01-20T14:15:00Z',
                  },
                  {
                    id: 'user_def456',
                    first_name: 'Jane',
                    last_name: 'Smith',
                    nickname: 'Janie',
                    email: 'jane.smith@example.com',
                    bio: 'Sports betting enthusiast',
                    profile_picture: 'https://example.com/avatar2.jpg',
                    phone_number: '+19876543210',
                    game_stop_id: null,
                    is_auth_verified: true,
                    is_identity_verified: false,
                    deposit_limit: { daily: 50, weekly: 250, monthly: 1000 },
                    betting_limit: 500,
                    payment_id: null,
                    current_balance: 100,
                    is_self_excluded: false,
                    is_admin: false,
                    kyc_completed: false,
                    kyc_instance_id: null,
                    exclusion_ending: null,
                    address: null,
                    created_at: '2025-01-18T09:00:00Z',
                    updated_at: '2025-01-18T09:00:00Z',
                  },
                ],
              },
            },
            filteredByEmail: {
              summary: 'Single user by email',
              value: {
                data: [
                  {
                    id: 'user_abc123',
                    first_name: 'John',
                    last_name: 'Doe',
                    nickname: 'Johnny',
                    email: 'john.doe@example.com',
                    bio: 'Golf enthusiast',
                    profile_picture: 'https://example.com/avatar1.jpg',
                    phone_number: '+12345678901',
                    game_stop_id: null,
                    is_auth_verified: true,
                    is_identity_verified: true,
                    deposit_limit: { daily: 100, weekly: 500, monthly: 2000 },
                    betting_limit: 1000,
                    payment_id: 'pay_xyz789',
                    current_balance: 250,
                    is_self_excluded: false,
                    is_admin: false,
                    kyc_completed: true,
                    kyc_instance_id: 'kyc_abc456',
                    exclusion_ending: null,
                    address: null,
                    created_at: '2025-01-15T10:30:00Z',
                    updated_at: '2025-01-20T14:15:00Z',
                  },
                ],
              },
            },
          },
        },
      },
    },
    403: standardResponses[403],
    500: standardResponses[500],
  },
  parameters: [
    {
      name: 'email',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        format: 'email',
      },
      description: 'Filter users by exact email match',
      example: 'john.doe@example.com',
    },
  ],
  security: [apiKeyAuth],
};
