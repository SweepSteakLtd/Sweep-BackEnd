import { eq, inArray } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Player, players, Tournament, tournaments } from '../../../models';
import { database } from '../../../services';

/**
 * Get players by tournament (admin endpoint)
 * @params tournament_id - required
 * @returns Player[]
 */
export const getPlayersByTournamentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tournamentId = req.params.tournament_id;

    let result: Player[] = [];

    if (tournamentId) {
      const existingTournament: Tournament[] = await database
        .select(tournaments)
        .where(eq(tournaments.id, tournamentId))
        .execute();

      if (existingTournament.length === 0) {
        return res.status(422).send({
          error: 'Missing tournament',
          message: 'Tournament with provided ID doesnt exist',
        });
      }

      result = await database
        .select()
        .from(players)
        .where(inArray(players.id, existingTournament[0].players))
        .execute();
    } else {
      result = await database.select().from(players).execute();
    }

    return res.status(200).send({ data: result });
  } catch (error: any) {
    console.log(`GET PLAYERS BY TOURNAMENT ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getPlayersByTournamentHandler.apiDescription = {
  responses: {
    200: { description: '200 OK' },
    403: { description: '403 Forbidden' },
    500: { description: '500 Internal Server Error' },
  },
  parameters: [
    {
      name: 'tournament_id',
      in: 'param',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'Filter players by tournament ID',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
