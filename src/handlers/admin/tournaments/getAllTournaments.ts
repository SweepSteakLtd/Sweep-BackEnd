import { Request, Response, NextFunction } from 'express';
import { mockTournaments } from '../../../models/__mocks';

/**
 * Get all tournaments (admin endpoint)
 * @query status - optional
 * @returns Tournament[]
 */
export const getAllTournamentsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockTournaments, is_mock: true });
  } catch (error: any) {
    console.log(`GET ALL TOURNAMENTS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};