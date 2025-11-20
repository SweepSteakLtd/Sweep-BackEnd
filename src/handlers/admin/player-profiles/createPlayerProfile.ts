import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { playerProfiles } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, dataWrapper, playerProfileSchema, standardResponses } from '../../schemas';

/**
 * Create player profile (admin endpoint)
 * @body external_id - string - optional
 * @body first_name - string - required
 * @body last_name - string - required
 * @body country - string - required
 * @body age - number - required
 * @body ranking - number - required
 * @body profile_picture - string - required
 * @returns PlayerProfile
 */
export const createPlayerProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requiredProperties = [
      'first_name',
      'last_name',
      'country',
      'age',
      'ranking',
      'profile_picture',
    ];

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
      external_id: req.body.external_id || '',
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      country: req.body.country,
      age: req.body.age,
      ranking: req.body.ranking,
      profile_picture: req.body.profile_picture,
      group: req.body.group || '',
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
  summary: 'Create player profile (Admin)',
  description: 'Admin endpoint to create a new player profile with biographical information.',
  operationId: 'adminCreatePlayerProfile',
  tags: ['admin', 'player-profiles'],
  responses: {
    201: {
      description: 'Player profile created successfully',
      content: {
        'application/json': {
          schema: dataWrapper(playerProfileSchema),
          examples: {
            success: {
              summary: 'Created player profile',
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
                  created_at: '2025-01-20T10:00:00Z',
                  updated_at: '2025-01-20T10:00:00Z',
                },
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
  requestBody: {
    description: 'Player profile creation details.',
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['first_name', 'last_name', 'country', 'age', 'ranking', 'profile_picture'],
          properties: {
            external_id: { type: 'string', default: '', description: 'External API identifier' },
            first_name: { type: 'string', minLength: 1, maxLength: 100, description: 'First name' },
            last_name: { type: 'string', minLength: 1, maxLength: 100, description: 'Last name' },
            country: {
              type: 'string',
              pattern: '^[A-Z]{2,3}$',
              description: 'ISO country code (2-3 letters)',
            },
            age: { type: 'integer', minimum: 18, maximum: 100, description: 'Age in years' },
            ranking: { type: 'integer', minimum: 1, description: 'World ranking position' },
            profile_picture: { type: 'string', description: 'Profile picture URL' },
            group: { type: 'string', default: '', description: 'Player group' },
          },
        },
        examples: {
          newProfile: {
            summary: 'Create new golfer profile',
            value: {
              external_id: 'ext_tiger_woods',
              first_name: 'Tiger',
              last_name: 'Woods',
              country: 'USA',
              age: 48,
              ranking: 1250,
              profile_picture: 'https://example.com/tiger-woods.jpg',
              group: 'A',
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
