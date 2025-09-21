import { Request, Response, NextFunction } from 'express';
import { mockUsers } from '../../../models/__mocks';

/**
 * Get all users (admin endpoint)
 * @query email - optional
 * @returns User[]
 */
export const getAllUsersHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockUsers, is_mock: true });
  } catch (error: any) {
    console.log(`GET ALL USERS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};