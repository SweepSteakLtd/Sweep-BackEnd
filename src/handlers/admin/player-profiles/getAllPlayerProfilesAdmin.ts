import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { playerProfiles } from '../../../models';
import { database } from '../../../services';

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
  responses: {
    responses: {
      200: {
        description: '200 OK',
        content: {
          'application/json': {
            schema: {
              type: 'array',
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
        description: 'Country of the player profiles to fetch',
      },
    ],
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  },
};
