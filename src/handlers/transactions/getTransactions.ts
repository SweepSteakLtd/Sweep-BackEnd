import { Request, Response, NextFunction } from 'express';
import { mockTransactions } from '../../models/__mocks';

/**
 * Get transactions (authenticated endpoint)
 * @query type - optional
 * @returns Transaction[]
 */
export const getTransactionsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockTransactions, is_mock: true });
  } catch (error: any) {
    console.log(`GET TRANSACTIONS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};