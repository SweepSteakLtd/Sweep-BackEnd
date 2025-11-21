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
          examples: {
            groupedProfiles: {
              summary: 'Player profiles grouped by group',
              value: {
                data: [
                  {
                    name: 'A',
                    players: [
                      {
                        id: 'profile_abc123',
                        external_id: 'ext_tiger_woods',
                        first_name: 'Tiger',
                        last_name: 'Woods',
                        country: 'USA',
                        age: 48,
                        ranking: 1250,
                        profile_picture: 'https://example.com/tiger-woods.jpg',
                        group: 'A',
                        created_at: '2025-01-01T00:00:00Z',
                        updated_at: '2025-01-20T10:00:00Z',
                      },
                    ],
                  },
                  {
                    name: 'B',
                    players: [
                      {
                        id: 'profile_def456',
                        external_id: 'ext_rory_mcilroy',
                        first_name: 'Rory',
                        last_name: 'McIlroy',
                        country: 'NIR',
                        age: 34,
                        ranking: 3,
                        profile_picture: 'https://example.com/rory-mcilroy.jpg',
                        group: 'B',
                        created_at: '2025-01-01T00:00:00Z',
                        updated_at: '2025-01-20T10:00:00Z',
                      },
                    ],
                  },
                ],
              },
            },
            filteredByCountry: {
              summary: 'Players from specific country grouped by group',
              value: {
                data: [
                  {
                    name: 'A',
                    players: [
                      {
                        id: 'profile_abc123',
                        external_id: 'ext_tiger_woods',
                        first_name: 'Tiger',
                        last_name: 'Woods',
                        country: 'USA',
                        age: 48,
                        ranking: 1250,
                        profile_picture: 'https://example.com/tiger-woods.jpg',
                        group: 'A',
                        created_at: '2025-01-01T00:00:00Z',
                        updated_at: '2025-01-20T10:00:00Z',
                      },
                    ],
                  },
                ],
              },
            },
          },
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
