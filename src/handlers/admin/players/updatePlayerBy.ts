import { NextFunction, Request, Response } from 'express';
import { mockPlayers } from '../../../models/__mocks';

/**
 * Update player by ID (admin endpoint)
 * @params id - required
 * @body external_id - string - optional
 * @body level - number - optional
 * @body current_score - number - optional
 * @body position - number - optional
 * @body attempts - array - optional
 * @body missed_cut - boolean - optional
 * @body odds - number - optional
 * @body profile_id - string - optional
 * @returns Player
 */
export const updatePlayerByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockPlayers[0], is_mock: true });
  } catch (error: any) {
    console.log(`UPDATE PLAYER BY ID ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
updatePlayerByIdHandler.apiDescription = {
  responses: {
    200: { description: '200 OK' },
    403: { description: '403 Forbidden' },
    422: { description: '422 Validation Error' },
    500: { description: '500 Internal Server Error' },
  },
};
