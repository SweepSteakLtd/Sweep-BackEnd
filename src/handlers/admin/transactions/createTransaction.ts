import { createId } from '@paralleldrive/cuid2';
import { NextFunction, Request, Response } from 'express';
import { Transaction, transactions } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, dataWrapper, standardResponses, transactionSchema } from '../../schemas';

/**
 * Create transaction (admin endpoint)
 * @body name - string - required
 * @body value - string - required
 * @body type - string - required
 * @body charge_id - string - optional
 * @body user_id - string - required
 * @returns Transaction
 */
export const createTransactionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, value, type, charge_id, user_id } = req.body as Partial<Transaction>;

    if (!name || !value || !type || !user_id) {
      console.log('[debug] missing required transaction properties');
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    const transactionObject: Transaction = {
      id: createId(),
      name,
      value,
      type,
      charge_id: charge_id || '',
      user_id,
      created_at: new Date(),
      updated_at: new Date(),
    } as Transaction;

    await database.insert(transactions).values(transactionObject).execute();

    return res.status(201).send({ data: transactionObject });
  } catch (error: any) {
    console.log(`CREATE TRANSACTION ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
createTransactionHandler.apiDescription = {
  summary: 'Create transaction (Admin)',
  description: 'Admin endpoint to manually create a transaction record for a user.',
  operationId: 'adminCreateTransaction',
  tags: ['admin', 'transactions'],
  responses: {
    201: {
      description: 'Transaction created successfully',
      content: {
        'application/json': {
          schema: dataWrapper(transactionSchema),
        },
      },
    },
    422: standardResponses[422],
    403: standardResponses[403],
    500: standardResponses[500],
  },
  requestBody: {
    description: 'Transaction creation details.',
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['name', 'value', 'type', 'user_id'],
          properties: {
            name: { type: 'string', minLength: 1, description: 'Transaction name' },
            value: { type: 'string', minLength: 1, description: 'Transaction value/amount' },
            type: { type: 'string', enum: ['debit', 'credit'], description: 'Transaction type' },
            charge_id: {
              type: 'string',
              nullable: true,
              description: 'Payment processor charge ID',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID for this transaction',
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
