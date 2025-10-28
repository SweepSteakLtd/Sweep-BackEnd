import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { PlayerProfile, playerProfiles } from '../../../models';
import { database } from '../../../services';

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
  responses: {
    200: {
      description: '200 Created',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              external_id: { type: 'string' },
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              country: { type: 'string' },
              age: { type: 'number' },
              ranking: { type: 'number' },
              created_at: { type: 'string' },
              updated_at: { type: 'string' },
            },
          },
        },
      },
    },
    403: {
      description: '403 Forbidden',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    422: {
      description: '422 Validation Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'array' },
            },
          },
        },
      },
    },
    500: {
      description: '500 Internal Server Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
  requestBody: {
    content: {
      'application/json': {
        example: {
          external_id: 'ext-12345',
          first_name: 'John',
          last_name: 'Doe',
          country: 'USA',
          age: 25,
          ranking: 1500,
        },
      },
    },
    required: true,
  },
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
