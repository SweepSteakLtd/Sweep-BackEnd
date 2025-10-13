import { NextFunction, Request, Response } from 'express';
import { mockTournaments } from '../../../models/__mocks';

/**
 * Update tournament (admin endpoint)
 * @params id - required
 * @body name - string - optional
 * @body starts_at - string - optional
 * @body finishes_at - string - optional
 * @body description - string - optional
 * @body url - string - optional
 * @body cover_picture - string - optional
 * @body gallery - array - optional
 * @body holes - array - optional
 * @body ads - array - optional
 * @body proposed_entry_fee - number - optional
 * @body maximum_cut_amount - number - optional
 * @body maximum_score_generator - number - optional
 * @body players - array - optional
 * @returns Tournament
 */
export const updateTournamentHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockTournaments[0], is_mock: true });
  } catch (error: any) {
    console.log(`UPDATE TOURNAMENT ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

updateTournamentHandler.apiDescription = {
  responses: {
    200: { description: '200 OK' },
    403: { description: '403 Forbidden' },
    422: { description: '422 Validation Error' },
    500: { description: '500 Internal Server Error' },
  },
};
