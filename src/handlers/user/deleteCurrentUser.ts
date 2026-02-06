import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { users } from '../../models';
import { database, firebaseAuth, createAuditLog } from '../../services';

/**
 * Delete current user (authenticated endpoint)
 * Only allows users to delete their own account
 * @returns void
 */
export const deleteCurrentUserHandler = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    const authenticatedUser = res.locals.user;

    // TODO: REMOVE for now just used for testing

    if (!email) {
      return res.status(400).send({
        error: 'Bad Request',
        message: 'Email is required',
      });
    }

    // Security check: Ensure authenticated user can only delete their own account
    if (!authenticatedUser || authenticatedUser.email !== email) {
      console.log('[SECURITY] Unauthorized deletion attempt:', {
        authenticatedEmail: authenticatedUser?.email,
        requestedEmail: email,
      });
      return res.status(403).send({
        error: 'Forbidden',
        message: 'You can only delete your own account',
      });
    }

    // Fetch the user before deleting for audit log
    const userToDelete = await database
      .select()
      .from(users)
      .where(eq(users.email, email as string))
      .limit(1)
      .execute();

    if (!userToDelete || userToDelete.length === 0) {
      console.log('[DEBUG] User not found in database:', email);
      return res.status(404).send({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const user = userToDelete[0];

    // Log the user object before deletion
    await createAuditLog({
      userId: user.id,
      action: 'DELETE_USER',
      entityType: 'user',
      entityId: user.id,
      oldValues: user as Record<string, unknown>,
      metadata: {
        deletedBy: 'self',
        deletedAt: new Date().toISOString(),
        email: email as string,
      },
      req,
    });

    console.log('[AUDIT] User deletion logged:', {
      userId: user.id,
      email: user.email,
    });

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
