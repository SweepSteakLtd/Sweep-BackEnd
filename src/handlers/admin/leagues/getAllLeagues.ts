import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { League, leagues } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, arrayDataWrapper, leagueSchema, standardResponses } from '../../schemas';

/**
 * Get all leagues (admin endpoint)
 * @query owner_id - optional
 * @query entry_fee - optional
 * @query tournament_id - optional
 * @query search_term - optional
 * @returns League[]
 */
export const getAllLeaguesAdminHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Validate entry_fee query parameter if provided
    if (
      req.query.entry_fee !== undefined &&
      req.query.entry_fee !== null &&
      req.query.entry_fee !== ''
    ) {
      const entryFee = Number(req.query.entry_fee);
      if (isNaN(entryFee) || entryFee < 0) {
        console.log('[DEBUG] Invalid entry_fee query parameter:', req.query.entry_fee);
        return res.status(422).send({
          error: 'Invalid query parameter',
          message: 'entry_fee must be a non-negative number',
        });
      }
    }

    // Validate owner_id query parameter if provided
    if (
      req.query.owner_id !== undefined &&
      req.query.owner_id !== null &&
      req.query.owner_id !== ''
    ) {
      if (
        typeof req.query.owner_id !== 'string' ||
        (req.query.owner_id as string).trim().length === 0
      ) {
        console.log('[DEBUG] Invalid owner_id query parameter:', req.query.owner_id);
        return res.status(422).send({
          error: 'Invalid query parameter',
          message: 'owner_id must be a non-empty string',
        });
      }
    }

    // Validate tournament_id query parameter if provided
    if (
      req.query.tournament_id !== undefined &&
      req.query.tournament_id !== null &&
      req.query.tournament_id !== ''
    ) {
      if (
        typeof req.query.tournament_id !== 'string' ||
        (req.query.tournament_id as string).trim().length === 0
      ) {
        console.log('[DEBUG] Invalid tournament_id query parameter:', req.query.tournament_id);
        return res.status(422).send({
          error: 'Invalid query parameter',
          message: 'tournament_id must be a non-empty string',
        });
      }
    }

    const existingLeague = database.select().from(leagues);

    const allowedFilters = ['entry_fee', 'owner_id', 'tournament_id'];
    const filters = [];

    allowedFilters.forEach(filter => {
      const currentFilter = req.query[filter];
      if (currentFilter) {
        filters.push(eq(leagues[filter], currentFilter));
      }
    });

    let finalResult: League[] | null = null;
    if (filters.length > 0) {
      finalResult = await existingLeague
        .where(filters.length > 1 ? and(...filters) : filters[0])
        .execute();
    } else {
      finalResult = await existingLeague.execute();
    }
    if (finalResult.length !== 0 && req.query.search_term !== undefined) {
      finalResult = finalResult.filter(
        league =>
          league.name.toLowerCase().includes((req.query.search_term as string).toLowerCase()) ||
          league.description
            .toLowerCase()
            .includes((req.query.search_term as string).toLowerCase()),
      );
    }

    // TODO: should we return finished leagues or only leagues in progress?
    return res.status(200).send({ data: finalResult });
  } catch (error: any) {
    console.log(`GET ALL Leagues ADMIN ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getAllLeaguesAdminHandler.apiDescription = {
  summary: 'Get all leagues (Admin)',
  description:
    'Admin endpoint to retrieve all leagues with optional filtering by owner, entry fee, tournament, or search term.',
  operationId: 'adminGetAllLeagues',
  tags: ['admin', 'leagues'],
  responses: {
    200: {
      description: 'Leagues retrieved successfully',
      content: {
        'application/json': {
          schema: arrayDataWrapper(leagueSchema),
        },
      },
    },
    403: standardResponses[403],
    500: standardResponses[500],
  },
  parameters: [
    {
      name: 'owner_id',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        format: 'uuid',
      },
      description: 'Filter leagues by owner ID',
      example: 'user_abc123',
    },
    {
      name: 'search_term',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'Search term to filter leagues by name or description',
      example: 'Masters',
    },
    {
      name: 'tournament_id',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        format: 'uuid',
      },
      description: 'Filter leagues by tournament ID',
      example: 'tournament_masters2025',
    },
    {
      name: 'entry_fee',
      in: 'query',
      required: false,
      schema: {
        type: 'integer',
        minimum: 0,
      },
      description: 'Filter leagues by entry fee',
      example: 100,
    },
  ],
  security: [apiKeyAuth],
};
