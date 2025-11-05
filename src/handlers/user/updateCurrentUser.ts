import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Deposit, depositLimits, User, users } from '../../models';
import { database } from '../../services';

/**
 * Update current user (authenticated endpoint)
 * @body first_name - string - optional
 * @body last_name - string - optional
 * @body email - string - optional
 * @body phone_number - string - optional
 * @body nickname - string - optional
 * -----------------------------
 * @body bio - string - optional
 * @body profile_picture - string - optional
 * @body game_stop_id - string - optional
 * @body is_auth_verified - boolean - optional
 * @body is_identity_verified - boolean - optional
 * @body deposit_limit - object - optional
 * @body betting_limit - number - optional
 * @body payment_id - string - optional
 * @body current_balance - number - optional
 * @body is_self_exclusion - boolean - optional
 * @body exclusion_ending -string - optional
 * @returns User
 */
export const updateCurrentUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
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
      'nickname',
      'is_self_exclusion',
      'exclusion_ending',
    ];

    const updatedUser: Partial<User> = {
      // TODO: think if we should allow update of is_auth_verified from client or handle it on backend.
      // is_auth_verified: req.body.is_auth_verified,
      // TODO: part of gbg process
      // is_identity_verified: req.body.is_identity_verified,
    };

    Object.entries(req.body).forEach(([key, value]) => {
      if (propertiesAvailableForUpdate.includes(key)) {
        if (key === 'exclusion_ending') {
          updatedUser[key] = new Date(value as string);
        } else {
          updatedUser[key] = value;
        }
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
        updatedUser['exclusion_ending'] < new Date()
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

    if (req.body.deposit_limit) {
      const existingDeposit: Deposit[] = await database
        .select(depositLimits)
        .from(depositLimits)
        .where(eq(depositLimits.owner_id, res.locals.user.id))
        .execute();

      const { weekly, daily, monthly } = req.body.deposit_limit;
      await database
        .update(depositLimits)
        .set({
          ...existingDeposit,
          weekly,
          daily,
          monthly,
          updated_at: updatedUser['updated_at'],
        })
        .where(eq(depositLimits.owner_id, res.locals.user.id))
        .execute();
    }

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
    console.log(`[DEBUG]: UPDATE CURRENT USER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

updateCurrentUserHandler.apiDescription = {
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
          nickname: 'Super cool dude',
          bio: 'Professional golfer',
          profile_picture: 'https://example.com/new-avatar.jpg',
          phone_number: '+1234567890',
          deposit_limit: {
            daily: 100,
            weekly: 200,
            monthly: 300,
          },
          betting_limit: 1000,
          is_self_exclusion: false,
        },
      },
    },
    required: true,
  },
};
