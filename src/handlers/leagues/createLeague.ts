import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { customAlphabet } from 'nanoid';
import { League, leagues } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, dataWrapper, leagueSchema, standardResponses } from '../schemas';

/**
 * Create league (authenticated endpoint)
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
 * @body is_featured - boolean - optional
 * @body type - string - optional
 * @returns League
 */
export const createLeagueHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate user authentication
    if (!res.locals.user || !res.locals.user.id) {
      console.log('[DEBUG] Missing authenticated user information');
      return res.status(403).send({
        error: 'Forbidden',
        message: 'User authentication is required',
      });
    }

    const { name, entry_fee, start_time, end_time, tournament_id } = req.body as League;
    // TODO: total pot size filter

    // Validate required fields
    if (!name) {
      console.log('[DEBUG] Missing required field: name');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Missing required field: name',
      });
    }
    if (entry_fee === undefined || entry_fee === null) {
      console.log('[DEBUG] Missing required field: entry_fee');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Missing required field: entry_fee',
      });
    }
    if (!start_time) {
      console.log('[DEBUG] Missing required field: start_time');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Missing required field: start_time',
      });
    }
    if (!end_time) {
      console.log('[DEBUG] Missing required field: end_time');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Missing required field: end_time',
      });
    }
    if (!tournament_id) {
      console.log('[DEBUG] Missing required field: tournament_id');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Missing required field: tournament_id',
      });
    }

    // Validate name
    if (typeof name !== 'string' || name.trim().length === 0) {
      console.log('[DEBUG] Invalid name: must be non-empty string');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'name must be a non-empty string',
      });
    }
    if (name.length > 200) {
      console.log('[DEBUG] Invalid name: exceeds max length');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'name must not exceed 200 characters',
      });
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

    // Validate entry_fee
    if (typeof entry_fee !== 'number' || isNaN(entry_fee)) {
      console.log('[DEBUG] Invalid entry_fee: must be a number');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'entry_fee must be a number',
      });
    }
    if (entry_fee < 0) {
      console.log('[DEBUG] entry_fee must be non-negative');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'entry_fee must be non-negative',
      });
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

    // Validate start_time
    let startDate: Date;
    try {
      startDate = new Date(start_time);
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

    // Validate end_time
    let endDate: Date;
    try {
      endDate = new Date(end_time);
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

    // Validate end_time is after start_time
    if (endDate <= startDate) {
      console.log('[DEBUG] end_time must be after start_time');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'end_time must be after start_time',
      });
    }

    // Validate tournament_id
    if (typeof tournament_id !== 'string' || tournament_id.trim().length === 0) {
      console.log('[DEBUG] Invalid tournament_id: must be non-empty string');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'tournament_id must be a non-empty string',
      });
    }

    // Validate type if provided
    if (req.body.type && !['public', 'private'].includes(req.body.type)) {
      console.log('[DEBUG] Invalid type:', req.body.type);
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'type must be either public or private',
      });
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

    // Validate is_featured if provided
    if (req.body.is_featured !== undefined && req.body.is_featured !== null) {
      if (typeof req.body.is_featured !== 'boolean') {
        console.log('[DEBUG] Invalid is_featured: must be boolean');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'is_featured must be a boolean',
        });
      }
    }
    let currentJoinCode: string | undefined;
    if (req.body.type === 'private') {
      let exists = true;

      // we should be fine as long as we dont have more then 1 million public leagues
      while (exists) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        currentJoinCode = customAlphabet(alphabet, 6)();

        const existingleagueWithJoinCode = await database
          .select()
          .from(leagues)
          .where(eq(leagues.join_code, currentJoinCode))
          .limit(1)
          .execute();

        exists = !!existingleagueWithJoinCode.length;
      }
    }

    const leagueObject: League = {
      id: createId(),
      name,
      description: req.body.description,
      entry_fee,
      contact_phone: req.body.contact_phone,
      contact_email: req.body.contact_email,
      contact_visibility: req.body.contact_visibility,
      join_code: currentJoinCode,
      max_participants: req.body.max_participants,
      rewards: req.body.rewards,
      start_time: startDate,
      end_time: endDate,
      owner_id: res.locals.user.id,
      tournament_id,
      user_id_list: req.body.user_id_list,
      is_featured: req.body.is_featured,
      type: req.body.type,
      joined_players: [res.locals.user.id],
      created_at: new Date(),
      updated_at: new Date(),
    };

    await database.insert(leagues).values(leagueObject).execute();

    return res.status(201).send({ data: leagueObject });
  } catch (error: any) {
    console.log(`CREATE league ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

createLeagueHandler.apiDescription = {
  summary: 'Create a new league',
  description:
    'Creates a new league for a tournament. Automatically generates a join code for private leagues. The owner_id and initial joined_players array (containing the creator) are automatically set from the authenticated user.',
  operationId: 'createLeague',
  tags: ['leagues'],
  responses: {
    201: {
      description: 'League created successfully',
      content: {
        'application/json': {
          schema: dataWrapper(leagueSchema),
          examples: {
            publicLeague: {
              summary: 'Public league',
              value: {
                data: {
                  id: 'league_abc123',
                  name: 'Masters Championship League',
                  description: 'Compete for the top spot in this prestigious tournament',
                  entry_fee: 100,
                  contact_phone: '+12345678901',
                  contact_email: 'organizer@sweepstake.com',
                  contact_visibility: true,
                  join_code: null,
                  max_participants: 50,
                  rewards: [
                    { position: 1, percentage: 50, type: 'cash', product_id: '' },
                    { position: 2, percentage: 30, type: 'cash', product_id: '' },
                    { position: 3, percentage: 20, type: 'cash', product_id: '' },
                  ],
                  start_time: '2025-04-10T12:00:00Z',
                  end_time: '2025-04-14T18:00:00Z',
                  type: 'public',
                  user_id_list: [],
                  joined_players: ['user_xyz789'],
                  tournament_id: 'tournament_masters2025',
                  owner_id: 'user_xyz789',
                  created_at: '2025-01-15T10:30:00Z',
                  updated_at: '2025-01-15T10:30:00Z',
                },
              },
            },
            privateLeague: {
              summary: 'Private league with join code',
              value: {
                data: {
                  id: 'league_def456',
                  name: 'Friends Only League',
                  description: 'Private league for friends',
                  entry_fee: 50,
                  contact_phone: null,
                  contact_email: null,
                  contact_visibility: false,
                  join_code: 'aB3xY9',
                  max_participants: 10,
                  rewards: [],
                  start_time: '2025-05-01T09:00:00Z',
                  end_time: '2025-05-05T20:00:00Z',
                  type: 'private',
                  user_id_list: [],
                  joined_players: ['user_xyz789'],
                  tournament_id: 'tournament_usopen2025',
                  owner_id: 'user_xyz789',
                  created_at: '2025-01-15T11:00:00Z',
                  updated_at: '2025-01-15T11:00:00Z',
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
  requestBody: {
    description:
      'League creation details. Owner ID and joined_players (containing the creator) are automatically set from authenticated user.',
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['name', 'entry_fee', 'start_time', 'end_time', 'tournament_id'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description: 'League name',
              example: 'Masters Championship League',
            },
            description: {
              type: 'string',
              nullable: true,
              maxLength: 1000,
              description: 'League description',
              example: 'Compete for the top spot in this prestigious tournament',
            },
            entry_fee: {
              type: 'number',
              minimum: 0,
              description: 'Entry fee to join the league',
              example: 100,
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
              example: 'organizer@sweepstake.com',
            },
            contact_visibility: {
              type: 'boolean',
              default: false,
              description: 'Whether contact information is visible to participants',
            },
            max_participants: {
              type: 'number',
              minimum: 2,
              nullable: true,
              description: 'Maximum number of participants allowed',
              example: 50,
            },
            rewards: {
              type: 'array',
              items: { type: 'object' },
              default: [],
              description: 'Reward structure for the league',
              example: [{ position: 1, percentage: 50, type: 'cash', product_id: '' }],
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
              default: 'public',
              description: 'League type (private leagues get auto-generated join codes)',
            },
            user_id_list: {
              type: 'array',
              items: { type: 'string' },
              default: [],
              description: 'List of user IDs invited to the league',
            },
            is_featured: {
              type: 'boolean',
              default: false,
              description: 'Whether the league is featured',
            },
          },
        },
        examples: {
          publicLeague: {
            summary: 'Create public league',
            value: {
              name: 'Masters Championship League',
              description: 'Compete for the top spot',
              entry_fee: 100,
              contact_phone: '+12345678901',
              contact_email: 'organizer@sweepstake.com',
              contact_visibility: true,
              max_participants: 50,
              rewards: [{ position: 1, percentage: 50, type: 'cash', product_id: '' }],
              start_time: '2025-04-10T12:00:00Z',
              end_time: '2025-04-14T18:00:00Z',
              tournament_id: 'tournament_masters2025',
              type: 'public',
            },
          },
          privateLeague: {
            summary: 'Create private league',
            value: {
              name: 'Friends Only League',
              description: 'Private league for friends',
              entry_fee: 50,
              max_participants: 10,
              start_time: '2025-05-01T09:00:00Z',
              end_time: '2025-05-05T20:00:00Z',
              tournament_id: 'tournament_usopen2025',
              type: 'private',
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
