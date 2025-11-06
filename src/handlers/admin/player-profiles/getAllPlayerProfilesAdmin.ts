import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { playerProfiles } from '../../../models';
import { database } from '../../../services';
import {
  apiKeyAuth,
  arrayDataWrapper,
  playerProfileSchema,
  standardResponses,
} from '../../schemas';

/**
 * Get all player profiles (admin endpoint)
 * @query country - optional
 * @returns PlayerProfile[]
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

    return res.status(200).send({ data: existingUsers });
  } catch (error: any) {
    console.log(`GET ALL PLAYER PROFILES ADMIN ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
getAllPlayerProfilesAdminHandler.apiDescription = {
  summary: 'Get all player profiles (Admin)',
  description: 'Admin endpoint to retrieve all player profiles with optional country filtering.',
  operationId: 'adminGetAllPlayerProfiles',
  tags: ['admin', 'player-profiles'],
  responses: {
    200: {
      description: 'Player profiles retrieved successfully',
      content: {
        'application/json': {
          schema: arrayDataWrapper(playerProfileSchema),
          examples: {
            allProfiles: {
              summary: 'Multiple player profiles',
              value: {
                data: [
                  {
                    id: 'profile_abc123',
                    external_id: 'ext_tiger_woods',
                    first_name: 'Tiger',
                    last_name: 'Woods',
                    country: 'USA',
                    age: 48,
                    ranking: 1250,
                    created_at: '2025-01-01T00:00:00Z',
                    updated_at: '2025-01-20T10:00:00Z',
                  },
                  {
                    id: 'profile_def456',
                    external_id: 'ext_rory_mcilroy',
                    first_name: 'Rory',
                    last_name: 'McIlroy',
                    country: 'NIR',
                    age: 34,
                    ranking: 3,
                    created_at: '2025-01-01T00:00:00Z',
                    updated_at: '2025-01-20T10:00:00Z',
                  },
                ],
              },
            },
            filteredByCountry: {
              summary: 'Players from specific country',
              value: {
                data: [
                  {
                    id: 'profile_abc123',
                    external_id: 'ext_tiger_woods',
                    first_name: 'Tiger',
                    last_name: 'Woods',
                    country: 'USA',
                    age: 48,
                    ranking: 1250,
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
