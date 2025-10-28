import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { playerProfiles } from '../../../models';
import { database } from '../../../services';

/**
 * Create player profile (admin endpoint)
 * @body external_id - string - optional
 * @body first_name - string - required
 * @body last_name - string - required
 * @body country - string - required
 * @body age - number - required
 * @body ranking - number - required
 * @returns PlayerProfile
 */
export const createPlayerProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requiredProperties = ['first_name', 'last_name', 'country', 'age', 'ranking'];

    for (const property of requiredProperties) {
      if (!req.body[property]) {
        console.log(`[DEBUG] missing ${property} in request body`);
        return res
          .status(422)
          .send({ error: 'Invalid request body', message: 'required properties missing' });
      }
    }

    // If all required properties are present, create the player profile
    const newPlayerProfile = {
      external_id: req.body.external_id || null,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      country: req.body.country,
      age: req.body.age,
      ranking: req.body.ranking,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const existingPlayer = await database
      .select(playerProfiles)
      .where(
        and(
          eq(playerProfiles.first_name, newPlayerProfile.first_name),
          eq(playerProfiles.last_name, newPlayerProfile.last_name),
          eq(playerProfiles.country, newPlayerProfile.country),
          eq(playerProfiles.age, newPlayerProfile.age),
        ),
      )
      .execute();

    if (existingPlayer.length > 0) {
      return res.status(422).send({
        error: 'Player profile already exists',
        message: 'A player profile with the same informations already exists in the system',
      });
    }

    await database.insert(playerProfiles).values(newPlayerProfile).execute();

    return res.status(201).send({ data: newPlayerProfile });
  } catch (error: any) {
    console.log(`CREATE PLAYER PROFILE ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

createPlayerProfileHandler.apiDescription = {
  responses: {
    201: {
      description: '201 Created',
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
