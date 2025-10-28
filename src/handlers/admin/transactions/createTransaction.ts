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
      return res.status(422).send({ error: 'Invalid request body', message: 'required properties missing' });
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
    201: { description: '201 Created' },
    403: { description: '403 Forbidden' },
    422: { description: '422 Validation Error' },
    500: { description: '500 Internal Server Error' },
  },
};
