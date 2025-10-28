import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { PlayerProfile, playerProfiles, User } from '../../models';
import { database } from '../../services';

/**
 * Get player profiles (authenticated endpoint)
 * @query country - optional
 * @returns PlayerProfile[]
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

    return res.status(200).send({ data: existingPlayerProfiles });
  } catch (error: any) {
    console.log(`GET PLAYER PROFILES ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getPlayerProfilesHandler.apiDescription = {
  responses: {
    200: {
      description: '200 OK',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                external_id: { type: 'string' },
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                country: { type: 'string' },
                age: { type: 'integer' },
                ranking: { type: 'integer' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' },
              },
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
  parameters: [
    {
      name: 'country',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'filter player profiles by country',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
