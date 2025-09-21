import { Request, Response, NextFunction } from 'express';
import { mockPlayerProfiles } from '../../models/__mocks';

/**
 * Get player profiles (authenticated endpoint)
 * @query country - optional
 * @returns PlayerProfile[]
 */
export const getPlayerProfilesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockPlayerProfiles, is_mock: true });
  } catch (error: any) {
    console.log(`GET PLAYER PROFILES ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};