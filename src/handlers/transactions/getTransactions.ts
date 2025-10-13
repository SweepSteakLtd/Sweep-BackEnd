import { NextFunction, Request, Response } from 'express';
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

getTransactionsHandler.apiDescription = {
  responses: {
    200: {
      description: '200 OK',
      content: {
        'application/json': {
          schema: {
            type: 'array',
          },
        },
      },
    },
    403: {
      description: '403 Forbidden',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    500: {
      description: '500 Internal Server Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
};
