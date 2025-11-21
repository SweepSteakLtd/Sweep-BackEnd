import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { PlayerProfile, playerProfiles, User } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, arrayDataWrapper, playerProfileSchema, standardResponses } from '../schemas';

/**
 * Get player profiles (authenticated endpoint)
 * @query country - optional
 * @returns Array<{ name: string, players: PlayerProfile[] }>
 */
export const getPlayerProfilesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user: User = res.locals.user;
    const country = req.query.country as string;
    let existingPlayerProfiles: PlayerProfile[] = [];

    if (country) {
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
    'Retrieves player profiles grouped by their group field, with optional country filtering. Returns biographical information for professional golfers organized by group.',
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
