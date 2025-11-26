import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { users } from '../../models';
import { database, firebaseAuth } from '../../services';

/**
 * Delete current user (authenticated endpoint)
 * @returns void
 */
export const deleteCurrentUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.query;
    // TODO: REMOVE for now just used for testing

    if (!email) {
      return res.status(400).send({
        error: 'Bad Request',
        message: 'Email is required',
      });
    }

    // Delete user from Firebase Authentication
    try {
      const firebaseUser = await firebaseAuth.getUserByEmail(email as string);
      await firebaseAuth.deleteUser(firebaseUser.uid);
      console.log(`[DEBUG]: Deleted user from Firebase Auth: ${email}`);
    } catch (firebaseError: any) {
      // User might not exist in Firebase, log but don't fail the entire operation
      if (firebaseError.code === 'auth/user-not-found') {
        console.log(`[DEBUG]: User not found in Firebase Auth: ${email}`);
      } else {
        console.log(`[DEBUG]: Error deleting user from Firebase Auth: ${firebaseError.message}`);
        // Re-throw for other Firebase errors as they might indicate a real problem
        throw firebaseError;
      }
    }

    // Delete user from database
    await database
      .delete(users)
      .where(eq(users.email, email as string))
      .execute();

    console.log(`[DEBUG]: Deleted user from database: ${email}`);

    return res.status(200).send({ data: { deleted: true } });
  } catch (error: any) {
    console.log(`DELETE CURRENT USER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
deleteCurrentUserHandler.apiDescription = {}

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
