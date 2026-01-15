import { Request, Response, NextFunction } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { database } from '../../services';
import { transactions, users } from '../../models';
import { paysafeClient } from '../../integrations/Paysafe/paysafe';
import { createAuditLog } from '../../services/auditLog';
import { apiKeyAuth, standardResponses } from '../schemas';

export const confirmPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const {
      transactionId,
      paymentHandleToken,
      paymentMethod,
    } = req.body;

    // Validate input
    if (!transactionId || !paymentHandleToken) {
      return res.status(400).send({
        error: 'INVALID_REQUEST',
        message: 'Transaction ID and payment handle token are required',
      });
    }

    // Get transaction
    const transaction = await database.query.transactions.findFirst({
      where: and(
        eq(transactions.id, transactionId),
        eq(transactions.user_id, user.id),
        eq(transactions.payment_status, 'PENDING')
      ),
    });

    if (!transaction) {
      return res.status(404).send({
        error: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found or already processed',
      });
    }

    const metadata = transaction.metadata as any;

    // Process payment with Paysafe
    try {
      const paymentResult = await paysafeClient.processPayment({
        merchantRefNum: metadata.merchantRefNum,
        amount: transaction.value,
        currencyCode: metadata.currency || 'GBP',
        paymentHandleToken,
        description: `Deposit for user ${user.id}`,
      });

      if (paymentResult.status === 'COMPLETED') {
        // Payment successful - update transaction status
        await database
          .update(transactions)
          .set({
            payment_status: 'COMPLETED',
            charge_id: paymentResult.id, // Store Paysafe transaction ID
            payment_handle_token: paymentHandleToken,
            payment_method: paymentMethod,
            metadata: {
              ...metadata,
              paysafeResponse: paymentResult,
              completedAt: new Date().toISOString(),
            },
            updated_at: new Date(),
          })
          .where(eq(transactions.id, transactionId))
          .execute();

        // Update user balance (separate operation - not atomic!)
        await database
          .update(users)
          .set({
            current_balance: sql`${users.current_balance} + ${transaction.value}`,
            updated_at: new Date(),
          })
          .where(eq(users.id, user.id))
          .execute();

        // Audit log
        await createAuditLog({
          userId: user.id,
          action: 'PAYMENT_COMPLETED',
          entityType: 'transaction',
          entityId: transactionId,
          metadata: {
            chargeId: paymentResult.id,
            amount: transaction.value,
          },
          req,
        });

        return res.status(200).send({
          data: {
            transactionId,
            status: 'COMPLETED',
            amount: transaction.value,
            chargeId: paymentResult.id,
          },
        });
      } else if (paymentResult.status === 'PENDING') {
        // Payment pending - update transaction
        await database
          .update(transactions)
          .set({
            payment_status: 'PENDING',
            charge_id: paymentResult.id,
            payment_handle_token: paymentHandleToken,
            payment_method: paymentMethod,
            metadata: {
              ...metadata,
              paysafeResponse: paymentResult,
            },
            updated_at: new Date(),
          })
          .where(eq(transactions.id, transactionId))
          .execute();

        return res.status(200).send({
          data: {
            transactionId,
            status: 'PENDING',
            message: 'Payment is being processed',
          },
        });
      } else {
        // Payment failed
        await database
          .update(transactions)
          .set({
            payment_status: 'FAILED',
            charge_id: paymentResult.id,
            payment_error_code: paymentResult.error?.code,
            payment_error_message: paymentResult.error?.message,
            metadata: {
              ...metadata,
              paysafeResponse: paymentResult,
              failedAt: new Date().toISOString(),
            },
            updated_at: new Date(),
          })
          .where(eq(transactions.id, transactionId))
          .execute();

        return res.status(400).send({
          error: 'PAYMENT_FAILED',
          message: paymentResult.error?.message || 'Payment processing failed',
          details: {
            code: paymentResult.error?.code,
          },
        });
      }
    } catch (paysafeError: any) {
      console.log(`PAYSAFE PAYMENT ERROR: ${paysafeError.message} 🛑`);

      // Update transaction with error
      await database
        .update(transactions)
        .set({
          payment_status: 'FAILED',
          payment_error_message: paysafeError.message,
          metadata: {
            ...metadata,
            error: paysafeError.message,
            failedAt: new Date().toISOString(),
          },
          updated_at: new Date(),
        })
        .where(eq(transactions.id, transactionId))
        .execute();

      return res.status(500).send({
        error: 'PAYMENT_PROCESSING_ERROR',
        message: paysafeError.message,
      });
    }
  } catch (error: any) {
    console.log(`CONFIRM PAYMENT ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

// OpenAPI documentation
confirmPayment.apiDescription = {
  summary: 'Confirm a payment',
  description: 'Process payment with Paysafe using payment handle token',
  operationId: 'confirmPayment',
  tags: ['payments'],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['transactionId', 'paymentHandleToken'],
          properties: {
            transactionId: {
              type: 'string',
              description: 'Transaction ID from initiate payment',
            },
            paymentHandleToken: {
              type: 'string',
              description: 'Payment handle token from Paysafe Checkout',
            },
            paymentMethod: {
              type: 'string',
              description: 'Payment method used',
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Payment confirmed',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  transactionId: { type: 'string' },
                  status: { type: 'string' },
                  amount: { type: 'number' },
                  chargeId: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    400: standardResponses[400],
    404: standardResponses[404],
    500: standardResponses[500],
  },
  security: [apiKeyAuth],
};
