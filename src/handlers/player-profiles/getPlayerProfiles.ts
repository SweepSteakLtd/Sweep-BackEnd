import { eq, inArray } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { PlayerProfile, playerProfiles, players, tournaments, User } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, arrayDataWrapper, playerProfileSchema, standardResponses } from '../schemas';

/**
 * Get player profiles (authenticated endpoint)
 * @query country - optional
 * @query tournament_id - optional - filter by tournament
 * @returns Array<{ name: string, players: PlayerProfile[] }>
 */
export const getPlayerProfilesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user: User = res.locals.user;
    const country = req.query.country as string;
    const tournament_id = req.query.tournament_id as string;
    let existingPlayerProfiles: PlayerProfile[] = [];

    // If tournament_id is provided, filter by tournament's players
    if (tournament_id) {
      // Get the tournament
      const tournament = await database
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, tournament_id))
        .limit(1)
        .execute();

      if (!tournament.length || !tournament[0].players || tournament[0].players.length === 0) {
        // No tournament or no players in tournament
        return res.status(200).send({ data: [] });
      }

      // Get players from tournament.players array
      const tournamentPlayerIds = tournament[0].players;

      const tournamentPlayers = await database
        .select()
        .from(players)
        .where(inArray(players.id, tournamentPlayerIds))
        .execute();
      if (tournamentPlayers.length === 0) {
        return res.status(200).send({ data: [] });
      }

      // Extract profile_ids from players
      const profileIds = tournamentPlayers.map((p: typeof players.$inferSelect) => p.profile_id);
      // Get player profiles
      if (country) {
        const allProfiles = await database
          .select()
          .from(playerProfiles)
          .where(eq(playerProfiles.country, country))
          .execute();

        // Filter by profile IDs
        existingPlayerProfiles = allProfiles.filter((profile: PlayerProfile) =>
          profileIds.includes(profile.id),
        );
      } else {
        existingPlayerProfiles = await database
          .select()
          .from(playerProfiles)
          .where(inArray(playerProfiles.id, profileIds))
          .execute();
      }
    } else if (country) {
      existingPlayerProfiles = await database
        .select()
        .from(playerProfiles)
        .where(eq(playerProfiles.country, country))
        .execute();
    } else {
      existingPlayerProfiles = await database.select().from(playerProfiles).execute();
    }

    const groupedPlayers = existingPlayerProfiles.reduce(
      (acc: Record<string, PlayerProfile[]>, player: PlayerProfile) => {
        const groupName = player.group || 'Ungrouped';

        if (!acc[groupName]) {
          acc[groupName] = [];
        }

        acc[groupName].push(player);
        return acc;
      },
      {},
    );

    // Convert to array format
    const groupedArray = Object.entries(groupedPlayers).map(([name, players]) => ({
      name,
      players,
    }));

    return res.status(200).send({ data: groupedArray });
  } catch (error: any) {
    console.log(`GET PLAYER PROFILES ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getPlayerProfilesHandler.apiDescription = {
  summary: 'Get player profiles grouped by group',
  description:
    'Retrieves player profiles grouped by their group field, with optional tournament and country filtering. Returns biographical information for professional golfers organized by group. When tournament_id is provided, only returns players participating in that tournament.',
  operationId: 'getPlayerProfiles',
  tags: ['player-profiles'],
  responses: {
    200: {
      description: 'Player profiles retrieved successfully, grouped by group',
      content: {
        'application/json': {
          schema: arrayDataWrapper({
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Group name',
              },
              players: {
                type: 'array',
                items: playerProfileSchema,
              },
            },
          }),
        },
      },
    },
    403: standardResponses[403],
    500: standardResponses[500],
  },
  parameters: [
    {
      name: 'tournament_id',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description:
        'Filter player profiles by tournament ID. Only returns players participating in the specified tournament.',
      example: 'tournament_abc123',
    },
    {
      name: 'country',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        pattern: '^[A-Z]{2,3}$',
      },
      description: 'Filter player profiles by ISO country code (2-3 letter code)',
      example: 'USA',
    },
  ],
  security: [apiKeyAuth],
};
