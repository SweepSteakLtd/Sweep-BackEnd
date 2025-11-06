import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Deposit, depositLimits, User, users } from '../../models';
import { database } from '../../services';
import {
  apiKeyAuth,
  dataWrapper,
  depositLimitSchema,
  standardResponses,
  userSchema,
} from '../schemas';
import { Validators as NumberValidators } from '../validators/numberValidator';
import { validatePhoneNumber } from '../validators/phoneValidator';
import { Validators as StringValidators } from '../validators/stringValidator';

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
 * @body exclusion_ending -string - optional
 * @returns User
 */
export const updateCurrentUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate user authentication
    if (!res.locals.user || !res.locals.user.email || !res.locals.user.id) {
      console.log('[DEBUG] Missing authenticated user information');
      return res.status(403).send({
        error: 'Forbidden',
        message: 'User authentication is required',
      });
    }

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
      'exclusion_ending',
      'address',
    ];

    // Validate first_name if provided
    if (req.body.first_name !== undefined) {
      const firstNameValidation = StringValidators.firstName(req.body.first_name);
      if (!firstNameValidation.valid) {
        console.log('[DEBUG]', firstNameValidation.error);
        return res.status(422).send({
          error: 'Invalid request body',
          message: firstNameValidation.error,
        });
      }
    }

    // Validate last_name if provided
    if (req.body.last_name !== undefined) {
      const lastNameValidation = StringValidators.lastName(req.body.last_name);
      if (!lastNameValidation.valid) {
        console.log('[DEBUG]', lastNameValidation.error);
        return res.status(422).send({
          error: 'Invalid request body',
          message: lastNameValidation.error,
        });
      }
    }

    // Validate phone_number if provided
    if (req.body.phone_number !== undefined) {
      const phoneValidation = validatePhoneNumber(req.body.phone_number);
      if (!phoneValidation.valid) {
        console.log('[DEBUG]', phoneValidation.error);
        return res.status(422).send({
          error: 'Invalid request body',
          message: phoneValidation.error,
        });
      }
    }

    // Validate nickname if provided
    if (req.body.nickname !== undefined) {
      const nicknameValidation = StringValidators.nickname(req.body.nickname);
      if (!nicknameValidation.valid) {
        console.log('[DEBUG]', nicknameValidation.error);
        return res.status(422).send({
          error: 'Invalid request body',
          message: nicknameValidation.error,
        });
      }
    }

    // Validate bio if provided
    if (req.body.bio !== undefined) {
      const bioValidation = StringValidators.bio(req.body.bio);
      if (!bioValidation.valid) {
        console.log('[DEBUG]', bioValidation.error);
        return res.status(422).send({
          error: 'Invalid request body',
          message: bioValidation.error,
        });
      }
    }

    // Validate profile_picture if provided
    if (req.body.profile_picture !== undefined) {
      const profilePictureValidation = StringValidators.profilePicture(req.body.profile_picture);
      if (!profilePictureValidation.valid) {
        console.log('[DEBUG]', profilePictureValidation.error);
        return res.status(422).send({
          error: 'Invalid request body',
          message: profilePictureValidation.error,
        });
      }
    }

    // Validate betting_limit if provided
    if (req.body.betting_limit !== undefined) {
      const bettingLimitValidation = NumberValidators.bettingLimit(req.body.betting_limit);
      if (!bettingLimitValidation.valid) {
        console.log('[DEBUG]', bettingLimitValidation.error);
        return res.status(422).send({
          error: 'Invalid request body',
          message: bettingLimitValidation.error,
        });
      }
    }

    // Validate current_balance if provided
    if (req.body.current_balance !== undefined) {
      const currentBalanceValidation = NumberValidators.currentBalance(req.body.current_balance);
      if (!currentBalanceValidation.valid) {
        console.log('[DEBUG]', currentBalanceValidation.error);
        return res.status(422).send({
          error: 'Invalid request body',
          message: currentBalanceValidation.error,
        });
      }
    }

    // Validate deposit_limit if provided
    if (req.body.deposit_limit !== undefined && req.body.deposit_limit !== null) {
      if (typeof req.body.deposit_limit !== 'object' || Array.isArray(req.body.deposit_limit)) {
        console.log('[DEBUG] Invalid deposit_limit: must be an object');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'deposit_limit must be an object with daily, weekly, and monthly properties',
        });
      }

      const { daily, weekly, monthly } = req.body.deposit_limit;

      // Check all deposit limit properties exist and are numbers
      if (daily === undefined || daily === null || typeof daily !== 'number' || isNaN(daily)) {
        console.log('[DEBUG] Invalid deposit_limit.daily');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'deposit_limit.daily must be a valid number',
        });
      }
      if (weekly === undefined || weekly === null || typeof weekly !== 'number' || isNaN(weekly)) {
        console.log('[DEBUG] Invalid deposit_limit.weekly');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'deposit_limit.weekly must be a valid number',
        });
      }
      if (
        monthly === undefined ||
        monthly === null ||
        typeof monthly !== 'number' ||
        isNaN(monthly)
      ) {
        console.log('[DEBUG] Invalid deposit_limit.monthly');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'deposit_limit.monthly must be a valid number',
        });
      }

      // Check deposit limits are positive
      if (daily < 0) {
        console.log('[DEBUG] deposit_limit.daily must be non-negative');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'deposit_limit.daily must be non-negative',
        });
      }
      if (weekly < 0) {
        console.log('[DEBUG] deposit_limit.weekly must be non-negative');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'deposit_limit.weekly must be non-negative',
        });
      }
      if (monthly < 0) {
        console.log('[DEBUG] deposit_limit.monthly must be non-negative');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'deposit_limit.monthly must be non-negative',
        });
      }

      // Check logical ordering: daily <= weekly <= monthly
      if (daily > weekly) {
        console.log('[DEBUG] deposit_limit.daily cannot exceed weekly limit');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'deposit_limit.daily cannot exceed weekly limit',
        });
      }
      if (weekly > monthly) {
        console.log('[DEBUG] deposit_limit.weekly cannot exceed monthly limit');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'deposit_limit.weekly cannot exceed monthly limit',
        });
      }
    }

    // Validate address if provided
    if (req.body.address !== undefined && req.body.address !== null) {
      if (typeof req.body.address !== 'object' || Array.isArray(req.body.address)) {
        console.log('[DEBUG] Invalid address: must be an object');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'address must be an object',
        });
      }

      // Validate required address fields
      const requiredAddressFields = ['street_name', 'postal_code', 'city', 'country_code'];
      for (const field of requiredAddressFields) {
        if (!req.body.address[field]) {
          console.log(`[DEBUG] Invalid address.${field}: required field missing`);
          return res.status(422).send({
            error: 'Invalid request body',
            message: `address.${field} is required`,
          });
        }
      }

      // Validate street_name is a string
      if (
        typeof req.body.address.street_name !== 'string' ||
        req.body.address.street_name.trim() === ''
      ) {
        console.log('[DEBUG] Invalid address.street_name: must be non-empty string');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'address.street_name must be a non-empty string',
        });
      }

      // Validate street_number if provided
      if (req.body.address.street_number !== undefined && req.body.address.street_number !== null) {
        if (
          typeof req.body.address.street_number !== 'number' ||
          isNaN(req.body.address.street_number)
        ) {
          console.log('[DEBUG] Invalid address.street_number: must be a number');
          return res.status(422).send({
            error: 'Invalid request body',
            message: 'address.street_number must be a number',
          });
        }
      }

      // Validate postal_code is a string
      if (
        typeof req.body.address.postal_code !== 'string' ||
        req.body.address.postal_code.trim() === ''
      ) {
        console.log('[DEBUG] Invalid address.postal_code: must be non-empty string');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'address.postal_code must be a non-empty string',
        });
      }

      // Validate city is a string
      if (typeof req.body.address.city !== 'string' || req.body.address.city.trim() === '') {
        console.log('[DEBUG] Invalid address.city: must be non-empty string');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'address.city must be a non-empty string',
        });
      }

      // Validate state_province if provided
      if (
        req.body.address.state_province !== undefined &&
        req.body.address.state_province !== null
      ) {
        if (
          typeof req.body.address.state_province !== 'string' ||
          req.body.address.state_province.trim() === ''
        ) {
          console.log('[DEBUG] Invalid address.state_province: must be non-empty string');
          return res.status(422).send({
            error: 'Invalid request body',
            message: 'address.state_province must be a non-empty string',
          });
        }
      }

      // Validate country_code format (ISO 3166-1 alpha-2)
      if (typeof req.body.address.country_code !== 'string') {
        console.log('[DEBUG] Invalid address.country_code: must be a string');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'address.country_code must be a string',
        });
      }
      const countryCodeRegex = /^[A-Z]{2}$/;
      if (!countryCodeRegex.test(req.body.address.country_code)) {
        console.log('[DEBUG] Invalid address.country_code: must be ISO 3166-1 alpha-2 format');
        return res.status(422).send({
          error: 'Invalid request body',
          message:
            'address.country_code must be a 2-letter uppercase country code (e.g., US, GB, CA)',
        });
      }

      // Validate optional unit
      if (req.body.address.unit !== undefined && req.body.address.unit !== null) {
        if (typeof req.body.address.unit !== 'string') {
          console.log('[DEBUG] Invalid address.unit: must be a string');
          return res.status(422).send({
            error: 'Invalid request body',
            message: 'address.unit must be a string',
          });
        }
      }
    }

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

    try {
      if (updatedUser['exclusion_ending'] && updatedUser['exclusion_ending'] < new Date()) {
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

    if (updatedUser['exclusion_ending']) {
      updatedUser['is_self_excluded'] = true;
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
  summary: 'Update current user',
  description:
    "Updates the currently authenticated user's profile. At least one field must be provided. Exclusion date must be in the future.",
  operationId: 'updateCurrentUser',
  tags: ['users'],
  responses: {
    200: {
      description: 'User updated successfully',
      content: {
        'application/json': {
          schema: dataWrapper(userSchema),
          examples: {
            success: {
              summary: 'Updated user profile',
              value: {
                data: {
                  id: 'user_abc123',
                  first_name: 'John',
                  last_name: 'Smith',
                  nickname: 'Johnny Updated',
                  email: 'john.doe@example.com',
                  bio: 'Updated biography',
                  profile_picture: 'https://example.com/new-avatar.jpg',
                  phone_number: '+12345678901',
                  game_stop_id: null,
                  is_auth_verified: true,
                  is_identity_verified: true,
                  deposit_limit: {
                    daily: 150,
                    weekly: 600,
                    monthly: 2500,
                  },
                  betting_limit: 1200,
                  payment_id: 'pay_xyz789',
                  current_balance: 250.5,
                  is_self_excluded: false,
                  is_admin: false,
                  kyc_completed: true,
                  kyc_instance_id: 'kyc_abc456',
                  exclusion_ending: null,
                  address: null,
                  created_at: '2025-01-15T10:30:00Z',
                  updated_at: '2025-01-20T16:45:00Z',
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
  requestBody: {
    description:
      'User update details. At least one field must be provided. Exclusion date triggers self-exclusion.',
    required: false,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          minProperties: 1,
          properties: {
            first_name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'User first name',
              example: 'John',
            },
            last_name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'User last name',
              example: 'Smith',
            },
            nickname: {
              type: 'string',
              nullable: true,
              maxLength: 50,
              description: 'User nickname or display name',
              example: 'Johnny Updated',
            },
            phone_number: {
              type: 'string',
              pattern: '^\\+[1-9]\\d{1,14}$',
              description: 'Phone number in E.164 format',
              example: '+12345678901',
            },
            bio: {
              type: 'string',
              nullable: true,
              maxLength: 500,
              description: 'User biography',
              example: 'Updated biography',
            },
            profile_picture: {
              type: 'string',
              format: 'uri',
              nullable: true,
              description: 'Profile picture URL',
              example: 'https://example.com/new-avatar.jpg',
            },
            game_stop_id: {
              type: 'string',
              nullable: true,
              description: 'GameStop ID',
            },
            deposit_limit: depositLimitSchema,
            betting_limit: {
              type: 'number',
              minimum: 0,
              description: 'Maximum betting amount per bet',
              example: 1200,
            },
            payment_id: {
              type: 'string',
              nullable: true,
              description: 'Payment processor ID',
            },
            current_balance: {
              type: 'number',
              minimum: 0,
              description: 'Account balance',
              example: 250.5,
            },
            exclusion_ending: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description:
                'Self-exclusion end date (must be in future). Automatically sets is_self_excluded to true.',
              example: '2025-12-31T23:59:59Z',
            },
          },
        },
        examples: {
          updateBasicInfo: {
            summary: 'Update basic profile info',
            value: {
              first_name: 'John',
              last_name: 'Smith',
              nickname: 'Johnny Updated',
              bio: 'Updated biography',
            },
          },
          updateDepositLimits: {
            summary: 'Update deposit limits',
            value: {
              deposit_limit: {
                daily: 150,
                weekly: 600,
                monthly: 2500,
              },
            },
          },
          setSelfExclusion: {
            summary: 'Set self-exclusion period',
            value: {
              exclusion_ending: '2025-12-31T23:59:59Z',
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
