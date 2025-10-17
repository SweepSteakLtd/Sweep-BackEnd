import { createId } from '@paralleldrive/cuid2';
import { NextFunction, Request, Response } from 'express';
import { Game, games } from '../../models';
import { database } from '../../services';

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
    const { name, entry_fee, start_time, end_time, tournament_id } = req.body as Game;
    // TODO: total pot size filter

    if (!name || !entry_fee || !start_time || !end_time || !tournament_id) {
      console.log('[debug]');
      return res.status(422).send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    const gameObject: Game = {
      id: createId(),
      name,
      description: req.body.description,
      entry_fee,
      contact_phone: req.body.contact_phone,
      contact_email: req.body.contact_email,
      contact_visibility: req.body.contact_visibility,
      join_code: req.body.join_code, // TODO: should this be created on BE or FE. If BE what is the format
      max_participants: req.body.max_participants,
      rewards: req.body.rewards,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      owner_id: res.locals.user.id,
      tournament_id,
      user_id_list: req.body.user_id_list,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await database.insert(games).values(gameObject).execute();

    return res.status(201).send({ data: gameObject });
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
  requestBody: {
    content: {
      'application/json': {
        example: {
          name: 'ultimate game',
          description: 'this is newly created game',
          entry_fee: 2555,
          contact_phone: '12345678',
          contact_email: 'example@sweepstake.com',
          contact_visibility: true,
          join_code: '1337',
          max_participants: 50,
          rewards: [
            {
              position: 1,
              percentage: 50,
              type: 'cash',
              product_id: '',
            },
          ],
          start_time: 'today',
          end_time: 'yesterday',
          owner_id: '42',
          tournament_id: '43',
          user_id_list: [],
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
