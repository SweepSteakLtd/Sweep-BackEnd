import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Transaction, transactions } from '../../../models';
import { database } from '../../../services';

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
  responses: {
    200: {
      description: '200 OK',
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
  parameters: [
    {
      name: 'id',
      in: 'param',
      required: true,
      schema: {
        type: 'string',
      },
      description: 'update transaction by id',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
