import { inArray } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { players, Tournament, tournamentAd, tournamentHole, tournaments } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, arrayDataWrapper, standardResponses, tournamentSchema } from '../schemas';

/**
 * Get all tournaments (auth endpoint)
 * @query status - optional
 * @returns Tournament[]
 */
export const getTournamentsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existingTournaments = await database.select().from(tournaments);

    const wholeTournaments = await Promise.all(
      existingTournaments.map(async (tournament: Tournament) => {
        const existingHoles = await database
          .select()
          .from(tournamentHole)
          .where(inArray(tournamentHole.id, tournament.holes));

        const existingAds = await database
          .select()
          .from(tournamentAd)
          .where(inArray(tournamentAd.id, tournament.ads));

        const existingPlayers = await database
          .select()
          .from(players)
          .where(inArray(players.id, tournament.players));

        return {
          ...tournament,
          holes: existingHoles,
          ads: existingAds,
          players: existingPlayers,
        };
      }),
    );

    return res.status(200).send({ data: wholeTournaments });
  } catch (error: any) {
    console.log(`GET ALL TOURNAMENTS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
getTournamentsHandler.apiDescription = {
  summary: 'Get all tournaments',
  description:
    'Retrieves all tournaments with complete details including holes, ads, and players. Each tournament includes its full nested data.',
  operationId: 'getTournaments',
  tags: ['tournaments'],
  responses: {
    200: {
      description: 'Tournaments retrieved successfully',
      content: {
        'application/json': {
          schema: arrayDataWrapper(tournamentSchema),
        },
      },
    },
    403: standardResponses[403],
    422: standardResponses[422],
    500: standardResponses[500],
  },
  security: [apiKeyAuth],
};
