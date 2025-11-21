import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { PlayerProfile, playerProfiles } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, playerProfileSchema, standardResponses } from '../../schemas';

/**
 * Get all player profiles (admin endpoint)
 * @query country - optional
 * @returns { data: Record<string, { players: PlayerProfile[] }> }
 */
export const getAllPlayerProfilesAdminHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const country = req.query.country as string | undefined;

    const existingUsers = await database
      .select()
      .from(playerProfiles)
      .where(country ? eq(playerProfiles.country, country) : undefined)
      .execute();

    // Group players by their group field
    const groupedPlayers = existingUsers.reduce(
      (acc: Record<string, { players: PlayerProfile[] }>, player: PlayerProfile) => {
        const groupName = player.group || 'Ungrouped';

        if (!acc[groupName]) {
          acc[groupName] = { players: [] };
        }

        acc[groupName].players.push(player);
        return acc;
      },
      {},
    );

    return res.status(200).send({ data: groupedPlayers });
  } catch (error: any) {
    console.log(`GET ALL PLAYER PROFILES ADMIN ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
getAllPlayerProfilesAdminHandler.apiDescription = {
  summary: 'Get all player profiles grouped by group (Admin)',
  description:
    'Admin endpoint to retrieve all player profiles grouped by their group field, with optional country filtering.',
  operationId: 'adminGetAllPlayerProfiles',
  tags: ['admin', 'player-profiles'],
  responses: {
    200: {
      description: 'Player profiles retrieved successfully, grouped by group',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                description: 'Groups indexed by group name',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    players: {
                      type: 'array',
                      items: playerProfileSchema,
                    },
                  },
                },
              },
            },
          },
          examples: {
            groupedProfiles: {
              summary: 'Player profiles grouped by group',
              value: {
                data: {
                  'Group A': {
                    players: [
                      {
                        id: 'profile_abc123',
                        external_id: 'ext_tiger_woods',
                        first_name: 'Tiger',
                        last_name: 'Woods',
                        country: 'USA',
                        age: 48,
                        ranking: 1250,
                        group: 'Group A',
                        created_at: '2025-01-01T00:00:00Z',
                        updated_at: '2025-01-20T10:00:00Z',
                      },
                    ],
                  },
                  'Group B': {
                    players: [
                      {
                        id: 'profile_def456',
                        external_id: 'ext_rory_mcilroy',
                        first_name: 'Rory',
                        last_name: 'McIlroy',
                        country: 'NIR',
                        age: 34,
                        ranking: 3,
                        group: 'Group B',
                        created_at: '2025-01-01T00:00:00Z',
                        updated_at: '2025-01-20T10:00:00Z',
                      },
                    ],
                  },
                },
              },
            },
            ungroupedPlayers: {
              summary: 'Players without a group',
              value: {
                data: {
                  Ungrouped: {
                    players: [
                      {
                        id: 'profile_xyz789',
                        external_id: 'ext_jordan_spieth',
                        first_name: 'Jordan',
                        last_name: 'Spieth',
                        country: 'USA',
                        age: 31,
                        ranking: 15,
                        group: '',
                        created_at: '2025-01-01T00:00:00Z',
                        updated_at: '2025-01-20T10:00:00Z',
                      },
                    ],
                  },
                },
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
