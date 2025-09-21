import { Request, Response, NextFunction } from 'express';
import { mockUsers } from '../../models/__mocks';

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
export const createUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {

    return res.status(201).send({ data: mockUsers[0], is_mock: true });
  } catch (error: any) {
    console.log(`USER CREATION ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
