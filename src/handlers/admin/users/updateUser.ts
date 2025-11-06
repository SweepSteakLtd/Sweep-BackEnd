import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { User, users } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, dataWrapper, standardResponses, userSchema } from '../../schemas';

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
 * @body exclusion_ending - string - optional
 * @returns User
 */
export const updateUserHandler = async (req: Request, res: Response, next: NextFunction) => {
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
      'exclusion_ending',
    ];

    // Validate id parameter
    if (!userId) {
      console.log('[DEBUG] missing id in request params');
      return res
        .status(422)
        .send({ error: 'Invalid request params', message: 'user id is required' });
    }

    // Validate id is non-empty string
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      console.log('[DEBUG] Invalid id: must be non-empty string');
      return res.status(422).send({
        error: 'Invalid request params',
        message: 'id must be a non-empty string',
      });
    }

    // Validate first_name if provided
    if (req.body.first_name !== undefined && req.body.first_name !== null) {
      if (typeof req.body.first_name !== 'string' || req.body.first_name.trim().length === 0) {
        console.log('[DEBUG] Invalid first_name: must be non-empty string');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'first_name must be a non-empty string',
        });
      }
      if (req.body.first_name.length > 100) {
        console.log('[DEBUG] Invalid first_name: exceeds max length');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'first_name must not exceed 100 characters',
        });
      }
    }

    // Validate last_name if provided
    if (req.body.last_name !== undefined && req.body.last_name !== null) {
      if (typeof req.body.last_name !== 'string' || req.body.last_name.trim().length === 0) {
        console.log('[DEBUG] Invalid last_name: must be non-empty string');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'last_name must be a non-empty string',
        });
      }
      if (req.body.last_name.length > 100) {
        console.log('[DEBUG] Invalid last_name: exceeds max length');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'last_name must not exceed 100 characters',
        });
      }
    }

    // Validate phone_number if provided
    if (
      req.body.phone_number !== undefined &&
      req.body.phone_number !== null &&
      req.body.phone_number !== ''
    ) {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (typeof req.body.phone_number !== 'string' || !phoneRegex.test(req.body.phone_number)) {
        console.log('[DEBUG] Invalid phone_number format:', req.body.phone_number);
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'phone_number must be in E.164 format (e.g., +12345678901)',
        });
      }
    }

    // Validate nickname if provided
    if (req.body.nickname !== undefined && req.body.nickname !== null && req.body.nickname !== '') {
      if (typeof req.body.nickname !== 'string') {
        console.log('[DEBUG] Invalid nickname: must be string');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'nickname must be a string',
        });
      }
      if (req.body.nickname.length > 50) {
        console.log('[DEBUG] Invalid nickname: exceeds max length');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'nickname must not exceed 50 characters',
        });
      }
    }

    // Validate bio if provided
    if (req.body.bio !== undefined && req.body.bio !== null && req.body.bio !== '') {
      if (typeof req.body.bio !== 'string') {
        console.log('[DEBUG] Invalid bio: must be string');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'bio must be a string',
        });
      }
      if (req.body.bio.length > 500) {
        console.log('[DEBUG] Invalid bio: exceeds max length');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'bio must not exceed 500 characters',
        });
      }
    }

    // Validate profile_picture if provided
    if (
      req.body.profile_picture !== undefined &&
      req.body.profile_picture !== null &&
      req.body.profile_picture !== ''
    ) {
      if (typeof req.body.profile_picture !== 'string') {
        console.log('[DEBUG] Invalid profile_picture: must be string');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'profile_picture must be a string',
        });
      }
      try {
        new URL(req.body.profile_picture);
      } catch (error) {
        console.log('[DEBUG] Invalid profile_picture: not a valid URL');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'profile_picture must be a valid URL',
        });
      }
    }

    // Validate betting_limit if provided
    if (req.body.betting_limit !== undefined && req.body.betting_limit !== null) {
      if (typeof req.body.betting_limit !== 'number' || isNaN(req.body.betting_limit)) {
        console.log('[DEBUG] Invalid betting_limit: must be a number');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'betting_limit must be a number',
        });
      }
      if (req.body.betting_limit < 0) {
        console.log('[DEBUG] betting_limit must be non-negative');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'betting_limit must be non-negative',
        });
      }
    }

    // Validate current_balance if provided
    if (req.body.current_balance !== undefined && req.body.current_balance !== null) {
      if (typeof req.body.current_balance !== 'number' || isNaN(req.body.current_balance)) {
        console.log('[DEBUG] Invalid current_balance: must be a number');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'current_balance must be a number',
        });
      }
      if (req.body.current_balance < 0) {
        console.log('[DEBUG] current_balance must be non-negative');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'current_balance must be non-negative',
        });
      }
    }

    // Validate deposit_limit if provided
    if (req.body.deposit_limit !== undefined && req.body.deposit_limit !== null) {
      if (typeof req.body.deposit_limit !== 'object' || Array.isArray(req.body.deposit_limit)) {
        console.log('[DEBUG] Invalid deposit_limit: must be an object');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'deposit_limit must be an object',
        });
      }

      // Validate daily limit
      if (req.body.deposit_limit.daily !== undefined && req.body.deposit_limit.daily !== null) {
        if (
          typeof req.body.deposit_limit.daily !== 'number' ||
          isNaN(req.body.deposit_limit.daily)
        ) {
          console.log('[DEBUG] Invalid deposit_limit.daily');
          return res.status(422).send({
            error: 'Invalid request body',
            message: 'deposit_limit.daily must be a number',
          });
        }
        if (req.body.deposit_limit.daily < 0) {
          console.log('[DEBUG] deposit_limit.daily must be non-negative');
          return res.status(422).send({
            error: 'Invalid request body',
            message: 'deposit_limit.daily must be non-negative',
          });
        }
      }

      // Validate weekly limit
      if (req.body.deposit_limit.weekly !== undefined && req.body.deposit_limit.weekly !== null) {
        if (
          typeof req.body.deposit_limit.weekly !== 'number' ||
          isNaN(req.body.deposit_limit.weekly)
        ) {
          console.log('[DEBUG] Invalid deposit_limit.weekly');
          return res.status(422).send({
            error: 'Invalid request body',
            message: 'deposit_limit.weekly must be a number',
          });
        }
        if (req.body.deposit_limit.weekly < 0) {
          console.log('[DEBUG] deposit_limit.weekly must be non-negative');
          return res.status(422).send({
            error: 'Invalid request body',
            message: 'deposit_limit.weekly must be non-negative',
          });
        }
      }

      // Validate monthly limit
      if (req.body.deposit_limit.monthly !== undefined && req.body.deposit_limit.monthly !== null) {
        if (
          typeof req.body.deposit_limit.monthly !== 'number' ||
          isNaN(req.body.deposit_limit.monthly)
        ) {
          console.log('[DEBUG] Invalid deposit_limit.monthly');
          return res.status(422).send({
            error: 'Invalid request body',
            message: 'deposit_limit.monthly must be a number',
          });
        }
        if (req.body.deposit_limit.monthly < 0) {
          console.log('[DEBUG] deposit_limit.monthly must be non-negative');
          return res.status(422).send({
            error: 'Invalid request body',
            message: 'deposit_limit.monthly must be non-negative',
          });
        }
      }

      // Validate deposit limit ordering
      const daily = req.body.deposit_limit.daily;
      const weekly = req.body.deposit_limit.weekly;
      const monthly = req.body.deposit_limit.monthly;

      if (
        daily !== undefined &&
        daily !== null &&
        weekly !== undefined &&
        weekly !== null &&
        daily > weekly
      ) {
        console.log('[DEBUG] deposit_limit.daily cannot exceed weekly limit');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'deposit_limit.daily cannot exceed weekly limit',
        });
      }

      if (
        weekly !== undefined &&
        weekly !== null &&
        monthly !== undefined &&
        monthly !== null &&
        weekly > monthly
      ) {
        console.log('[DEBUG] deposit_limit.weekly cannot exceed monthly limit');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'deposit_limit.weekly cannot exceed monthly limit',
        });
      }
    }

    // Validate boolean fields if provided
    if (req.body.is_auth_verified !== undefined && req.body.is_auth_verified !== null) {
      if (typeof req.body.is_auth_verified !== 'boolean') {
        console.log('[DEBUG] Invalid is_auth_verified: must be boolean');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'is_auth_verified must be a boolean',
        });
      }
    }

    if (req.body.is_identity_verified !== undefined && req.body.is_identity_verified !== null) {
      if (typeof req.body.is_identity_verified !== 'boolean') {
        console.log('[DEBUG] Invalid is_identity_verified: must be boolean');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'is_identity_verified must be a boolean',
        });
      }
    }

    if (req.body.is_admin !== undefined && req.body.is_admin !== null) {
      if (typeof req.body.is_admin !== 'boolean') {
        console.log('[DEBUG] Invalid is_admin: must be boolean');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'is_admin must be a boolean',
        });
      }
    }

    if (req.body.kyc_completed !== undefined && req.body.kyc_completed !== null) {
      if (typeof req.body.kyc_completed !== 'boolean') {
        console.log('[DEBUG] Invalid kyc_completed: must be boolean');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'kyc_completed must be a boolean',
        });
      }
    }

    const updatedUser: Partial<User> = {};

    Object.entries(req.body).forEach(([key, value]) => {
      if (propertiesAvailableForUpdate.includes(key)) {
        updatedUser[key] = value;
      }
    });

    // Validate exclusion_ending if provided
    if (updatedUser['exclusion_ending']) {
      try {
        const exclusionDate = new Date(updatedUser['exclusion_ending']);
        if (isNaN(exclusionDate.getTime())) {
          throw new Error('Invalid date');
        }
        if (exclusionDate < new Date()) {
          console.log('[DEBUG] Exclusion date must be in future');
          return res
            .status(422)
            .send({ error: 'Invalid request body', message: 'Exclusion date must be in future' });
        }
      } catch (e) {
        console.log('[DEBUG]: failed to parse exclusion date', e);
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'exclusion_ending must be a valid ISO 8601 date',
        });
      }
    }

    if (updatedUser['exclusion_ending']) {
      updatedUser['is_self_excluded'] = true;
    }

    if (!Object.keys(updatedUser).length) {
      console.log('[DEBUG] no properties to update in request body');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'At least one property must be provided for update',
      });
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
  summary: 'Update user (Admin)',
  description:
    'Admin endpoint to update any user. Allows modification of all user fields including admin status, verification flags, and KYC information.',
  operationId: 'adminUpdateUser',
  tags: ['admin', 'users'],
  responses: {
    200: {
      description: 'User updated successfully',
      content: {
        'application/json': {
          schema: dataWrapper(userSchema),
          examples: {
            success: {
              summary: 'Updated user',
              value: {
                data: {
                  id: 'user_abc123',
                  first_name: 'John',
                  last_name: 'Smith',
                  nickname: 'Johnny',
                  email: 'john.smith@example.com',
                  bio: 'Professional golfer',
                  profile_picture: 'https://example.com/new-avatar.jpg',
                  phone_number: '+12345678901',
                  game_stop_id: 'gs_12345',
                  is_auth_verified: true,
                  is_identity_verified: true,
                  deposit_limit: {
                    daily: 100,
                    weekly: 200,
                    monthly: 300,
                  },
                  betting_limit: 1000,
                  payment_id: 'pay_xyz789',
                  current_balance: 500,
                  is_self_excluded: false,
                  is_admin: true,
                  kyc_completed: true,
                  kyc_instance_id: 'kyc_abc123',
                  exclusion_ending: null,
                  address: null,
                  created_at: '2025-01-15T10:30:00Z',
                  updated_at: '2025-01-22T14:20:00Z',
                },
              },
            },
          },
        },
      },
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
      description: 'Unique identifier of the user to update',
      example: 'user_abc123',
    },
  ],
  requestBody: {
    description:
      'User update details. At least one field must be provided. Admin can modify all fields.',
    required: false,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          minProperties: 1,
          properties: {
            first_name: { type: 'string', minLength: 1, maxLength: 100 },
            last_name: { type: 'string', minLength: 1, maxLength: 100 },
            nickname: { type: 'string', nullable: true, maxLength: 50 },
            bio: { type: 'string', nullable: true, maxLength: 500 },
            profile_picture: { type: 'string', format: 'uri', nullable: true },
            phone_number: { type: 'string', pattern: '^\\+[1-9]\\d{1,14}$' },
            game_stop_id: { type: 'string', nullable: true },
            is_auth_verified: { type: 'boolean' },
            is_identity_verified: { type: 'boolean' },
            deposit_limit: {
              type: 'object',
              properties: {
                daily: { type: 'number', nullable: true, minimum: 0 },
                weekly: { type: 'number', nullable: true, minimum: 0 },
                monthly: { type: 'number', nullable: true, minimum: 0 },
              },
            },
            betting_limit: { type: 'number', minimum: 0 },
            payment_id: { type: 'string', nullable: true },
            current_balance: { type: 'number', minimum: 0 },
            is_admin: { type: 'boolean', description: 'Admin privilege flag' },
            kyc_completed: { type: 'boolean' },
            kyc_instance_id: { type: 'string', nullable: true },
            exclusion_ending: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Self-exclusion end date',
            },
          },
        },
        examples: {
          updateAdminStatus: {
            summary: 'Grant admin privileges',
            value: {
              is_admin: true,
            },
          },
          updateVerification: {
            summary: 'Update verification status',
            value: {
              is_auth_verified: true,
              is_identity_verified: true,
              kyc_completed: true,
              kyc_instance_id: 'kyc_abc123',
            },
          },
          updateBalance: {
            summary: 'Adjust user balance',
            value: {
              current_balance: 500,
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
