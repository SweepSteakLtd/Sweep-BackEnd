import { NextFunction, Request, Response } from 'express';
import { mockPlayers } from '../../../models/__mocks';

/**
 * Create player (admin endpoint)
 * @body external_id - string - required
 * @body level - number - required
 * @body current_score - number - optional
 * @body position - number - optional
 * @body attempts - array - optional
 * @body missed_cut - boolean - optional
 * @body odds - number - optional
 * @body profile_id - string - required
 * @returns Player
 */
export const createPlayerHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(201).send({ data: mockPlayers[0], is_mock: true });
  } catch (error: any) {
    console.log(`CREATE PLAYER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
createPlayerHandler.apiDescription = {
  responses: {
    201: { description: '201 Created' },
    403: { description: '403 Forbidden' },
    422: { description: '422 Validation Error' },
    500: { description: '500 Internal Server Error' },
  },
};
