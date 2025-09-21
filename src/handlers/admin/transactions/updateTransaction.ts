import { Request, Response, NextFunction } from 'express';
import { mockTransactions } from '../../../models/__mocks';

/**
 * Update transaction (admin endpoint)
 * @params id - required
 * @body name - string - optional
 * @body value - string - optional
 * @body type - string - optional
 * @body charge_id - string - optional
 * @body user_id - string - optional
 * @returns Transaction
 */
export const updateTransactionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockTransactions[0], is_mock: true });
  } catch (error: any) {
    console.log(`UPDATE TRANSACTION ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};