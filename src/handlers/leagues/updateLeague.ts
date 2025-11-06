import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { League, leagues } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, dataWrapper, leagueSchema, standardResponses } from '../schemas';

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
export const updateLeagueHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate user authentication
    if (!res.locals.user || !res.locals.user.id) {
      console.log('[DEBUG] Missing authenticated user information');
      return res.status(403).send({
        error: 'Forbidden',
        message: 'User authentication is required',
      });
    }

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
      console.log('[DEBUG] missing id in request params');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Missing required parameter: id',
      });
    }

    // Validate id is non-empty string
    if (typeof id !== 'string' || id.trim().length === 0) {
      console.log('[DEBUG] Invalid id: must be non-empty string');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'id must be a non-empty string',
      });
    }

    // Validate name if provided
    if (req.body.name !== undefined) {
      if (typeof req.body.name !== 'string' || req.body.name.trim().length === 0) {
        console.log('[DEBUG] Invalid name: must be non-empty string');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'name must be a non-empty string',
        });
      }
      if (req.body.name.length > 200) {
        console.log('[DEBUG] Invalid name: exceeds max length');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'name must not exceed 200 characters',
        });
      }
    }

    // Validate description if provided
    if (req.body.description !== undefined && req.body.description !== null) {
      if (typeof req.body.description !== 'string') {
        console.log('[DEBUG] Invalid description: must be string');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'description must be a string',
        });
      }
      if (req.body.description.length > 1000) {
        console.log('[DEBUG] Invalid description: exceeds max length');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'description must not exceed 1000 characters',
        });
      }
    }

    // Validate entry_fee if provided
    if (req.body.entry_fee !== undefined && req.body.entry_fee !== null) {
      if (typeof req.body.entry_fee !== 'number' || isNaN(req.body.entry_fee)) {
        console.log('[DEBUG] Invalid entry_fee: must be a number');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'entry_fee must be a number',
        });
      }
      if (req.body.entry_fee < 0) {
        console.log('[DEBUG] entry_fee must be non-negative');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'entry_fee must be non-negative',
        });
      }
    }

    // Validate contact_phone if provided
    if (
      req.body.contact_phone !== undefined &&
      req.body.contact_phone !== null &&
      req.body.contact_phone !== ''
    ) {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (typeof req.body.contact_phone !== 'string' || !phoneRegex.test(req.body.contact_phone)) {
        console.log('[DEBUG] Invalid contact_phone format:', req.body.contact_phone);
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'contact_phone must be in E.164 format (e.g., +12345678901)',
        });
      }
    }

    // Validate contact_email if provided
    if (
      req.body.contact_email !== undefined &&
      req.body.contact_email !== null &&
      req.body.contact_email !== ''
    ) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof req.body.contact_email !== 'string' || !emailRegex.test(req.body.contact_email)) {
        console.log('[DEBUG] Invalid contact_email format:', req.body.contact_email);
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'contact_email must be a valid email address',
        });
      }
    }

    // Validate contact_visibility if provided
    if (req.body.contact_visibility !== undefined && req.body.contact_visibility !== null) {
      if (typeof req.body.contact_visibility !== 'boolean') {
        console.log('[DEBUG] Invalid contact_visibility: must be boolean');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'contact_visibility must be a boolean',
        });
      }
    }

    // Validate max_participants if provided
    if (req.body.max_participants !== undefined && req.body.max_participants !== null) {
      if (typeof req.body.max_participants !== 'number' || isNaN(req.body.max_participants)) {
        console.log('[DEBUG] Invalid max_participants: must be a number');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'max_participants must be a number',
        });
      }
      if (req.body.max_participants < 2) {
        console.log('[DEBUG] max_participants must be at least 2');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'max_participants must be at least 2',
        });
      }
    }

    // Validate rewards if provided
    if (req.body.rewards !== undefined && req.body.rewards !== null) {
      if (!Array.isArray(req.body.rewards)) {
        console.log('[DEBUG] Invalid rewards: must be an array');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'rewards must be an array',
        });
      }
    }

    // Validate tournament_id if provided
    if (req.body.tournament_id !== undefined) {
      if (
        typeof req.body.tournament_id !== 'string' ||
        req.body.tournament_id.trim().length === 0
      ) {
        console.log('[DEBUG] Invalid tournament_id: must be non-empty string');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'tournament_id must be a non-empty string',
        });
      }
    }

    // Validate type if provided
    if (req.body.type !== undefined && req.body.type !== null) {
      if (!['public', 'private'].includes(req.body.type)) {
        console.log('[DEBUG] Invalid type:', req.body.type);
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'type must be either public or private',
        });
      }
    }

    // Validate user_id_list if provided
    if (req.body.user_id_list !== undefined && req.body.user_id_list !== null) {
      if (!Array.isArray(req.body.user_id_list)) {
        console.log('[DEBUG] Invalid user_id_list: must be an array');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'user_id_list must be an array',
        });
      }
    }

    const updateObject: Partial<League> = {};

    // Validate and parse dates
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (req.body.start_time !== undefined) {
      try {
        startDate = new Date(req.body.start_time);
        if (isNaN(startDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (error) {
        console.log('[DEBUG] Invalid start_time: cannot parse date');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'start_time must be a valid ISO 8601 date',
        });
      }
    }

    if (req.body.end_time !== undefined) {
      try {
        endDate = new Date(req.body.end_time);
        if (isNaN(endDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (error) {
        console.log('[DEBUG] Invalid end_time: cannot parse date');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'end_time must be a valid ISO 8601 date',
        });
      }
    }

    // Validate end_time is after start_time if both are provided
    if (startDate && endDate && endDate <= startDate) {
      console.log('[DEBUG] end_time must be after start_time');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'end_time must be after start_time',
      });
    }

    Object.entries(req.body).forEach(([key, value]) => {
      if (propertiesAvailableForUpdate.includes(key)) {
        if (key === 'start_time' && startDate) {
          updateObject[key] = startDate;
        } else if (key === 'end_time' && endDate) {
          updateObject[key] = endDate;
        } else if (key !== 'start_time' && key !== 'end_time') {
          updateObject[key] = value;
        }
      }
    });

    if (!Object.keys(updateObject).length) {
      console.log('[DEBUG] no valid properties to update in request body', updateObject);
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'At least one valid property must be provided for update',
      });
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

updateLeagueHandler.apiDescription = {
  summary: 'Update a league',
  description:
    'Updates an existing league. Only the league owner can update their league. At least one field must be provided for update.',
  operationId: 'updateLeague',
  tags: ['leagues'],
  responses: {
    200: {
      description: 'League updated successfully',
      content: {
        'application/json': {
          schema: dataWrapper(leagueSchema),
          examples: {
            success: {
              summary: 'Updated league',
              value: {
                data: {
                  id: 'league_abc123',
                  name: 'Updated Masters League',
                  description: 'This is the updated description',
                  entry_fee: 150,
                  contact_phone: '+12345678901',
                  contact_email: 'updated@sweepstake.com',
                  contact_visibility: true,
                  join_code: null,
                  max_participants: 75,
                  rewards: [{ position: 1, percentage: 60, type: 'cash', product_id: '' }],
                  start_time: '2025-04-10T12:00:00Z',
                  end_time: '2025-04-14T18:00:00Z',
                  type: 'public',
                  user_id_list: [],
                  tournament_id: 'tournament_masters2025',
                  owner_id: 'user_xyz789',
                  created_at: '2025-01-15T10:30:00Z',
                  updated_at: '2025-01-16T14:20:00Z',
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
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
        format: 'uuid',
      },
      description: 'Unique identifier of the league to update',
      example: 'league_abc123',
    },
  ],
  requestBody: {
    description: 'League update details. At least one field must be provided.',
    required: false,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          minProperties: 1,
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description: 'League name',
              example: 'Updated Masters League',
            },
            description: {
              type: 'string',
              nullable: true,
              maxLength: 1000,
              description: 'League description',
              example: 'Updated description',
            },
            entry_fee: {
              type: 'number',
              minimum: 0,
              description: 'Entry fee to join the league',
              example: 150,
            },
            contact_phone: {
              type: 'string',
              nullable: true,
              pattern: '^\\+[1-9]\\d{1,14}$',
              description: 'Organizer contact phone (E.164 format)',
              example: '+12345678901',
            },
            contact_email: {
              type: 'string',
              format: 'email',
              nullable: true,
              description: 'Organizer contact email',
              example: 'updated@sweepstake.com',
            },
            contact_visibility: {
              type: 'boolean',
              description: 'Whether contact information is visible to participants',
            },
            max_participants: {
              type: 'number',
              minimum: 2,
              nullable: true,
              description: 'Maximum number of participants allowed',
              example: 75,
            },
            rewards: {
              type: 'array',
              items: { type: 'object' },
              description: 'Reward structure for the league',
              example: [{ position: 1, percentage: 60, type: 'cash', product_id: '' }],
            },
            start_time: {
              type: 'string',
              format: 'date-time',
              description: 'League start time (ISO 8601 format)',
              example: '2025-04-10T12:00:00Z',
            },
            end_time: {
              type: 'string',
              format: 'date-time',
              description: 'League end time (ISO 8601 format)',
              example: '2025-04-14T18:00:00Z',
            },
            tournament_id: {
              type: 'string',
              description: 'ID of the associated tournament',
              example: 'tournament_masters2025',
            },
            type: {
              type: 'string',
              enum: ['public', 'private'],
              description: 'League type',
            },
            user_id_list: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of user IDs invited to the league',
              example: [],
            },
          },
        },
        examples: {
          updateBasicInfo: {
            summary: 'Update basic league info',
            value: {
              name: 'Updated Masters League',
              description: 'Updated description',
              entry_fee: 150,
            },
          },
          updateContactInfo: {
            summary: 'Update contact information',
            value: {
              contact_phone: '+12345678901',
              contact_email: 'updated@sweepstake.com',
              contact_visibility: true,
            },
          },
          updateTiming: {
            summary: 'Update league timing',
            value: {
              start_time: '2025-04-10T12:00:00Z',
              end_time: '2025-04-14T18:00:00Z',
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
