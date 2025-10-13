import { NextFunction, Request, Response } from 'express';
import { mockGames } from '../../../models/__mocks';

/**
 * Get all games (admin endpoint)
 * @query owner_id - optional
 * @returns Game[]
 */
export const getAllGamesAdminHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockGames, is_mock: true });
  } catch (error: any) {
    console.log(`GET ALL GAMES ADMIN ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getAllGamesAdminHandler.apiDescription = {
  responses: {
    200: { description: '200 OK' },
    403: { description: '403 Forbidden' },
    500: { description: '500 Internal Server Error' },
  },
};
