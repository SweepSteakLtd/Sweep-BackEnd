import { NextFunction, Request, Response } from 'express';
import { mockGames } from '../../models/__mocks';

/**
 * Create game (authenticated endpoint)
 * @body name - string - required
 * @body description - string - optional
 * @body entry_fee - number - required
 * @body contact_phone - string - optional
 * @body contact_email - string - optional
 * @body contact_visibility - boolean - optional
 * @body join_code - string - optional
 * @body max_participants - number - optional
 * @body rewards - array - optional
 * @body start_time - string - required
 * @body end_time - string - required
 * @body owner_id - string - required
 * @body tournament_id - string - required
 * @body user_id_list - array - optional
 * @returns Game
 */
export const createGameHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(201).send({ data: mockGames[0], is_mock: true });
  } catch (error: any) {
    console.log(`CREATE GAME ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

createGameHandler.apiDescription = {
  responses: {
    201: {
      description: '201 Created',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              entry_fee: { type: 'number' },
              contact_phone: { type: 'string' },
              contact_email: { type: 'string' },
              contact_visibility: { type: 'boolean' },
              join_code: { type: 'string' },
              max_participants: { type: 'number' },
              rewards: { type: 'array' },
              start_time: { type: 'string' },
              end_time: { type: 'string' },
              owner_id: { type: 'string' },
              tournament_id: { type: 'string' },
              user_id_list: { type: 'array' },
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
};
