import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { leagues } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, standardResponses } from '../../schemas';

/**
 * Delete league (admin endpoint)
 * @params id - required
 * @returns void
 */
export const deleteLeagueAdminHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leagueId = req.params.id;

    // Validate id parameter
    if (!leagueId) {
      console.log('[DEBUG] missing id in request params');
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'Missing required parameter: id' });
    }

    // Validate id is non-empty string
    if (typeof leagueId !== 'string' || leagueId.trim().length === 0) {
      console.log('[DEBUG] Invalid id: must be non-empty string');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'id must be a non-empty string',
      });
    }

    const existingLeague = await database
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .limit(1)
      .execute();

    if (existingLeague.length === 0) {
      console.log('[DEBUG] League not found:', leagueId);
      return res.status(404).send({ error: 'League not found', message: "League doesn't exist" });
    }

    await database.delete(leagues).where(eq(leagues.id, leagueId)).execute();

    return res.status(204).send({ data: {} });
  } catch (error: any) {
    console.log(`DELETE LEAGUE ADMIN ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

deleteLeagueAdminHandler.apiDescription = {
  summary: 'Delete league (Admin)',
  description:
    'Admin endpoint to permanently delete a league by ID. This operation cannot be undone.',
  operationId: 'adminDeleteLeague',
  tags: ['admin', 'leagues'],
  responses: {
    204: {
      description: 'League deleted successfully - No content returned',
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
      description: 'Unique identifier of the league to delete',
      example: 'league_abc123',
    },
  ],
  security: [apiKeyAuth],
};
