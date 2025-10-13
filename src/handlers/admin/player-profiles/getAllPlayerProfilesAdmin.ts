import { NextFunction, Request, Response } from 'express';
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
getAllPlayerProfilesAdminHandler.apiDescription = {
  responses: {
    200: { description: '200 OK' },
    403: { description: '403 Forbidden' },
    500: { description: '500 Internal Server Error' },
  },
};
