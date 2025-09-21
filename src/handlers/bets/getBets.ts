import { Request, Response, NextFunction } from 'express';
import { mockBets } from '../../models/__mocks';

/**
 * Get bets (authenticated endpoint)
 * @query game_id - optional
 * @returns Bet[]
 */
export const getBetsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockBets, is_mock: true });
  } catch (error: any) {
    console.log(`GET BETS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};