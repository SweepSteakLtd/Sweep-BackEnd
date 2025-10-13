import { NextFunction, Request, Response } from 'express';
import { mockPlayers } from '../../../models/__mocks';

/**
 * Get players by tournament (admin endpoint)
 * @params tournament_id - required
 * @returns Player[]
 */
export const getPlayersByTournamentHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockPlayers, is_mock: true });
  } catch (error: any) {
    console.log(`GET PLAYERS BY TOURNAMENT ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getPlayersByTournamentHandler.apiDescription = {
  responses: {
    200: { description: '200 OK' },
    403: { description: '403 Forbidden' },
    500: { description: '500 Internal Server Error' },
  },
};
