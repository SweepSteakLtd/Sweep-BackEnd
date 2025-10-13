import { NextFunction, Request, Response } from 'express';
import { mockGames } from '../../models/__mocks';

/**
 * Update game (authenticated endpoint)
 * @params id - required
 * @body name - string - optional
 * @body description - string - optional
 * @body entry_fee - number - optional
 * @body contact_phone - string - optional
 * @body contact_email - string - optional
 * @body contact_visibility - boolean - optional
 * @body join_code - string - optional
 * @body max_participants - number - optional
 * @body rewards - array - optional
 * @body start_time - string - optional
 * @body end_time - string - optional
 * @body owner_id - string - optional
 * @body tournament_id - string - optional
 * @body user_id_list - array - optional
 * @returns Game
 */
export const updateGameHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockGames[0], is_mock: true });
  } catch (error: any) {
    console.log(`UPDATE GAME ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

updateGameHandler.apiDescription = {
  responses: {
    200: { description: '200 OK' },
    403: { description: '403 Forbidden' },
    422: { description: '422 Validation Error' },
    500: { description: '500 Internal Server Error' },
  },
};
