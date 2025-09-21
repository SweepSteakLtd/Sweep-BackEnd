import { Request, Response, NextFunction } from 'express';
import { mockGames } from '../../../models/__mocks';

/**
 * Update game (admin endpoint)
 * @params id - required
 * @body name - optional
 * @body description - optional
 * @body entry_fee - optional
 * @body contact_phone - optional
 * @body contact_email - optional
 * @body contact_visibility - optional
 * @body join_code - optional
 * @body max_participants - optional
 * @body rewards - optional
 * @body start_time - optional
 * @body end_time - optional
 * @body owner_id - optional
 * @body tournament_id - optional
 * @body user_id_list - optional
 * @returns Game
 */
export const updateGameAdminHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockGames[0], is_mock: true });
  } catch (error: any) {
    console.log(`UPDATE GAME ADMIN ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};