import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { League, leagues } from '../../models';
import { database } from '../../services';

/**
 * Get all leagues (authenticated endpoint)
 * @returns league[]
 */
export const getAllLeaguesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existingleague = database.select().from(leagues);

    const allowedFilters = ['entry_fee', 'tournament_id'];
    const filters = [];

    allowedFilters.forEach(filter => {
      const currentFilter = req.query[filter];
      if (currentFilter) {
        filters.push(eq(leagues[filter], currentFilter));
      }
    });

    let finalResult: League[] | null = null;
    if (filters.length > 0) {
      finalResult = await existingleague
        .where(filters.length > 1 ? and(...filters) : filters[0])
        .execute();
    } else {
      finalResult = await existingleague.execute();
    }
    if (finalResult.length !== 0 && req.query.search_term !== undefined) {
      finalResult = finalResult.filter(
        league =>
          league.name.toLowerCase().includes((req.query.search_term as string).toLowerCase()) ||
          league.description.toLowerCase().includes((req.query.search_term as string).toLowerCase()),
      );
    }

    // TODO: should we return finished leagues or only leagues in progress?
    return res.status(200).send({ data: finalResult });
  } catch (error: any) {
    console.log(`GET ALL leagueS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getAllLeaguesHandler.apiDescription = {
  responses: {
    200: {
      description: '200 OK',
      content: {
        'application/json': {
          schema: {
            type: 'array',
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
  parameters: [
    {
      name: 'search_term',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'Search term to filter leagues by name or description',
    },
    {
      name: 'tournament_id',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'Filter leagues by tournament ID',
    },
    {
      name: 'entry_fee',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'Filter leagues by entry fee',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
