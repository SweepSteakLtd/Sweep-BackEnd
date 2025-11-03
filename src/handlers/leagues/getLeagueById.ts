import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { bets, leagues, tournaments } from '../../models';
import { database } from '../../services';

/**
 * Get league by ID (authenticated endpoint)
 * @params id - required
 * @returns league with Tournament and Bets
 */
export const getLeagueByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.id) {
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    const existingLeague = await database
      .select()
      .from(leagues)
      .where(eq(leagues.id, req.params.id))
      .limit(1)
      .execute();

    if (existingLeague.length === 0) {
      return res.status(403).send({ error: 'Missing league', message: "league doesn't exist" });
    }

    const fetchedTournaments = await database
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, existingLeague[0].tournament_id))
      .limit(1)
      .execute();
    const fetchedBets = await database
      .select()
      .from(bets)
      .where(eq(bets.league_id, existingLeague[0].id))
      .limit(1)
      .execute();

    const leagueData = {
      league: existingLeague[0],
      tournament: fetchedTournaments[0] || {},
      user_bets: fetchedBets,
    };
    return res.status(200).send({ data: leagueData });
  } catch (error: any) {
    console.log(`GET GAME BY ID ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getLeagueByIdHandler.apiDescription = {
  responses: {
    200: {
      description: '200 OK',
      content: {
        'application/json': {
          schema: {
            type: 'object',
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
    422: {
      description: '422 validation Error',
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
      name: 'id',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
      },
      description: 'ID of the game to retrieve',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
