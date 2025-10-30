import { inArray } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { players, tournamentAd, tournamentHole, tournaments } from '../../../models';
import { database } from '../../../services';

/**
 * Get all tournaments (admin endpoint)
 * @query status - optional (upcoming|ongoing|finished)
 * @returns Tournament[]
 */
export const getAllTournamentsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // fetch tournaments
    const allTournaments = await database.select().from(tournaments).execute();

    // optional status filter handled in-memory
    const status = (req.query.status as string) || '';
    const now = new Date();

    const filtered = allTournaments.filter(t => {
      if (!status) return true;
      const startsAt = new Date(t.starts_at);
      const finishesAt = new Date(t.finishes_at);
      if (status === 'upcoming') {
        return startsAt > now;
      }
      if (status === 'ongoing') {
        return startsAt <= now && finishesAt > now;
      }
      if (status === 'finished') {
        return finishesAt <= now;
      }
      return true;
    });

    // resolve related entities for each tournament
    const results = await Promise.all(
      filtered.map(async tournament => {
        // holes
        const holes =
          tournament.holes && tournament.holes.length
            ? await database
                .select()
                .from(tournamentHole)
                .where(inArray(tournamentHole.id, tournament.holes))
                .execute()
            : [];

        // ads
        const ads =
          tournament.ads && tournament.ads.length
            ? await database
                .select()
                .from(tournamentAd)
                .where(inArray(tournamentAd.id, tournament.ads))
                .execute()
            : [];

        // players
        const resolvedPlayers =
          tournament.players && tournament.players.length
            ? await database
                .select()
                .from(players)
                .where(inArray(players.id, tournament.players))
                .execute()
            : [];

        return {
          ...tournament,
          holes,
          ads,
          players: resolvedPlayers,
        };
      }),
    );

    return res.status(200).send({ data: results });
  } catch (error: any) {
    console.log(`GET ALL TOURNAMENTS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
getAllTournamentsHandler.apiDescription = {
  responses: {
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
      parameters: [
        {
          name: 'country',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
          },
          description: 'Country of the player profiles to fetch',
        },
      ],
      security: [
        {
          ApiKeyAuth: [],
        },
      ],
    },
  },
  parameters: [
    {
      name: 'status',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'filter tournaments by status',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
