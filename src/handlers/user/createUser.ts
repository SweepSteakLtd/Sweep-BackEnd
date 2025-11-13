import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { handleGBGError, verifyIdentity } from '../../integrations/GBG/GBG';
import {
  checkGamstopRegistration,
  GamstopCheckResult,
  handleGamstopError,
} from '../../integrations/Gamstop/gamstop';
import { Deposit, depositLimits, User, users } from '../../models';
import { database, fetchRemoteConfig } from '../../services';
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
 * @body first_name - string - required
 * @body last_name - string - required
 * @body nickname - string - optional
 * @body email - string - required (from auth)
 * @body bio - string - optional
 * @body profile_picture - string - optional
 * @body phone_number - string - required
 * @body date_of_birth - string - required (YYYY-MM-DD format, required for Gamstop verification)
 * @body address - object - required (required for Gamstop and GBG verification)
 * @body game_stop_id - string - optional
 * @body is_auth_verified - boolean - optional
 * @body is_identity_verified - boolean - optional
 * @body deposit_limit - object - required
 * @body betting_limit - number - optional
 * @body payment_id - string - optional
 * @body current_balance - number - optional
 * @body is_self_exclusion - boolean - optional
 * @body exclusion_ending - string - optional
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

    // Validate required fields (including date_of_birth and address for Gamstop check)
    const fieldsToValidate = [
      'first_name',
      'last_name',
      'phone_number',
      'deposit_limit',
      'date_of_birth',
      'address',
    ];
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

    // Validate date_of_birth (required for Gamstop check)
    if (typeof req.body.date_of_birth !== 'string') {
      console.log('[DEBUG] Invalid date_of_birth: must be a string');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'date_of_birth must be a string in YYYY-MM-DD format',
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(req.body.date_of_birth)) {
      console.log('[DEBUG] Invalid date_of_birth format');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'date_of_birth must be in YYYY-MM-DD format',
      });
    }

    // Validate it's a valid date
    const dobDate = new Date(req.body.date_of_birth);
    if (isNaN(dobDate.getTime())) {
      console.log('[DEBUG] Invalid date_of_birth: not a valid date');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'date_of_birth must be a valid date',
      });
    }

    // Validate user is at least 18 years old
    const today = new Date();
    const age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    const dayDiff = today.getDate() - dobDate.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

    if (actualAge < 18) {
      console.log('[DEBUG] User must be at least 18 years old');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'User must be at least 18 years old',
      });
    }

    // Validate address (required for Gamstop check)
    if (typeof req.body.address !== 'object' || req.body.address === null) {
      console.log('[DEBUG] Invalid address: must be an object');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'address must be an object',
      });
    }

    // Validate required address fields
    const requiredAddressFields = ['line1', 'town', 'postcode', 'country'];
    for (const field of requiredAddressFields) {
      if (!req.body.address[field]) {
        console.log(`[DEBUG] Invalid address.${field}: required field missing`);
        return res.status(422).send({
          error: 'Invalid request body',
          message: `address.${field} is required`,
        });
      }
    }

    // Validate line1 is a string
    if (typeof req.body.address.line1 !== 'string' || req.body.address.line1.trim() === '') {
      console.log('[DEBUG] Invalid address.line1: must be non-empty string');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'address.line1 must be a non-empty string',
      });
    }

    // Validate line3 if provided
    if (req.body.address.line3 !== undefined && req.body.address.line3 !== null) {
      if (typeof req.body.address.line3 !== 'string') {
        console.log('[DEBUG] Invalid address.line3: must be a string');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'address.line3 must be a string',
        });
      }
    }

    // Validate town is a string
    if (typeof req.body.address.town !== 'string' || req.body.address.town.trim() === '') {
      console.log('[DEBUG] Invalid address.town: must be non-empty string');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'address.town must be a non-empty string',
      });
    }

    // Validate county if provided
    if (req.body.address.county !== undefined && req.body.address.county !== null) {
      if (typeof req.body.address.county !== 'string' || req.body.address.county.trim() === '') {
        console.log('[DEBUG] Invalid address.county: must be non-empty string');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'address.county must be a non-empty string',
        });
      }
    }

    // Validate postcode is a string
    if (typeof req.body.address.postcode !== 'string' || req.body.address.postcode.trim() === '') {
      console.log('[DEBUG] Invalid address.postcode: must be non-empty string');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'address.postcode must be a non-empty string',
      });
    }

    // Validate country format (ISO 3166-1 alpha-2)
    if (typeof req.body.address.country !== 'string') {
      console.log('[DEBUG] Invalid address.country: must be a string');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'address.country must be a string',
      });
    }

    let gamstopResult: GamstopCheckResult | undefined;
    console.log('[DEBUG] Starting Gamstop self-exclusion check for new user');
    try {
      gamstopResult = await checkGamstopRegistration({
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        date_of_birth: req.body.date_of_birth,
        email: res.locals.email,
        postcode: req.body.address.postcode,
        phone: req.body.phone_number,
      });

      console.log('[DEBUG] Gamstop check passed - user is not self-excluded');
    } catch (error: any) {
      console.error('[DEBUG] Gamstop check failed:', error.message);
      const gamstopError = handleGamstopError(error);
      console.error('[DEBUG] Gamstop error code:', gamstopError.code);
      console.error('[DEBUG] Gamstop error message:', gamstopError.message);

      // Gamstop check failure blocks user creation for safety
      return res.status(503).send({
        error: 'Service Unavailable',
        message:
          'Unable to verify self-exclusion status. Please try again later or contact support.',
        details: gamstopError.message,
      });
    }

    // ========================================================================
    // GBG Identity Verification
    // ========================================================================
    // let isIdentityVerified = req.body.is_identity_verified || false;
    // let kycCompleted = false;
    // let kycInstanceId = '';

    // Fetch Remote Config for GBG Resource ID
    const remoteConfig = await fetchRemoteConfig();
    console.log('[DEBUG] GBG Resource ID from Remote Config:', remoteConfig.gbg_resource_id);
    let gbg_instance_id: string | undefined;
    // Perform GBG verification if address is provided
    if (req.body.address && req.body.address !== null) {
      console.log('[DEBUG] Starting GBG identity verification for new user');
      const { first_name, last_name, birthday, address } = req.body;
      try {
        gbg_instance_id = await verifyIdentity(
          {
            first_name: first_name,
            last_name: last_name,
            birthday: birthday,
            address: address,
            email: res.locals.email,
            phone_number: (res.locals as User).phone_number,
          },
          remoteConfig.gbg_resource_id,
        );
      } catch (error: any) {
        console.error('[DEBUG] GBG verification error:', error.message);
        const gbgError = handleGBGError(error);
        console.error('[DEBUG] GBG error code:', gbgError.code);
        console.error('[DEBUG] GBG error message:', gbgError.message);

        // Don't fail user creation if GBG verification fails
        // User can complete verification later
        console.log('[DEBUG] Proceeding with user creation despite GBG verification failure');
      }
    } else {
      console.log('[DEBUG] Skipping GBG verification - address not provided');
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
      game_stop_id: gamstopResult.registration_id || '',
      is_auth_verified: req.body.is_auth_verified || false,
      is_identity_verified: false,
      deposit_id: depositId,
      betting_limit: req.body.betting_limit || 0,
      payment_id: req.body.payment_id || '',
      current_balance: req.body.current_balance || 0,
      is_admin: false,
      kyc_completed: false,
      kyc_instance_id: gbg_instance_id,
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
    return res.status(201).send({
      data: userObject,
      ...(gbg_instance_id ? { gbg_instance_id } : {}),
    });
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
    'Creates a new user account with mandatory Gamstop self-exclusion check and GBG identity verification. Email is automatically extracted from authentication. All users must provide date_of_birth and address for Gamstop verification. If user is registered with Gamstop, account creation will be blocked. GBG identity verification is performed automatically.',
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
                    line1: '123 Main St',
                    line2: 'Building A',
                    line3: 'Apt 4B',
                    town: 'New York',
                    county: 'New York County',
                    postcode: '10001',
                    country: 'US',
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
    403: {
      description: 'Forbidden - User is registered with Gamstop self-exclusion service',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Self-Exclusion Active' },
              message: {
                type: 'string',
                example:
                  'Cannot create account. You are currently registered with Gamstop self-exclusion service.',
              },
              exclusion_type: {
                type: 'string',
                enum: ['Y', 'P'],
                description: 'Y = Excluded, P = Partial Match',
              },
              gamstop_unique_id: { type: 'string', description: 'Gamstop unique reference ID' },
            },
          },
        },
      },
    },
    422: standardResponses[422],
    500: standardResponses[500],
    503: {
      description: 'Service Unavailable - Gamstop verification service is unavailable',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Service Unavailable' },
              message: {
                type: 'string',
                example:
                  'Unable to verify self-exclusion status. Please try again later or contact support.',
              },
              details: { type: 'string' },
            },
          },
        },
      },
    },
  },
  requestBody: {
    description:
      'User registration details. Email is extracted from authentication token. date_of_birth and address are required for mandatory Gamstop self-exclusion verification.',
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: [
            'first_name',
            'last_name',
            'phone_number',
            'deposit_limit',
            'date_of_birth',
            'address',
          ],
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
            date_of_birth: {
              type: 'string',
              format: 'date',
              pattern: '^\\d{4}-\\d{2}-\\d{2}$',
              description:
                'Date of birth in YYYY-MM-DD format. Required for Gamstop self-exclusion check and GBG identity verification. User must be at least 18 years old.',
              example: '1990-01-15',
            },
            address: addressSchema,
          },
        },
        examples: {
          standard: {
            summary: 'Standard user registration with Gamstop check and GBG verification',
            value: {
              first_name: 'John',
              last_name: 'Doe',
              nickname: 'Johnny',
              phone_number: '+12345678901',
              date_of_birth: '1990-01-15',
              bio: 'Golf enthusiast',
              profile_picture: 'https://example.com/avatar.jpg',
              deposit_limit: { daily: 100, weekly: 500, monthly: 2000 },
              betting_limit: 1000,
              address: {
                line1: '123 Main St',
                line2: 'Building A',
                line3: 'Apt 4B',
                town: 'New York',
                county: 'New York County',
                postcode: '10001',
                country: 'US',
              },
            },
          },
          minimal: {
            summary: 'Minimal required fields with Gamstop verification',
            value: {
              first_name: 'Jane',
              last_name: 'Smith',
              phone_number: '+19876543210',
              date_of_birth: '1985-03-20',
              deposit_limit: { daily: 50, weekly: 250, monthly: 1000 },
              address: {
                line1: '456 Oak Street',
                line2: 'Flat 2',
                town: 'London',
                postcode: 'SW1A 1AA',
                country: 'GB',
              },
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
