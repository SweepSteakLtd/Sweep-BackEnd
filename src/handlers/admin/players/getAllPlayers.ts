import { eq, inArray } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Player, players, Tournament, tournaments } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, arrayDataWrapper, playerSchema, standardResponses } from '../../schemas';

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
  summary: 'Get players by tournament (Admin)',
  description:
    'Admin endpoint to retrieve players filtered by tournament ID or all players if no tournament ID provided.',
  operationId: 'adminGetPlayersByTournament',
  tags: ['admin', 'players'],
  responses: {
    200: {
      description: 'Players retrieved successfully',
      content: {
        'application/json': {
          schema: arrayDataWrapper(playerSchema),
          examples: {
            tournamentPlayers: {
              summary: 'Players from specific tournament',
              value: {
                data: [
                  {
                    id: 'player_abc123',
                    external_ids: { datagolf: 27644 },
                    level: 4,
                    current_score: -5,
                    position: 12,
                    attempts: { '1': 3, '2': 4, '3': 3 },
                    missed_cut: false,
                    odds: 15.5,
                    profile_id: 'profile_tiger_woods',
                    created_at: '2025-01-10T00:00:00Z',
                    updated_at: '2025-01-20T10:00:00Z',
                  },
                  {
                    id: 'player_def456',
                    external_ids: { datagolf: 10959 },
                    level: 5,
                    current_score: -8,
                    position: 3,
                    attempts: { '1': 2, '2': 3, '3': 4 },
                    missed_cut: false,
                    odds: 8.2,
                    profile_id: 'profile_rory_mcilroy',
                    created_at: '2025-01-10T00:00:00Z',
                    updated_at: '2025-01-20T10:00:00Z',
                  },
                ],
              },
            },
          },
        },
      },
    },
    422: standardResponses[422],
    403: standardResponses[403],
    500: standardResponses[500],
  },
  parameters: [
    {
      name: 'tournament_id',
      in: 'path',
      required: false,
      schema: {
        type: 'string',
        format: 'uuid',
      },
      description: 'Filter players by tournament ID. If not provided, returns all players.',
      example: 'tournament_masters2025',
    },
  ],
  security: [apiKeyAuth],
};
