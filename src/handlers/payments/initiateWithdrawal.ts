import { Request, Response, NextFunction } from 'express';
import { createId } from '@paralleldrive/cuid2';
import { eq, and, gte, sql } from 'drizzle-orm';
import { database } from '../../services';
import { transactions, users } from '../../models';
import { createAuditLog } from '../../services/auditLog';
import { apiKeyAuth, dataWrapper, standardResponses } from '../schemas';

export const initiateWithdrawal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const { amount, currency = 'GBP' } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).send({
        error: 'INVALID_AMOUNT',
        message: 'Amount must be greater than 0',
      });
    }

    // Get user record to check balance
    const userRecord = await database.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!userRecord) {
      return res.status(404).send({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Check if user has sufficient balance
    const currentBalance = userRecord.current_balance || 0;
    if (currentBalance < amount) {
      return res.status(400).send({
        error: 'INSUFFICIENT_BALANCE',
        message: `Insufficient balance. Available: ${currentBalance}, Requested: ${amount}`,
      });
    }

    // Check withdrawal limits (if configured)
    const withdrawalLimit = userRecord.withdrawal_limit as { daily?: number; weekly?: number; monthly?: number } | null;

    if (withdrawalLimit?.monthly || withdrawalLimit?.weekly || withdrawalLimit?.daily) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      // Get monthly total
      if (withdrawalLimit.monthly) {
        const monthResult = await database
          .select({
            total: sql<number>`COALESCE(SUM(${transactions.value}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.user_id, user.id),
              eq(transactions.type, 'withdrawal'),
              eq(transactions.payment_status, 'COMPLETED'),
              gte(transactions.created_at, startOfMonth)
            )
          )
          .execute();

        const totalMonthlyWithdrawn = Number(monthResult[0]?.total || 0);

        if ((totalMonthlyWithdrawn + amount) > withdrawalLimit.monthly) {
          console.log(`[DEBUG] Monthly withdrawal limit exceeded for user ${user.id}. Current: ${totalMonthlyWithdrawn}, Requested: ${amount}, Limit: ${withdrawalLimit.monthly}`);
          return res.status(403).send({
            error: 'Withdrawal limit exceeded',
            message: `Monthly withdrawal limit of ${withdrawalLimit.monthly} would be exceeded. Current month total: ${totalMonthlyWithdrawn}`,
          });
        }
      }

      // Get weekly total
      if (withdrawalLimit.weekly) {
        const weekResult = await database
          .select({
            total: sql<number>`COALESCE(SUM(${transactions.value}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.user_id, user.id),
              eq(transactions.type, 'withdrawal'),
              eq(transactions.payment_status, 'COMPLETED'),
              gte(transactions.created_at, startOfWeek)
            )
          )
          .execute();

        const totalWeeklyWithdrawn = Number(weekResult[0]?.total || 0);

        if ((totalWeeklyWithdrawn + amount) > withdrawalLimit.weekly) {
          console.log(`[DEBUG] Weekly withdrawal limit exceeded for user ${user.id}`);
          return res.status(403).send({
            error: 'Withdrawal limit exceeded',
            message: `Weekly withdrawal limit of ${withdrawalLimit.weekly} would be exceeded. Current week total: ${totalWeeklyWithdrawn}`,
          });
        }
      }

      // Get daily total
      if (withdrawalLimit.daily) {
        const dayResult = await database
          .select({
            total: sql<number>`COALESCE(SUM(${transactions.value}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.user_id, user.id),
              eq(transactions.type, 'withdrawal'),
              eq(transactions.payment_status, 'COMPLETED'),
              gte(transactions.created_at, startOfDay)
            )
          )
          .execute();

        const totalDailyWithdrawn = Number(dayResult[0]?.total || 0);

        if ((totalDailyWithdrawn + amount) > withdrawalLimit.daily) {
          console.log(`[DEBUG] Daily withdrawal limit exceeded for user ${user.id}`);
          return res.status(403).send({
            error: 'Withdrawal limit exceeded',
            message: `Daily withdrawal limit of ${withdrawalLimit.daily} would be exceeded. Current day total: ${totalDailyWithdrawn}`,
          });
        }
      }
    }

    // Generate unique merchant reference number
    const merchantRefNum = `WD-${createId()}`;
    const idempotencyKey = createId();

    // Create pending withdrawal transaction
    const transactionObject = {
      id: createId(),
      user_id: user.id,
      name: 'Withdrawal via Paysafe',
      value: amount,
      type: 'withdrawal',
      charge_id: '',
      payment_status: 'PENDING',
      idempotency_key: idempotencyKey,
      metadata: {
        merchantRefNum,
        currency,
        initiatedAt: new Date().toISOString(),
      },
      created_at: new Date(),
      updated_at: new Date(),
    };

    await database
      .insert(transactions)
      .values(transactionObject)
      .execute();

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: 'WITHDRAWAL_INITIATED',
      entityType: 'transaction',
      entityId: transactionObject.id,
      metadata: {
        amount,
        currency,
      },
      req,
    });

    return res.status(200).send({
      data: {
        transactionId: transactionObject.id,
        merchantRefNum,
        amount,
        currency,
      },
    });
  } catch (error: any) {
    console.log(`INITIATE WITHDRAWAL ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

// OpenAPI documentation
initiateWithdrawal.apiDescription = {
  summary: 'Initiate a withdrawal',
  description: 'Create a pending transaction for a withdrawal',
  operationId: 'initiateWithdrawal',
  tags: ['payments'],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: {
              type: 'number',
              description: 'Amount in minor units (pence)',
              example: 5000,
            },
            currency: {
              type: 'string',
              description: 'Currency code',
              example: 'GBP',
              default: 'GBP',
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Withdrawal initiated successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  transactionId: { type: 'string' },
                  merchantRefNum: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    400: standardResponses[400],
    403: standardResponses[403],
    404: standardResponses[404],
    500: standardResponses[500],
  },
  security: [apiKeyAuth],
};
