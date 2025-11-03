import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { League, leagues } from '../../models';
import { database } from '../../services';

/**
 * Update game (authenticated endpoint)
 * @params id - required
 * @body name - string - optional
 * @body description - string - optional
 * @body entry_fee - number - optional
 * @body contact_phone - string - optional
 * @body contact_email - string - optional
 * @body contact_visibility - boolean - optional
 * @body max_participants - number - optional
 * @body rewards - array - optional
 * @body start_time - string - optional
 * @body end_time - string - optional
 * @body owner_id - string - optional
 * @body tournament_id - string - optional
 * @body user_id_list - array - optional
 * @returns Game
 */
export const updateGameHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user;
    const propertiesAvailableForUpdate = [
      'name',
      'description',
      'entry_fee',
      'contact_phone',
      'contact_email',
      'contact_visibility',
      'max_participants',
      'rewards',
      'start_time',
      'end_time',
      'tournament_id',
      'user_id_list',
      'type',
    ];

    const { id } = req.params;

    if (!id) {
      console.log('[debug] missing id in request params');
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    const updateObject: Partial<League> = {};

    Object.entries(req.body).forEach(([key, value]) => {
      if (propertiesAvailableForUpdate.includes(key)) {
        if ((key === 'start_time' || key === 'end_time') && typeof value === 'string') {
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
      .update(leagues)
      .set(updateObject)
      .where(and(eq(leagues.id, id), eq(leagues.owner_id, user.id)))
      .execute();

    return res.status(200).send({ data: finishedUpdatedObject });
  } catch (error: any) {
    console.log(`UPDATE GAME ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

updateGameHandler.apiDescription = {
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
      description: 'ID of the game to update',
    },
  ],
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
          max_participants: 50,
          rewards: [],
          start_time: 'today',
          end_time: 'yesterday',
          type: 'public',
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
