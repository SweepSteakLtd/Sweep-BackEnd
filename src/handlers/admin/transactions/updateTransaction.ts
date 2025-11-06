import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Transaction, transactions } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, dataWrapper, standardResponses, transactionSchema } from '../../schemas';

/**
 * Update transaction (admin endpoint)
 * @params id - required
 * @body name - string - optional
 * @body value - string - optional
 * @body type - string - optional
 * @body charge_id - string - optional
 * @body user_id - string - optional
 * @returns Transaction
 */
export const updateTransactionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propertiesAvailableForUpdate = ['name', 'value', 'type', 'charge_id', 'user_id'];

    const { id } = req.params;

    if (!id) {
      console.log('[debug] missing id in request params');
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    const updateObject: Partial<Transaction> = {};
    Object.entries(req.body).forEach(([key, value]) => {
      if (propertiesAvailableForUpdate.includes(key)) {
        updateObject[key] = value as any;
      }
    });

    if (!Object.keys(updateObject).length) {
      console.log('[debug] no valid properties to update in request body', updateObject);
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    updateObject['updated_at'] = new Date();

    const finishedUpdatedObject = await database
      .update(transactions)
      .set(updateObject)
      .where(eq(transactions.id, id))
      .execute();

    return res.status(200).send({ data: finishedUpdatedObject });
  } catch (error: any) {
    console.log(`UPDATE TRANSACTION ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

updateTransactionHandler.apiDescription = {
  summary: 'Update transaction (Admin)',
  description: 'Admin endpoint to update transaction information by ID.',
  operationId: 'adminUpdateTransaction',
  tags: ['admin', 'transactions'],
  responses: {
    200: {
      description: 'Transaction updated successfully',
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
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
        format: 'uuid',
      },
      description: 'Unique identifier of the transaction to update',
      example: 'transaction_abc123',
    },
  ],
  requestBody: {
    description: 'Transaction update details. At least one field must be provided.',
    required: false,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          minProperties: 1,
          properties: {
            name: { type: 'string', minLength: 1 },
            value: { type: 'string', minLength: 1 },
            type: { type: 'string', enum: ['debit', 'credit'] },
            charge_id: { type: 'string', nullable: true },
            user_id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
