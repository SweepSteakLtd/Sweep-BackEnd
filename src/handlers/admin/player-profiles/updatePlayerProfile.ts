import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { PlayerProfile, playerProfiles } from '../../../models';
import { database } from '../../../services';
import {
  apiKeyAuth,
  arrayDataWrapper,
  playerProfileSchema,
  standardResponses,
} from '../../schemas';

/**
 * Update player profile (admin endpoint)
 * @params id - required
 * @body external_id - string - optional
 * @body first_name - string - optional
 * @body last_name - string - optional
 * @body country - string - optional
 * @body age - number -
 * @body ranking - optional
 * @returns PlayerProfile
 */
export const updatePlayerProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const propertiesAvailableForUpdate = [
      'external_id',
      'first_name',
      'last_name',
      'country',
      'age',
      'ranking',
    ];

    const playerProfileId = req.params.id;

    if (!playerProfileId) {
      console.log('[DEBUG] missing id in request params');
      return res
        .status(422)
        .send({ error: 'Invalid request params', message: 'required properties missing' });
    }

    const updateObject: Partial<PlayerProfile> = {};

    Object.entries(req.body).forEach(([key, value]) => {
      if (propertiesAvailableForUpdate.includes(key)) {
        updateObject[key] = value;
      }
    });

    if (!Object.keys(updateObject).length) {
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    updateObject['updated_at'] = new Date();

    await database
      .update(playerProfiles)
      .set(updateObject)
      .where(eq(playerProfiles.id, playerProfileId))
      .execute();

    const existingPlayerProfile = await database
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.id, playerProfileId))
      .execute();

    return res.status(200).send({ data: existingPlayerProfile });
  } catch (error: any) {
    console.log(`UPDATE PLAYER PROFILE ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
updatePlayerProfileHandler.apiDescription = {
  summary: 'Update player profile (Admin)',
  description: 'Admin endpoint to update player profile information by ID.',
  operationId: 'adminUpdatePlayerProfile',
  tags: ['admin', 'player-profiles'],
  responses: {
    200: {
      description: 'Player profile updated successfully',
      content: {
        'application/json': {
          schema: arrayDataWrapper(playerProfileSchema),
          examples: {
            success: {
              summary: 'Updated player profile',
              value: {
                data: [
                  {
                    id: 'profile_abc123',
                    external_id: 'ext_tiger_woods',
                    first_name: 'Tiger',
                    last_name: 'Woods',
                    country: 'USA',
                    age: 49,
                    ranking: 1100,
                    created_at: '2025-01-20T10:00:00Z',
                    updated_at: '2025-01-22T14:30:00Z',
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
      name: 'id',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
        format: 'uuid',
      },
      description: 'Unique identifier of the player profile to update',
      example: 'profile_abc123',
    },
  ],
  requestBody: {
    description: 'Player profile update details. At least one field must be provided.',
    required: false,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          minProperties: 1,
          properties: {
            external_id: { type: 'string', nullable: true, description: 'External API identifier' },
            first_name: { type: 'string', minLength: 1, maxLength: 100, description: 'First name' },
            last_name: { type: 'string', minLength: 1, maxLength: 100, description: 'Last name' },
            country: { type: 'string', pattern: '^[A-Z]{2,3}$', description: 'ISO country code' },
            age: { type: 'integer', minimum: 16, maximum: 100, description: 'Age in years' },
            ranking: { type: 'integer', minimum: 1, description: 'World ranking position' },
          },
        },
        examples: {
          updateRanking: {
            summary: 'Update ranking',
            value: {
              ranking: 1100,
            },
          },
          updateAge: {
            summary: 'Update age',
            value: {
              age: 49,
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
