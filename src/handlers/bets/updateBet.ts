import { NextFunction, Request, Response } from 'express';
import { mockBets } from '../../models/__mocks';

/**
 * Update bet (authenticated endpoint)
 * @params id - required
 * @body owner_id - string - optional
 * @body game_id - string - optional
 * @body player_id - string - optional
 * @returns Bet
 */
export const updateBetHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockBets[0], is_mock: true });
  } catch (error: any) {
    console.log(`UPDATE BET ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

updateBetHandler.apiDescription = {
  responses: {
    200: { description: '200 OK' },
    403: { description: '403 Forbidden' },
    422: { description: '422 Validation Error' },
    500: { description: '500 Internal Server Error' },
  },
};
