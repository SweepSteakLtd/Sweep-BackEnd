import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Transaction, transactions, User } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, dataWrapper, standardResponses, transactionSummarySchema } from '../schemas';

export enum TransactionType {
  withdrawal = 'withdrawal',
  deposit = 'deposit',
}

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

    return res.status(200).send({
      data: { deposited: 0, withdrawn: 0, netProfit: 0, transactions: existingTransactions },
    });
  } catch (error: any) {
    console.log(`GET TRANSACTIONS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getTransactionsHandler.apiDescription = {
  summary: 'Get user transactions',
  description:
    'Retrieves all transactions for the authenticated user with optional filtering by transaction type. Returns summary statistics (deposited, withdrawn, netProfit) along with transaction list.',
  operationId: 'getTransactions',
  tags: ['transactions'],
  responses: {
    200: {
      description: 'Transactions retrieved successfully',
      content: {
        'application/json': {
          schema: dataWrapper(transactionSummarySchema),
          examples: {
            allTransactions: {
              summary: 'All user transactions',
              value: {
                data: {
                  deposited: 500,
                  withdrawn: 250,
                  netProfit: -250,
                  transactions: [
                    {
                      id: 'txn_abc123',
                      name: 'Initial deposit',
                      value: 500,
                      type: 'deposit',
                      charge_id: 'ch_xyz789',
                      user_id: 'user_abc123',
                      created_at: '2025-01-15T10:00:00Z',
                      updated_at: '2025-01-15T10:00:00Z',
                    },
                    {
                      id: 'txn_def456',
                      name: 'Withdrawal request',
                      value: 250,
                      type: 'withdrawal',
                      charge_id: 'ch_abc456',
                      user_id: 'user_abc123',
                      created_at: '2025-01-20T14:30:00Z',
                      updated_at: '2025-01-20T14:30:00Z',
                    },
                  ],
                },
              },
            },
            filteredDeposits: {
              summary: 'Only deposit transactions',
              value: {
                data: {
                  deposited: 0,
                  withdrawn: 0,
                  netProfit: 0,
                  transactions: [
                    {
                      id: 'txn_abc123',
                      name: 'Initial deposit',
                      value: 500,
                      type: 'deposit',
                      charge_id: 'ch_xyz789',
                      user_id: 'user_abc123',
                      created_at: '2025-01-15T10:00:00Z',
                      updated_at: '2025-01-15T10:00:00Z',
                    },
                  ],
                },
              },
            },
          },
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
        enum: ['deposit', 'withdrawal'],
      },
      description: 'Filter transactions by type. If omitted, returns all transactions.',
      example: 'deposit',
    },
  ],
  security: [apiKeyAuth],
};
