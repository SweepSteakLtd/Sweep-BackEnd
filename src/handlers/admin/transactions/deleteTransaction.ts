import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { transactions } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, standardResponses } from '../../schemas';

/**
 * Delete transaction (admin endpoint)
 * @params id - required
 * @returns void
 */
export const deleteTransactionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id) {
      console.log('[debug] missing id in request params');
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    const existing = await database
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1)
      .execute();
    if (!existing || existing.length === 0) {
      return res
        .status(403)
        .send({ error: 'Missing transaction', message: "Transaction doesn't exist" });
    }

    await database.delete(transactions).where(eq(transactions.id, id)).execute();

    return res.status(204).send({ data: {} });
  } catch (error: any) {
    console.log(`DELETE TRANSACTION ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

deleteTransactionHandler.apiDescription = {
  summary: 'Delete transaction (Admin)',
  description:
    'Admin endpoint to permanently delete a transaction by ID. This operation cannot be undone.',
  operationId: 'adminDeleteTransaction',
  tags: ['admin', 'transactions'],
  responses: {
    204: {
      description: 'Transaction deleted successfully - No content returned',
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
      description: 'Unique identifier of the transaction to delete',
      example: 'transaction_abc123',
    },
  ],
  security: [apiKeyAuth],
};
