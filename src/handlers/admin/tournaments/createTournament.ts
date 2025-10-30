import { createId } from '@paralleldrive/cuid2';
import { NextFunction, Request, Response } from 'express';
import { Tournament, tournaments } from '../../../models';
import { database } from '../../../services';

/**
 * Create tournament (admin endpoint)
 * @body name - string - required
 * @body starts_at - string - required
 * @body finishes_at - string - required
 * @body description - string - optional
 * @body url - string - optional
 * @body cover_picture - string - optional
 * @body gallery - array - optional
 * @body holes - array - optional
 * @body ads - array - optional
 * @body proposed_entry_fee - number - required
 * @body maximum_cut_amount - number - required
 * @body maximum_score_generator - number - required
 * @body players - array - required
 * @returns Tournament
 */
export const createTournamentHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      starts_at,
      finishes_at,
      proposed_entry_fee,
      maximum_cut_amount,
      maximum_score_generator,
      players,
      description,
      url,
      cover_picture,
      gallery,
      holes,
      ads,
      name,
    } = req.body as Tournament;

    if (
      !starts_at ||
      !finishes_at ||
      proposed_entry_fee === undefined ||
      maximum_cut_amount === undefined ||
      maximum_score_generator === undefined ||
      !players ||
      players.length === 0
    ) {
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    if (starts_at < new Date()) {
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'Starting date cannot be in past' });
    }

    if (finishes_at < new Date()) {
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'End date cannot be in past' });
    }

    const createdObject: Tournament = {
      id: createId(),
      name,
      starts_at,
      finishes_at,
      proposed_entry_fee,
      maximum_cut_amount,
      maximum_score_generator,
      players,
      description,
      url,
      cover_picture,
      gallery,
      holes,
      ads,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await database.insert(tournaments).values(createdObject).execute();

    return res.status(201).send({ data: createdObject });
  } catch (error: any) {
    console.log(`CREATE TOURNAMENT ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
createTournamentHandler.apiDescription = {
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
              starts_at: { type: 'string' },
              finishes_at: { type: 'string' },
              proposed_entry_fee: { type: 'integer' },
              maximum_cut_amount: { type: 'integer' },
              maximum_score_generator: { type: 'integer' },
              players: { type: 'array' },
              url: { type: 'string' },
              cover_picture: { type: 'string' },
              gallery: { type: 'array' },
              holes: { type: 'array' },
              ads: { type: 'array' },
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
          name: 'super cool tournament',
          starts_at: new Date(),
          finishes_at: new Date(),
          proposed_entry_fee: 10,
          maximum_cut_amount: 200,
          maximum_score_generator: 10,
          players: ['player id'],
          description: 'this is description of super cool tournament',
          url: 'https://www.google.com',
          cover_picture: 'test image',
          gallery: ['image src'],
          holes: ['hole id'],
          ads: ['ad id'],
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
