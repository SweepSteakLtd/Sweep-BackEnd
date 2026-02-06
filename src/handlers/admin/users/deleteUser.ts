import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { users } from '../../../models';
import { database, createAuditLog } from '../../../services';
import { apiKeyAuth, standardResponses } from '../../schemas';

/**
 * Delete user (admin endpoint)
 * @params id - required
 * @returns void
 */
export const deleteUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;

    // Validate id parameter
    if (!userId) {
      console.log('[DEBUG] missing id in request params');
      return res
        .status(422)
        .send({ error: 'Invalid request params', message: 'user id is required' });
    }

    // Validate id is non-empty string
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      console.log('[DEBUG] Invalid id: must be non-empty string');
      return res.status(422).send({
        error: 'Invalid request params',
        message: 'id must be a non-empty string',
      });
    }

    // Fetch the user before deleting for audit log
    const userToDelete = await database
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .execute();

    if (!userToDelete || userToDelete.length === 0) {
      console.log('[DEBUG] User not found:', userId);
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
        deletedBy: 'admin',
        deletedAt: new Date().toISOString(),
      },
      req,
    });

    console.log('[AUDIT] User deletion logged:', {
      userId: user.id,
      email: user.email,
    });

    // Delete user from database
    await database.delete(users).where(eq(users.id, userId)).execute();

    return res.status(204).send({ data: {} });
  } catch (error: any) {
    console.log(`DELETE USER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

deleteUserHandler.apiDescription = {
  summary: 'Delete user (Admin)',
  description:
    'Admin endpoint to permanently delete a user account. This operation cannot be undone.',
  operationId: 'adminDeleteUser',
  tags: ['admin', 'users'],
  responses: {
    204: {
      description: 'User deleted successfully - No content returned',
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
      description: 'Unique identifier of the user to delete',
      example: 'user_abc123',
    },
  ],
  security: [apiKeyAuth],
};
