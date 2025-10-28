import { createId } from '@paralleldrive/cuid2';
import { NextFunction, Request, Response } from 'express';
import { Player, players } from '../../../models';
import { database } from '../../../services';

/**
 * Create player (admin endpoint)
 * @body external_id - string - required
 * @body level - number - required
 * @body current_score - number - optional
 * @body position - number - optional
 * @body attempts - array - optional
 * @body missed_cut - boolean - optional
 * @body odds - number - optional
 * @body profile_id - string - required
 * @returns Player
 */
export const createPlayerHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requiredProperties = ['level', 'external_id', 'profile_id'];

    for (const field of requiredProperties) {
      if (!req.body[field]) {
        console.log(`[DEBUG] Missing required field: ${field}`);
        return res.status(422).send({
          error: 'Invalid request body',
          message: `Missing required field: ${field}`,
        });
      }
    }

    const requestBodyPlayer: Player = req.body;

    const createdPlayer: Player = {
      id: createId(),
      external_id: requestBodyPlayer.external_id,
      level: requestBodyPlayer.level,
      current_score: requestBodyPlayer.current_score,
      position: requestBodyPlayer.position,
      attempts: requestBodyPlayer.attempts,
      missed_cut: requestBodyPlayer.missed_cut,
      odds: requestBodyPlayer.odds,
      profile_id: requestBodyPlayer.profile_id,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await database.insert(players).values(createdPlayer).execute();
    return res.status(201).send({ data: createdPlayer });
  } catch (error: any) {
    console.log(`CREATE PLAYER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
createPlayerHandler.apiDescription = {
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
              level: { type: 'integer' },
              current_score: { type: 'integer' },
              position: { type: 'integer' },
              attempts: { type: 'array' },
              missed_cut: { type: 'boolean' },
              odds: { type: 'integer' },
              profile_id: { type: 'string' },
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
          external_id: 'www.google.com',
          level: 1,
          current_score: 5,
          position: 1,
          attempts: [],
          missed_cut: true,
          odds: 0.2,
          profile_id: 'profile id',
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
