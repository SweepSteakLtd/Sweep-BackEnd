import { Request, Response, NextFunction } from 'express';
import { mockTransactions } from '../../../models/__mocks';

/**
 * Create transaction (admin endpoint)
 * @body name - string - required
 * @body value - string - required
 * @body type - string - required
 * @body charge_id - string - optional
 * @body user_id - string - required
 * @returns Transaction
 */
export const createTransactionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(201).send({ data: mockTransactions[0], is_mock: true });
  } catch (error: any) {
    console.log(`CREATE TRANSACTION ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};