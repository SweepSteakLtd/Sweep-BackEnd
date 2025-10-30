import { createId } from '@paralleldrive/cuid2';
import { NextFunction, Request, Response } from 'express';
import { Transaction, transactions } from '../../../models';
import { database } from '../../../services';

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
  responses: {
    201: {
      description: '201 Created',
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
    422: {
      description: '422 Validation Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'array' },
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
  requestBody: {
    content: {
      'application/json': {
        example: {
          id: 'transaction id',
          name: 'test transactions',
          value: 'test value',
          type: 'debit',
          charge_id: 'charge id',
          user_id: 'user that did transaction',
          created_at: new Date(),
          updated_at: new Date(),
        },
      },
    },
    required: true,
  },
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
