import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { User, users } from '../../../models';
import { database } from '../../../services';

/**
 * Update user (admin endpoint)
 * @params id - required
 * @body first_name - string - optional
 * @body last_name - string - optional
 * @body nickname - string - optional
 * @body email - string - optional
 * @body bio - string - optional
 * @body profile_picture - string - optional
 * @body phone_number - string - optional
 * @body game_stop_id - string - optional
 * @body is_auth_verified - boolean - optional
 * @body is_identity_verified - boolean - optional
 * @body deposit_limit - number - optional
 * @body betting_limit - number - optional
 * @body payment_id - string - optional
 * @body current_balance - number - optional
 * @body is_admin - boolean - optional
 * @body kyc_completed - boolean - optional
 * @body kyc_instance_id - string - optional
 * @body is_self_exclusion - boolean - optional
 * @body exclusion_ending - string - optional
 * @returns User
 */
export const updateUserHandler = async (
  req: Request<Partial<User>>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.params.id;
    const propertiesAvailableForUpdate = [
      'bio',
      'profile_picture',
      'game_stop_id',
      'deposit_limit',
      'betting_limit',
      'payment_id',
      'current_balance',
      'first_name',
      'last_name',
      'phone_number',
      'is_auth_verified',
      'is_identity_verified',
      'is_admin',
      'kyc_completed',
      'kyc_instance_id',
      'nickname',
      'is_self_exclusion',
      'exclusion_ending',
    ];

    if (!userId) {
      return res
        .status(422)
        .send({ error: 'Invalid request params', message: 'user id is required' });
    }

    const updatedUser: Partial<User> = {};

    Object.entries(req.body).forEach(([key, value]) => {
      if (propertiesAvailableForUpdate.includes(key)) {
        updatedUser[key] = value;
      }
    });

    if (updatedUser['is_self_excluded'] && updatedUser['exclusion_ending'] === undefined) {
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'Exclusion requires end date' });
    }

    try {
      if (
        updatedUser['is_self_excluded'] &&
        updatedUser['exclusion_ending'] &&
        new Date(updatedUser['exclusion_ending']) < new Date()
      ) {
        return res
          .status(422)
          .send({ error: 'Invalid request body', message: 'Exclusion date must be in future' });
      }
    } catch (e) {
      console.log('[DEBUG]: failed to parse exclusion date', e);
      return res.status(422).send({
        error: 'Invalid request',
        message: 'Failed to set exclusion date. Please double check data',
      });
    }

    if (!Object.keys(updatedUser).length) {
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }
    updatedUser['updated_at'] = new Date();

    await database
      .update(users)
      .set(updatedUser)
      .where(eq(users.email, res.locals.user.email))
      .execute();

    const existingUser = await database
      .select()
      .from(users)
      .where(eq(users.email, res.locals.user.email))
      .limit(1)
      .execute();

    return res.status(200).send({ data: existingUser[0] });
  } catch (error: any) {
    console.log(`UPDATE USER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

updateUserHandler.apiDescription = {
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
              is_admin: { type: 'boolean' },
              kyc_completed: { type: 'boolean' },
              kyc_instance_id: { type: 'string' },
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
    422: {
      description: '422 Validation Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'array' },
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
  requestBody: {
    content: {
      'application/json': {
        example: {
          first_name: 'John',
          last_name: 'Smith',
          bio: 'Professional golfer',
          profile_picture: 'https://example.com/new-avatar.jpg',
          phone_number: '+1234567890',
          deposit_limit: 2000,
          is_admin: true,
          kyc_completed: false,
          kyc_instance_id: 'abc123',
          betting_limit: 1000,
        },
      },
    },
    required: true,
  },
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
      },
      description: 'ID of the user to update',
    },
  ],
};
