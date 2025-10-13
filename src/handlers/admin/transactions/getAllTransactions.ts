import { NextFunction, Request, Response } from 'express';
import { mockTransactions } from '../../../models/__mocks';

/**
 * Get all transactions (admin endpoint)
 * @query type - optional
 * @query user_id - optional
 * @returns Transaction[]
 */
export const getAllTransactionsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: mockTransactions, is_mock: true });
  } catch (error: any) {
    console.log(`GET ALL TRANSACTIONS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getAllTransactionsHandler.apiDescription = {
  responses: {
    200: { description: '200 OK' },
    403: { description: '403 Forbidden' },
    500: { description: '500 Internal Server Error' },
  },
};
