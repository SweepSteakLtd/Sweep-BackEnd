import { and, eq, gte } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Transaction, transactions, User } from '../../models';
import { database } from '../../services';
import { TransactionType } from '../transactions/getTransactions';

/**
 * Get activities (authenticated endpoint)
 * @query timestamp - optional
 * @returns {deposited: number, withdrawn: number, net_profit: number, transaction: Transaction}
 */
export const getActivityHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user: User = res.locals.user;
    let deposited = 0;
    let withdrawal = 0;

    const existingTransactions: Transaction[] = await database
      .select(transactions)
      .from(transactions)
      .where(
        req.query.timestamp
          ? and(
              eq(transactions.user_id, user.id),
              gte(transactions.created_at, new Date(parseInt(req.query.timestamp as string, 10))),
            )
          : eq(transactions.user_id, user.id),
      )
      .execute();

    existingTransactions.forEach(item => {
      if (item.type === TransactionType.deposit) {
        deposited += item.value;
      } else if (item.type === TransactionType.withdrawal) {
        withdrawal += item.value;
      }
    });

    return res.status(200).send({
      data: {
        deposited,
        withdrawn: withdrawal,
        net_profit: withdrawal - deposited, // TODO: Should we only track information user betted? It would make 0 sense if user deposited 100 euro and then net profit is -100 euro
        transactions: existingTransactions,
      },
    });
  } catch (error: any) {
    console.log(`GET TRANSACTIONS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getActivityHandler.apiDescription = {
  responses: {
    200: {
      description: '200 OK',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              deposited: { type: 'number' },
              withdrawn: { type: 'number' },
              net_profit: { type: 'number' },
              transactions: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  value: { type: 'number' },
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
      name: 'timestamp',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'filter activities by timestamp',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
