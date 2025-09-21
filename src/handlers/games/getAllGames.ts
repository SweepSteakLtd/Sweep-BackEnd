import { Request, Response, NextFunction } from 'express';
import { mockGames } from '../../models/__mocks';

/**
 * Get all games (authenticated endpoint)
 * @returns Game[]
 */
export const getAllGamesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockGames, is_mock: true });
  } catch (error: any) {
    console.log(`GET ALL GAMES ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};