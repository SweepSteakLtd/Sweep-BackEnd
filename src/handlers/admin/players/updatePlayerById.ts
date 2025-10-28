import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Player, players } from '../../../models';
import { database } from '../../../services';

/**
 * Update player by ID (admin endpoint)
 * @params id - required
 * @body external_id - string - optional
 * @body level - number - optional
 * @body current_score - number - optional
 * @body position - number - optional
 * @body attempts - array - optional
 * @body missed_cut - boolean - optional
 * @body odds - number - optional
 * @body profile_id - string - optional
 * @returns Player
 */
export const updatePlayerByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propertiesAvailableForUpdate = [
      'external_id',
      'level',
      'current_score',
      'position',
      'attempts',
      'missed_cut',
      'odds',
      'profile_id',
    ];

    const { id } = req.params;

    if (!id) {
      console.log('[debug] missing id in request params');
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    const updateObject: Partial<Player> = {};

    Object.entries(req.body).forEach(([key, value]) => {
      if (propertiesAvailableForUpdate.includes(key)) {
        updateObject[key] = value as any;
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
      .update(players)
      .set(updateObject)
      .where(eq(players.id, id))
      .execute();

    return res.status(200).send({ data: finishedUpdatedObject });
  } catch (error: any) {
    console.log(`UPDATE PLAYER BY ID ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
updatePlayerByIdHandler.apiDescription = {
  responses: {
    200: { description: '200 OK' },
    403: { description: '403 Forbidden' },
    422: { description: '422 Validation Error' },
    500: { description: '500 Internal Server Error' },
  },
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
      },
      description: 'ID of the player to update',
    },
  ],
  requestBody: {
    content: {
      'application/json': {
        example: {
          external_id: 'external id',
          level: 1,
          current_score: 2,
          position: 3,
          attemps: [],
          missed_cut: true,
          odds: 1,
          profile_id: 'profile_id',
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
