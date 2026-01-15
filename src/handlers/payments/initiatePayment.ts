import { Request, Response, NextFunction } from 'express';
import { createId } from '@paralleldrive/cuid2';
import { eq, and, gte, sql } from 'drizzle-orm';
import { database } from '../../services';
import { transactions, users } from '../../models';
import { createAuditLog } from '../../services/auditLog';
import { apiKeyAuth, dataWrapper, standardResponses } from '../schemas';

export const initiatePayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const { amount, currency = 'USD' } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).send({
        error: 'INVALID_AMOUNT',
        message: 'Amount must be greater than 0',
      });
    }

    // Check deposit limits
    const userRecord = await database.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!userRecord) {
      return res.status(404).send({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Check monthly deposit limit
    const depositLimit = userRecord.deposit_limit as { daily?: number; weekly?: number; monthly?: number };

    if (depositLimit?.monthly || depositLimit?.weekly || depositLimit?.daily) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      // Get monthly total
      if (depositLimit.monthly) {
        const monthResult = await database
          .select({
            total: sql<number>`COALESCE(SUM(${transactions.value}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.user_id, user.id),
              eq(transactions.type, 'deposit'),
              eq(transactions.payment_status, 'COMPLETED'),
              gte(transactions.created_at, startOfMonth)
            )
          )
          .execute();

        const totalMonthlyDeposited = Number(monthResult[0]?.total || 0);

        if ((totalMonthlyDeposited + amount) > depositLimit.monthly) {
          console.log(`[DEBUG] Monthly deposit limit exceeded for user ${user.id}. Current: ${totalMonthlyDeposited}, Requested: ${amount}, Limit: ${depositLimit.monthly}`);
          return res.status(403).send({
            error: 'Deposit limit exceeded',
            message: `Monthly deposit limit of ${depositLimit.monthly} would be exceeded. Current month total: ${totalMonthlyDeposited}`,
          });
        }
      }

      // Get weekly total
      if (depositLimit.weekly) {
        const weekResult = await database
          .select({
            total: sql<number>`COALESCE(SUM(${transactions.value}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.user_id, user.id),
              eq(transactions.type, 'deposit'),
              eq(transactions.payment_status, 'COMPLETED'),
              gte(transactions.created_at, startOfWeek)
            )
          )
          .execute();

        const totalWeeklyDeposited = Number(weekResult[0]?.total || 0);

        if ((totalWeeklyDeposited + amount) > depositLimit.weekly) {
          console.log(`[DEBUG] Weekly deposit limit exceeded for user ${user.id}`);
          return res.status(403).send({
            error: 'Deposit limit exceeded',
            message: `Weekly deposit limit of ${depositLimit.weekly} would be exceeded. Current week total: ${totalWeeklyDeposited}`,
          });
        }
      }

      // Get daily total
      if (depositLimit.daily) {
        const dayResult = await database
          .select({
            total: sql<number>`COALESCE(SUM(${transactions.value}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.user_id, user.id),
              eq(transactions.type, 'deposit'),
              eq(transactions.payment_status, 'COMPLETED'),
              gte(transactions.created_at, startOfDay)
            )
          )
          .execute();

        const totalDailyDeposited = Number(dayResult[0]?.total || 0);

        if ((totalDailyDeposited + amount) > depositLimit.daily) {
          console.log(`[DEBUG] Daily deposit limit exceeded for user ${user.id}`);
          return res.status(403).send({
            error: 'Deposit limit exceeded',
            message: `Daily deposit limit of ${depositLimit.daily} would be exceeded. Current day total: ${totalDailyDeposited}`,
          });
        }
      }
    }

    // Generate unique merchant reference number
    const merchantRefNum = `TXN-${createId()}`;
    const idempotencyKey = createId();

    // Create pending transaction
    const transactionObject = {
      id: createId(),
      user_id: user.id,
      name: 'Deposit via Paysafe',
      value: amount,
      type: 'deposit',
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
      action: 'PAYMENT_INITIATED',
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
    console.log(`INITIATE PAYMENT ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

// OpenAPI documentation
initiatePayment.apiDescription = {
  summary: 'Initiate a payment',
  description: 'Create a pending transaction for a deposit',
  operationId: 'initiatePayment',
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
              description: 'Amount in minor units (cents)',
              example: 5000,
            },
            currency: {
              type: 'string',
              description: 'Currency code',
              example: 'USD',
              default: 'USD',
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Payment initiated successfully',
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
