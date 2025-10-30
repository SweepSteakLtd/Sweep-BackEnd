import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Tournament, tournaments } from '../../../models';
import { database } from '../../../services';

/**
 * Update tournament (admin endpoint)
 * @params id - required
 * @body name - string - optional
 * @body starts_at - string - optional
 * @body finishes_at - string - optional
 * @body description - string - optional
 * @body url - string - optional
 * @body cover_picture - string - optional
 * @body gallery - array - optional
 * @body holes - array - optional
 * @body ads - array - optional
 * @body proposed_entry_fee - number - optional
 * @body maximum_cut_amount - number - optional
 * @body maximum_score_generator - number - optional
 * @body players - array - optional
 * @returns Tournament
 */
export const updateTournamentHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propertiesAvailableForUpdate: Array<keyof Tournament> = [
      'name',
      'description',
      'starts_at',
      'finishes_at',
      'url',
      'cover_picture',
      'gallery',
      'holes',
      'ads',
      'proposed_entry_fee',
      'maximum_cut_amount',
      'maximum_score_generator',
      'players',
    ];

    const { id } = req.params;

    if (!id) {
      console.log('[debug] missing id in request params');
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    const updateObject: Partial<Tournament> = {};

    Object.entries(req.body as Tournament).forEach(([key, value]) => {
      if (propertiesAvailableForUpdate.includes(key as keyof Tournament)) {
        if ((key === 'starts_at' || key === 'finishes_at') && typeof value === 'string') {
          updateObject[key] = new Date(value);
        } else {
          updateObject[key] = value;
        }
      }
    });

    if (!Object.keys(updateObject).length) {
      console.log('[debug] no valid properties to update in request body', updateObject);
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    updateObject['updated_at'] = new Date();

    const finishedUpdatedObject = await database
      .update(tournaments)
      .set(updateObject)
      .where(eq(tournaments.id, id))
      .execute();

    return res.status(200).send({ data: finishedUpdatedObject });
  } catch (error: any) {
    console.log(`UPDATE TOURNAMENT ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

updateTournamentHandler.apiDescription = {
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
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
      },
      description: 'ID of the tournament to update',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
