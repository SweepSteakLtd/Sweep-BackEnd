import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { users } from '../../models';
import { database } from '../../services';

/**
 * Delete current user (authenticated endpoint)
 * @returns void
 */
export const deleteCurrentUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.query;
    // TODO: REMOVE for now just used for testing
    await database
      .delete(users)
      .from(users)
      .where(eq(users.id, id as string));

    return res.status(204).send({ data: { deleted: true } });
  } catch (error: any) {
    console.log(`DELETE CURRENT USER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

// for now endpoint is deprecated
// deleteCurrentUserHandler.apiDescription = {get
//   responses: {
//     204: {
//       description: '204 No Content',
//     },
//     403: {
//       description: '403 Forbidden',
//       content: {
//         'application/json': {
//           schema: {
//             type: 'object',
//             properties: {
//               error: { type: 'string' },
//               message: { type: 'string' },
//             },
//           },
//         },
//       },
//     },
//     500: {
//       description: '500 Internal Server Error',
//       content: {
//         'application/json': {
//           schema: {
//             type: 'object',
//             properties: {
//               error: { type: 'string' },
//               message: { type: 'string' },
//             },
//           },
//         },
//       },
//     },
//   },
// };
