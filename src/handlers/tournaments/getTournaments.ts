import { and, asc, eq, inArray } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { leagues, players, teams, Tournament, tournamentAd, tournamentHole, tournaments } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, arrayDataWrapper, standardResponses, tournamentSchema } from '../schemas';

/**
 * Get all tournaments (auth endpoint)
 * @query tour - optional - filter by tour type (pga, euro, kft, opp, alt, major)
 * @returns Tournament[]
 */
export const getTournamentsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tour } = req.query;

    const conditions = [];
    if (tour && typeof tour === 'string') {
      const validTours = ['pga', 'euro', 'kft', 'opp', 'alt', 'major'];
      if (validTours.includes(tour)) {
        conditions.push(eq(tournaments.tour, tour));
      }
    }

    const existingTournaments = await database
      .select()
      .from(tournaments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(tournaments.starts_at));

    const now = new Date();
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

        const startsAt = new Date(tournament.starts_at);
        const finishesAt = new Date(tournament.finishes_at);
        const is_live = startsAt <= now && finishesAt > now;
        const is_finished = finishesAt <= now;

        // Calculate total staked for this tournament
        const tournamentLeagues = await database
          .select()
          .from(leagues)
          .where(eq(leagues.tournament_id, tournament.id));

        let totalStaked = 0;
        for (const league of tournamentLeagues) {
          const leagueTeams = await database
            .select()
            .from(teams)
            .where(eq(teams.league_id, league.id));

          totalStaked += league.entry_fee * leagueTeams.length;
        }

        return {
          ...tournament,
          holes: existingHoles,
          ads: existingAds,
          players: existingPlayers,
          is_live,
          is_finished,
          totalStaked,
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
    'Retrieves all tournaments with complete details including holes, ads, and players. Each tournament includes its full nested data plus computed fields (is_live, is_finished, totalStaked). Optionally filter by tour type. The tournament.status field indicates reward processing status (active/processing/finished/cancelled).',
  operationId: 'getTournaments',
  tags: ['tournaments'],
  parameters: [
    {
      name: 'tour',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        enum: ['pga', 'euro', 'kft', 'opp', 'alt', 'major'],
      },
      description:
        'Filter tournaments by tour type: pga (PGA Tour), euro (European Tour), kft (Korn Ferry Tour), opp (opposite field), alt (alternate event), major (Major Championship)',
    },
  ],
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
