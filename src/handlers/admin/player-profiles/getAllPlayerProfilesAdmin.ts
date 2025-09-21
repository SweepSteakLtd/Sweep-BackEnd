import { Request, Response, NextFunction } from 'express';
import { mockPlayerProfiles } from '../../../models/__mocks';

/**
 * Get all player profiles (admin endpoint)
 * @query country - optional
 * @returns PlayerProfile[]
 */
export const getAllPlayerProfilesAdminHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockPlayerProfiles, is_mock: true });
  } catch (error: any) {
    console.log(`GET ALL PLAYER PROFILES ADMIN ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};