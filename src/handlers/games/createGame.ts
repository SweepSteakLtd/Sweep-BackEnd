import { Request, Response, NextFunction } from 'express';
import { mockGames } from '../../models/__mocks';

/**
 * Create game (authenticated endpoint)
 * @body name - string - required
 * @body description - string - optional
 * @body entry_fee - number - required
 * @body contact_phone - string - optional
 * @body contact_email - string - optional
 * @body contact_visibility - boolean - optional
 * @body join_code - string - optional
 * @body max_participants - number - optional
 * @body rewards - array - optional
 * @body start_time - string - required
 * @body end_time - string - required
 * @body owner_id - string - required
 * @body tournament_id - string - required
 * @body user_id_list - array - optional
 * @returns Game
 */
export const createGameHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(201).send({ data: mockGames[0], is_mock: true });
  } catch (error: any) {
    console.log(`CREATE GAME ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};