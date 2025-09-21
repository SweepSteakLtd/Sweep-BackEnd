import { Request, Response, NextFunction } from 'express';
import { mockPlayerProfiles } from '../../../models/__mocks';

/**
 * Create player profile (admin endpoint)
 * @body external_id - string - optional
 * @body first_name - string - required
 * @body last_name - string - required
 * @body country - string - required
 * @body age - number - required
 * @body ranking - number - required
 * @returns PlayerProfile
 */
export const createPlayerProfileHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(201).send({ data: mockPlayerProfiles[0], is_mock: true });
  } catch (error: any) {
    console.log(`CREATE PLAYER PROFILE ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
