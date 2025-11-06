import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Deposit, depositLimits, User, users } from '../../models';
import { database } from '../../services';
import {
  addressSchema,
  apiKeyAuth,
  dataWrapper,
  depositLimitSchema,
  standardResponses,
  userSchema,
} from '../schemas';
import { Validators as NumberValidators } from '../validators/numberValidator';
import { validatePhoneNumber } from '../validators/phoneValidator';
import { Validators as StringValidators, validateEmail } from '../validators/stringValidator';
/**
 * Create a new user
 * @body first_name - string - optional
 * @body last_name - string - optional
 * @body nickname - string - optional
 * @body email - string - required
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
 * @body is_self_exclusion - boolean - optional
 * @body exclusion_ending -string - optional
 * @returns User
 */
export const createUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate email from authentication
    if (
      !res.locals.email ||
      typeof res.locals.email !== 'string' ||
      res.locals.email.trim() === ''
    ) {
      console.log('[DEBUG] Missing or invalid email in authentication');
      return res.status(403).send({
        error: 'Forbidden',
        message: 'Valid email is required from authentication',
      });
    }

    // Email format validation
    const emailValidation = validateEmail(res.locals.email);
    if (!emailValidation.valid) {
      console.log('[DEBUG] Invalid email format:', res.locals.email);
      return res.status(422).send({
        error: 'Invalid request body',
        message: emailValidation.error,
      });
    }

    // Check if user already exists
    const isExisting = await database
      .select()
      .from(users)
      .where(eq(users.email, res.locals.email))
      .limit(1)
      .execute();

    if (isExisting.length > 0) {
      console.log(`[DEBUG] User with email already exists`);
      return res.status(400).send({
        error: 'Bad Request',
        message: 'User with this email already exists',
      });
    }

    // Validate required fields
    const fieldsToValidate = ['first_name', 'last_name', 'phone_number', 'deposit_limit'];
    for (const field of fieldsToValidate) {
      if (!req.body[field]) {
        console.log(`[DEBUG] Missing required field: ${field}`);
        return res.status(422).send({
          error: 'Invalid request body',
          message: `Missing required field: ${field}`,
        });
      }
    }

    // Validate first_name
    const firstNameValidation = StringValidators.firstName(req.body.first_name);
    if (!firstNameValidation.valid) {
      console.log('[DEBUG]', firstNameValidation.error);
      return res.status(422).send({
        error: 'Invalid request body',
        message: firstNameValidation.error,
      });
    }

    // Validate last_name
    const lastNameValidation = StringValidators.lastName(req.body.last_name);
    if (!lastNameValidation.valid) {
      console.log('[DEBUG]', lastNameValidation.error);
      return res.status(422).send({
        error: 'Invalid request body',
        message: lastNameValidation.error,
      });
    }

    // Validate phone_number format (E.164)
    const phoneValidation = validatePhoneNumber(req.body.phone_number);
    if (!phoneValidation.valid) {
      console.log('[DEBUG] Invalid phone_number format:', req.body.phone_number);
      return res.status(422).send({
        error: 'Invalid request body',
        message: phoneValidation.error,
      });
    }

    // Validate optional nickname
    const nicknameValidation = StringValidators.nickname(req.body.nickname);
    if (!nicknameValidation.valid) {
      console.log('[DEBUG]', nicknameValidation.error);
      return res.status(422).send({
        error: 'Invalid request body',
        message: nicknameValidation.error,
      });
    }

    // Validate optional bio
    const bioValidation = StringValidators.bio(req.body.bio);
    if (!bioValidation.valid) {
      console.log('[DEBUG]', bioValidation.error);
      return res.status(422).send({
        error: 'Invalid request body',
        message: bioValidation.error,
      });
    }

    // Validate optional profile_picture URL
    const profilePictureValidation = StringValidators.profilePicture(req.body.profile_picture);
    if (!profilePictureValidation.valid) {
      console.log('[DEBUG]', profilePictureValidation.error);
      return res.status(422).send({
        error: 'Invalid request body',
        message: profilePictureValidation.error,
      });
    }

    // Validate deposit_limit structure and values
    if (typeof req.body.deposit_limit !== 'object' || req.body.deposit_limit === null) {
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

    // Validate optional betting_limit
    const bettingLimitValidation = NumberValidators.bettingLimit(req.body.betting_limit);
    if (!bettingLimitValidation.valid) {
      console.log('[DEBUG]', bettingLimitValidation.error);
      return res.status(422).send({
        error: 'Invalid request body',
        message: bettingLimitValidation.error,
      });
    }

    // Validate optional current_balance
    const currentBalanceValidation = NumberValidators.currentBalance(req.body.current_balance);
    if (!currentBalanceValidation.valid) {
      console.log('[DEBUG]', currentBalanceValidation.error);
      return res.status(422).send({
        error: 'Invalid request body',
        message: currentBalanceValidation.error,
      });
    }

    // Validate optional address
    if (req.body.address !== undefined && req.body.address !== null) {
      if (typeof req.body.address !== 'object') {
        console.log('[DEBUG] Invalid address: must be an object');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'address must be an object',
        });
      }

      // Validate required address fields based on addressSchema
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

    const newUserId = createId();
    const depositId = createId();

    const depositLimit: Deposit = {
      id: depositId,
      owner_id: newUserId,
      monthly: req.body.deposit_limit.monthly,
      daily: req.body.deposit_limit.daily,
      weekly: req.body.deposit_limit.weekly,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await database.insert(depositLimits).values(depositLimit).execute();

    const userObject: User = {
      id: createId(),
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      nickname: req.body.nickname,
      email: res.locals.email,
      bio: req.body.bio || '',
      profile_picture: req.body.profile_picture || '',
      phone_number: req.body.phone_number,
      game_stop_id: req.body.game_stop_id || '',
      is_auth_verified: req.body.is_auth_verified || false,
      is_identity_verified: req.body.is_identity_verified || false,
      deposit_id: depositId,
      betting_limit: req.body.betting_limit || 0,
      payment_id: req.body.payment_id || '',
      current_balance: req.body.current_balance || 0,
      is_admin: false,
      kyc_completed: false,
      kyc_instance_id: '',
      exclusion_ending: new Date(),
      is_self_excluded: false,
      address: req.body.address,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await database
      .insert(users)
      .values({ ...userObject, deposit_limit: depositLimit })
      .execute();
    console.log('[DEBUG] New user created with ID:', userObject.id);
    return res.status(201).send({ data: userObject });
  } catch (error: any) {
    console.log(`[DEBUG] USER CREATION ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

createUserHandler.apiDescription = {
  summary: 'Create a new user',
  description:
    'Creates a new user account. Email is automatically extracted from authentication. Requires deposit limits to be set during creation.',
  operationId: 'createUser',
  tags: ['users'],
  responses: {
    201: {
      description: 'User created successfully',
      content: {
        'application/json': {
          schema: dataWrapper(userSchema),
          examples: {
            success: {
              summary: 'New user created',
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
                  is_auth_verified: false,
                  is_identity_verified: false,
                  deposit_limit: {
                    daily: 100,
                    weekly: 500,
                    monthly: 2000,
                  },
                  betting_limit: 1000,
                  payment_id: null,
                  current_balance: 0,
                  is_self_excluded: false,
                  is_admin: false,
                  kyc_completed: false,
                  kyc_instance_id: null,
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
                  updated_at: '2025-01-15T10:30:00Z',
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad Request - User already exists',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Bad Request' },
              message: { type: 'string', example: 'User with this email already exists' },
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
    description: 'User registration details. Email is extracted from authentication token.',
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['first_name', 'last_name', 'phone_number', 'deposit_limit'],
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
              example: 'Doe',
            },
            nickname: {
              type: 'string',
              nullable: true,
              maxLength: 50,
              description: 'User nickname or display name',
              example: 'Johnny',
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
              example: 'Golf enthusiast and sports bettor',
            },
            profile_picture: {
              type: 'string',
              format: 'uri',
              nullable: true,
              description: 'Profile picture URL',
              example: 'https://example.com/avatar.jpg',
            },
            game_stop_id: {
              type: 'string',
              nullable: true,
              description: 'GameStop ID (if applicable)',
            },
            deposit_limit: depositLimitSchema,
            betting_limit: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'Maximum betting amount per bet',
              example: 1000,
            },
            payment_id: {
              type: 'string',
              nullable: true,
              description: 'Payment processor ID',
            },
            current_balance: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'Initial account balance',
              example: 0,
            },
            address: addressSchema,
          },
        },
        examples: {
          standard: {
            summary: 'Standard user registration',
            value: {
              first_name: 'John',
              last_name: 'Doe',
              nickname: 'Johnny',
              phone_number: '+12345678901',
              bio: 'Golf enthusiast',
              profile_picture: 'https://example.com/avatar.jpg',
              deposit_limit: { daily: 100, weekly: 500, monthly: 2000 },
              betting_limit: 1000,
              address: {
                street_name: 'Main St',
                street_number: 123,
                unit: 'Apt 4B',
                postal_code: '12345',
                city: 'New York',
                state_province: 'NY',
                country_code: 'US',
              },
            },
          },
          minimal: {
            summary: 'Minimal required fields',
            value: {
              first_name: 'Jane',
              last_name: 'Smith',
              phone_number: '+19876543210',
              deposit_limit: { daily: 50, weekly: 250, monthly: 1000 },
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
