import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { transactions } from '../../../models';
import { database } from '../../../services';

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
  responses: {
    204: { description: '204 No Content' },
    403: { description: '403 Forbidden' },
    422: { description: '422 invalid request' },
    500: { description: '500 Internal Server Error' },
  },
};
