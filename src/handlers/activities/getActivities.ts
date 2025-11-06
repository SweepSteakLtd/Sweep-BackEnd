import { and, eq, gte } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Transaction, transactions, User } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, dataWrapper, standardResponses, transactionSummarySchema } from '../schemas';
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
  summary: 'Get user activity summary',
  description:
    'Retrieves user activity summary with calculated statistics. Returns deposited amount, withdrawn amount, net profit, and transaction list. Optionally filter by timestamp.',
  operationId: 'getActivities',
  tags: ['activities'],
  responses: {
    200: {
      description: 'Activities retrieved successfully',
      content: {
        'application/json': {
          schema: dataWrapper(transactionSummarySchema),
          examples: {
            allActivities: {
              summary: 'All user activities',
              value: {
                data: {
                  deposited: 1500,
                  withdrawn: 750,
                  netProfit: -750,
                  transactions: [
                    {
                      id: 'txn_abc123',
                      name: 'Initial deposit',
                      value: 1000,
                      type: 'deposit',
                      charge_id: 'ch_xyz789',
                      user_id: 'user_abc123',
                      created_at: '2025-01-15T10:00:00Z',
                      updated_at: '2025-01-15T10:00:00Z',
                    },
                    {
                      id: 'txn_def456',
                      name: 'Second deposit',
                      value: 500,
                      type: 'deposit',
                      charge_id: 'ch_def012',
                      user_id: 'user_abc123',
                      created_at: '2025-01-18T14:20:00Z',
                      updated_at: '2025-01-18T14:20:00Z',
                    },
                    {
                      id: 'txn_ghi789',
                      name: 'Winnings withdrawal',
                      value: 750,
                      type: 'withdrawal',
                      charge_id: 'ch_ghi345',
                      user_id: 'user_abc123',
                      created_at: '2025-01-20T16:00:00Z',
                      updated_at: '2025-01-20T16:00:00Z',
                    },
                  ],
                },
              },
            },
            filteredByTimestamp: {
              summary: 'Activities since specific timestamp',
              value: {
                data: {
                  deposited: 500,
                  withdrawn: 750,
                  netProfit: 250,
                  transactions: [
                    {
                      id: 'txn_def456',
                      name: 'Second deposit',
                      value: 500,
                      type: 'deposit',
                      charge_id: 'ch_def012',
                      user_id: 'user_abc123',
                      created_at: '2025-01-18T14:20:00Z',
                      updated_at: '2025-01-18T14:20:00Z',
                    },
                    {
                      id: 'txn_ghi789',
                      name: 'Winnings withdrawal',
                      value: 750,
                      type: 'withdrawal',
                      charge_id: 'ch_ghi345',
                      user_id: 'user_abc123',
                      created_at: '2025-01-20T16:00:00Z',
                      updated_at: '2025-01-20T16:00:00Z',
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
      name: 'timestamp',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        pattern: '^[0-9]+$',
      },
      description:
        'Filter activities since this Unix timestamp in milliseconds. Only transactions created after this time will be included.',
      example: '1705584000000',
    },
  ],
  security: [apiKeyAuth],
};
