import { Request, Response, NextFunction } from 'express';
import { mockUsers } from '../../../models/__mocks';

/**
 * Update user (admin endpoint)
 * @params id - required
 * @body first_name - string - optional
 * @body last_name - string - optional
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
 * @returns User
 */
export const updateUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockUsers[0], is_mock: true });
  } catch (error: any) {
    console.log(`UPDATE USER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};