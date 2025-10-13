import { NextFunction, Request, Response } from 'express';
import { mockPlayerProfiles } from '../../../models/__mocks';

/**
 * Update player profile (admin endpoint)
 * @params id - required
 * @body external_id - string - optional
 * @body first_name - string - optional
 * @body last_name - string - optional
 * @body country - string - optional
 * @body age - number -
 * @body ranking - optional
 * @returns PlayerProfile
 */
export const updatePlayerProfileHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockPlayerProfiles[0], is_mock: true });
  } catch (error: any) {
    console.log(`UPDATE PLAYER PROFILE ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
updatePlayerProfileHandler.apiDescription = {
  responses: {
    200: { description: '200 OK' },
    403: { description: '403 Forbidden' },
    422: { description: '422 Validation Error' },
    500: { description: '500 Internal Server Error' },
  },
};
