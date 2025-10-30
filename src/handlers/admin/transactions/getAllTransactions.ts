import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { transactions } from '../../../models';
import { database } from '../../../services';

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
  responses: {
    200: {
      description: '200 OK',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: {
              id: { type: 'string' },
              name: { type: 'string' },
              value: { type: 'string' },
              type: { type: 'string' },
              charge_id: { type: 'string' },
              user_id: { type: 'string' },
              created_at: { type: 'string' },
              updated_at: { type: 'string' },
            },
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

  parameters: [
    {
      name: 'type',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'filter transactions by type of payment used',
    },
    {
      name: 'user_id',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'filter transactions by user id',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
