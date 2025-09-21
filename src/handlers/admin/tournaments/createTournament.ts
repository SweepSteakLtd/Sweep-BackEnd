import { Request, Response, NextFunction } from 'express';
import { mockTournaments } from '../../../models/__mocks';

/**
 * Create tournament (admin endpoint)
 * @body name - string - required
 * @body starts_at - string - required
 * @body finishes_at - string - required
 * @body description - string - optional
 * @body url - string - optional
 * @body cover_picture - string - optional
 * @body gallery - array - optional
 * @body holes - array - optional
 * @body ads - array - optional
 * @body proposed_entry_fee - number - required
 * @body maximum_cut_amount - number - required
 * @body maximum_score_generator - number - required
 * @body players - array - required
 * @returns Tournament
 */
export const createTournamentHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(201).send({ data: mockTournaments[0], is_mock: true });
  } catch (error: any) {
    console.log(`CREATE TOURNAMENT ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};