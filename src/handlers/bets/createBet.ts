import { Request, Response, NextFunction } from 'express';
import { mockBets } from '../../models/__mocks';

/**
 * Create bet (authenticated endpoint)
 * @body owner_id - string - required
 * @body game_id - string - required
 * @body player_id - string - required
 * @returns Bet
 */
export const createBetHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(201).send({ data: mockBets[0], is_mock: true });
  } catch (error: any) {
    console.log(`CREATE BET ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};