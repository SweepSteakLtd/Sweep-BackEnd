import { Request, Response, NextFunction } from 'express';
import { mockUsers } from '../../models/__mocks';

/**
 * Get current user (authenticated endpoint)
 * @returns User
 */
export const getCurrentUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockUsers[0], is_mock: true });
  } catch (error: any) {
    console.log(`GET CURRENT USER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
