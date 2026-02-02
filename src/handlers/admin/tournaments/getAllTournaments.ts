import { eq, inArray } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import {
  leagues,
  players,
  teams,
  tournamentAd,
  tournamentHole,
  tournaments,
} from '../../../models';
import { database } from '../../../services';
import { calculateTotalStaked } from '../../../utils';
import { apiKeyAuth, arrayDataWrapper, standardResponses, tournamentSchema } from '../../schemas';

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

          totalStaked += calculateTotalStaked(league.entry_fee, leagueTeams.length);
        }

        return {
          ...tournament,
          holes,
          ads,
          players: resolvedPlayers,
          is_live,
          is_finished,
          total_staked: totalStaked,
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
  summary: 'Get all tournaments (Admin)',
  description:
    'Admin endpoint to retrieve all tournaments with optional time-based status filtering (upcoming/ongoing/finished based on start/end dates). Returns tournaments with resolved holes, ads, and players. Note: This query parameter filters by time-based status, not the tournament.status database field (active/processing/finished/cancelled).',
  operationId: 'adminGetAllTournaments',
  tags: ['admin', 'tournaments'],
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
    500: standardResponses[500],
  },
  parameters: [
    {
      name: 'status',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        enum: ['upcoming', 'ongoing', 'finished'],
      },
      description:
        'Filter tournaments by time-based status: upcoming (starts_at > now), ongoing (starts_at <= now && finishes_at > now), finished (finishes_at <= now). This is different from the tournament.status database field which tracks reward processing status.',
      example: 'ongoing',
    },
  ],
  security: [apiKeyAuth],
};
