import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Transaction, transactions, User } from '../../models';
import { database } from '../../services';

/**
 * Get transactions (authenticated endpoint)
 * @query type - optional
 * @returns Transaction[]
 */
export const getTransactionsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user: User = res.locals.user;
    const type = req.query.type as string;
    let existingTransactions: Transaction[] = [];

    if (type) {
      existingTransactions = await database
        .select()
        .from(transactions)
        .where(and(eq(transactions.type, type), eq(transactions.user_id, user.id)))
        .execute();
    } else {
      existingTransactions = await database
        .select()
        .from(transactions)
        .where(eq(transactions.user_id, user.id))
        .execute();
    }

    return res.status(200).send({ data: existingTransactions });
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
            type: 'object',
            properties: {
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
      description: 'By transaction with passed type -> enum will be defined a bit later',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
