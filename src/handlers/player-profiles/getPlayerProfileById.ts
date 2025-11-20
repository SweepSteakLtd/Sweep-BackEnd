import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { playerProfiles } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, dataWrapper, playerProfileSchema, standardResponses } from '../schemas';

/**
 * Get player profile by ID (authenticated endpoint)
 * @params id - required
 * @returns PlayerProfile
 */
export const getPlayerProfileByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      console.log('[DEBUG] missing id in request params');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Missing required parameter: id',
      });
    }

    if (typeof id !== 'string' || id.trim().length === 0) {
      console.log('[DEBUG] Invalid id: must be non-empty string');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'id must be a non-empty string',
      });
    }

    const existingPlayerProfile = await database
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.id, id))
      .limit(1)
      .execute();

    if (!existingPlayerProfile.length) {
      console.log('[DEBUG] Player profile not found:', id);
      return res.status(404).send({
        error: 'Not found',
        message: 'Player profile not found',
      });
    }

    return res.status(200).send({ data: existingPlayerProfile[0] });
  } catch (error: any) {
    console.log(`GET PLAYER PROFILE BY ID ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getPlayerProfileByIdHandler.apiDescription = {
  summary: 'Get player profile by ID',
  description:
    'Retrieves detailed information about a specific player profile. Returns biographical information for a professional golfer.',
  operationId: 'getPlayerProfileById',
  tags: ['player-profiles'],
  responses: {
    200: {
      description: 'Player profile retrieved successfully',
      content: {
        'application/json': {
          schema: dataWrapper(playerProfileSchema),
          examples: {
            success: {
              summary: 'Player profile retrieved',
              value: {
                data: {
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
              },
            },
          },
        },
      },
    },
    404: standardResponses[404],
    422: standardResponses[422],
    403: standardResponses[403],
    500: standardResponses[500],
  },
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
      },
      description: 'Unique identifier of the player profile to retrieve',
      example: 'profile_abc123',
    },
  ],
  security: [apiKeyAuth],
};
