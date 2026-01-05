import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { bets, User } from '../../models';
import { createAuditLog, database } from '../../services';
import { apiKeyAuth, standardResponses } from '../schemas';

/**
 * Delete bet (authenticated endpoint)
 * @params id - required
 * @returns void
 */
export const deleteBetHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = res.locals.user as User;

    if (!id) {
      console.log('[DEBUG] Missing bet id in request params');
      return res.status(422).send({
        error: 'Invalid request',
        message: 'Bet ID is required',
      });
    }

    if (!user || !user.id) {
      console.log('[DEBUG] Missing authenticated user');
      return res.status(401).send({
        error: 'Unauthorized',
        message: 'User authentication is required',
      });
    }

    // First, check if the bet exists and belongs to the user
    const existingBet = await database
      .select()
      .from(bets)
      .where(eq(bets.id, id))
      .limit(1)
      .execute();

    if (existingBet.length === 0) {
      console.log(`[DEBUG] Bet not found: ${id}`);
      return res.status(404).send({
        error: 'Not Found',
        message: 'Bet not found',
      });
    }

    // CRITICAL: Verify ownership before deletion
    if (existingBet[0].owner_id !== user.id) {
      console.warn(
        `[SECURITY] User ${user.id} attempted to delete bet ${id} owned by ${existingBet[0].owner_id}`,
      );
      return res.status(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to delete this bet',
      });
    }

    // Delete the bet with ownership verification
    await database
      .delete(bets)
      .where(and(eq(bets.id, id), eq(bets.owner_id, user.id)))
      .execute();

    // Audit log the deletion
    await createAuditLog({
      userId: user.id,
      action: 'DELETE_BET',
      entityType: 'bet',
      entityId: id,
      oldValues: {
        owner_id: existingBet[0].owner_id,
        league_id: existingBet[0].league_id,
        team_id: existingBet[0].team_id,
        amount: existingBet[0].amount,
      },
      req,
    });

    console.log(`[DEBUG] User ${user.id} successfully deleted bet ${id}`);
    return res.status(204).send();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`DELETE BET ERROR: ${errorMessage} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

deleteBetHandler.apiDescription = {
  summary: 'Delete a bet',
  description:
    'Deletes a bet owned by the authenticated user. Only the bet owner can delete their own bets. Returns 204 No Content on successful deletion.',
  operationId: 'deleteBet',
  tags: ['bets'],
  responses: {
    204: {
      description: 'Bet deleted successfully - No content returned',
    },
    401: standardResponses[401],
    403: standardResponses[403],
    404: standardResponses[404],
    422: standardResponses[422],
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
      description: 'Unique identifier of the bet to delete',
      example: 'bet_abc123',
    },
  ],
  security: [apiKeyAuth],
};
