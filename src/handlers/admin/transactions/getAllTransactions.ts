import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { transactions } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, arrayDataWrapper, standardResponses, transactionSchema } from '../../schemas';

/**
 * Get all transactions (admin endpoint)
 * @query type - optional
 * @query user_id - optional
 * @returns Transaction[]
 */
export const getAllTransactionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const allowedFilters = ['type', 'user_id'];
    const filters: any[] = [];

    allowedFilters.forEach(filter => {
      const current = req.query[filter];
      if (current) {
        filters.push(eq((transactions as any)[filter], current));
      }
    });

    const existing = database.select().from(transactions);
    let finalResult = null as any;

    if (filters.length > 0) {
      finalResult = await existing
        .where(filters.length > 1 ? and(...filters) : filters[0])
        .execute();
    } else {
      finalResult = await existing.execute();
    }

    return res.status(200).send({ data: finalResult });
  } catch (error: any) {
    console.log(`GET ALL TRANSACTIONS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getAllTransactionsHandler.apiDescription = {
  summary: 'Get all transactions (Admin)',
  description:
    'Admin endpoint to retrieve all transactions with optional filtering by type or user.',
  operationId: 'adminGetAllTransactions',
  tags: ['admin', 'transactions'],
  responses: {
    200: {
      description: 'Transactions retrieved successfully',
      content: {
        'application/json': {
          schema: arrayDataWrapper(transactionSchema),
        },
      },
    },
    403: standardResponses[403],
    500: standardResponses[500],
  },
  parameters: [
    {
      name: 'type',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        enum: ['debit', 'credit'],
      },
      description: 'Filter transactions by type',
      example: 'debit',
    },
    {
      name: 'user_id',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        format: 'uuid',
      },
      description: 'Filter transactions by user ID',
      example: 'user_abc123',
    },
  ],
  security: [apiKeyAuth],
};
