import { Request, Response, NextFunction } from 'express';
import { eq, sql } from 'drizzle-orm';
import { database } from '../../services';
import { transactions, users } from '../../models';
import { verifyWebhookSignature } from '../../integrations/Paysafe/webhooks';
import { PaysafeWebhookPayload } from '../../integrations/Paysafe/types';
import { createAuditLog } from '../../services/auditLog';
import { standardResponses } from '../schemas';

export const webhookHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers['x-paysafe-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    // Verify webhook signature
    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      console.log('[DEBUG] Invalid webhook signature');
      return res.status(401).send({
        error: 'INVALID_SIGNATURE',
        message: 'Webhook signature verification failed',
      });
    }

    const payload: PaysafeWebhookPayload = req.body;

    // Handle different event types
    switch (payload.eventType) {
      case 'PAYMENT_COMPLETED':
        await handlePaymentCompleted(payload, req);
        break;
      case 'PAYMENT_FAILED':
        await handlePaymentFailed(payload, req);
        break;
      case 'REFUND_COMPLETED':
        await handleRefundCompleted(payload, req);
        break;
      default:
        console.log(`[INFO] Unhandled webhook event type: ${payload.eventType}`);
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).send({ received: true });
  } catch (error: any) {
    console.log(`WEBHOOK PROCESSING ERROR: ${error.message} 🛑`);
    // Still return 200 to prevent retries
    return res.status(200).send({ received: true });
  }
};

async function handlePaymentCompleted(payload: PaysafeWebhookPayload, req: Request) {
  const paysafeId = payload.object.id;

  // Find transaction by Paysafe ID (stored in charge_id)
  const transaction = await database.query.transactions.findFirst({
    where: eq(transactions.charge_id, paysafeId),
  });

  if (!transaction || transaction.payment_status === 'COMPLETED') {
    return; // Already processed or not found
  }

  // Update transaction status
  await database
    .update(transactions)
    .set({
      payment_status: 'COMPLETED',
      metadata: {
        ...(transaction.metadata as any),
        webhookPayload: payload,
        completedAt: new Date().toISOString(),
      },
      updated_at: new Date(),
    })
    .where(eq(transactions.id, transaction.id))
    .execute();

  // Update user balance based on transaction type (separate operation - not atomic!)
  // For deposits: add to balance, for withdrawals: subtract from balance
  const balanceOperation = transaction.type === 'withdrawal'
    ? sql`${users.current_balance} - ${transaction.value}`
    : sql`${users.current_balance} + ${transaction.value}`;

  await database
    .update(users)
    .set({
      current_balance: balanceOperation,
      updated_at: new Date(),
    })
    .where(eq(users.id, transaction.user_id))
    .execute();

  // Audit log
  await createAuditLog({
    userId: transaction.user_id,
    action: 'PAYMENT_COMPLETED_WEBHOOK',
    entityType: 'transaction',
    entityId: transaction.id,
    metadata: {
      chargeId: paysafeId,
      webhookEvent: payload.eventType,
    },
    req,
  });
}

async function handlePaymentFailed(payload: PaysafeWebhookPayload, req: Request) {
  const paysafeId = payload.object.id;

  const transaction = await database.query.transactions.findFirst({
    where: eq(transactions.charge_id, paysafeId),
  });

  if (!transaction) return;

  await database
    .update(transactions)
    .set({
      payment_status: 'FAILED',
      metadata: {
        ...(transaction.metadata as any),
        webhookPayload: payload,
        failedAt: new Date().toISOString(),
      },
      updated_at: new Date(),
    })
    .where(eq(transactions.id, transaction.id))
    .execute();

  // Audit log
  await createAuditLog({
    userId: transaction.user_id,
    action: 'PAYMENT_FAILED_WEBHOOK',
    entityType: 'transaction',
    entityId: transaction.id,
    metadata: {
      chargeId: paysafeId,
      webhookEvent: payload.eventType,
    },
    req,
  });
}

async function handleRefundCompleted(payload: PaysafeWebhookPayload, req: Request) {
  // Implementation depends on refund requirements
  console.log('[INFO] Refund completed:', payload);
}

// OpenAPI documentation
webhookHandler.apiDescription = {
  summary: 'Paysafe webhook handler',
  description: 'Handle payment status updates from Paysafe',
  operationId: 'paysafeWebhook',
  tags: ['payments'],
  responses: {
    200: {
      description: 'Webhook processed',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              received: { type: 'boolean' },
            },
          },
        },
      },
    },
    401: standardResponses[401],
  },
};
