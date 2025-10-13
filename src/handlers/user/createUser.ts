import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { User, users } from '../../models';
import { database } from '../../services';
/**
 * Create a new user
 * @body first_name - string - optional
 * @body last_name - string - optional
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
 * @returns User
 */
export const createUserHandler = async (req: Request<{}, {}, User>, res: Response, next: NextFunction) => {
  try {
    const isExisting = await database.select().from(users).where(eq(users.email, req.body.email)).limit(1).execute();

    if (isExisting.length > 0) {
      return res.status(400).send({
        error: 'Bad Request',
        message: 'User with this email already exists',
      });
    }

    const userObject: User = {
      id: createId(),
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      bio: req.body.bio,
      profile_picture: req.body.profile_picture,
      phone_number: req.body.phone_number,
      game_stop_id: req.body.game_stop_id,
      is_auth_verified: req.body.is_auth_verified,
      is_identity_verified: req.body.is_identity_verified,
      deposit_limit: req.body.deposit_limit,
      betting_limit: req.body.betting_limit,
      payment_id: req.body.payment_id,
      current_balance: req.body.current_balance,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await database.insert(users).values(userObject).execute();
    console.log('New user created with ID:', userObject.id);
    return res.status(201).send({ data: userObject });
  } catch (error: any) {
    console.log(`USER CREATION ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

createUserHandler.apiDescription = {
  responses: {
    201: {
      description: '201 Created',
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
  requestBody: {
    content: {
      'application/json': {
        example: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          bio: 'Golf enthusiast',
          profile_picture: 'https://example.com/avatar.jpg',
          phone_number: '+1234567890',
          deposit_limit: 1200,
          betting_limit: 2400,
        },
      },
    },
    required: true,
  },
};
