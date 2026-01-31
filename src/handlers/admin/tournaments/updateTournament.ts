import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Tournament, tournaments } from '../../../models';
import { database } from '../../../services';
import { dataWrapper, standardResponses, tournamentSchema } from '../../schemas';

/**
 * Update tournament (admin endpoint)
 * @params id - required
 * @body name - string - optional
 * @body short_name - string - optional
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
 * @body colours - {primary: string; secondary: string; highlight: string;} - optional
 * @body sport - enum Golf - optional
 * @body rules - array<string> - optional
 * @body instructions - array<string> - optional
 * @body external_id - string - optional
 * @body course_name - string - optional
 * @body tour - enum (pga, euro, kft, opp, alt, major) - optional
 * @returns Tournament
 */
export const updateTournamentHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propertiesAvailableForUpdate: Array<keyof Tournament> = [
      'name',
      'short_name',
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
      'colours',
      'sport',
      'rules',
      'instructions',
      'external_id',
      'course_name',
      'tour',
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

    await database
      .update(tournaments)
      .set(updateObject)
      .where(eq(tournaments.id, id))
      .execute();

    // Fetch the updated tournament
    const updatedTournament = await database
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
      .limit(1)
      .execute();

    if (!updatedTournament.length) {
      return res.status(404).send({
        error: 'Not found',
        message: 'Tournament not found after update',
      });
    }

    // Add is_live and is_finished flags
    const now = new Date();
    const startsAt = new Date(updatedTournament[0].starts_at);
    const finishesAt = new Date(updatedTournament[0].finishes_at);
    const isLive = startsAt <= now && finishesAt > now;
    const isFinished = finishesAt <= now;

    return res.status(200).send({
      data: {
        ...updatedTournament[0],
        is_live: isLive,
        is_finished: isFinished,
      },
    });
  } catch (error: any) {
    console.log(`UPDATE TOURNAMENT ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

updateTournamentHandler.apiDescription = {
  summary: 'Update tournament (Admin)',
  description: 'Admin endpoint to update tournament information by ID.',
  operationId: 'adminUpdateTournament',
  tags: ['admin', 'tournaments'],
  responses: {
    200: {
      description: 'Tournament updated successfully',
      content: {
        'application/json': {
          schema: dataWrapper(tournamentSchema),
        },
      },
    },
    422: standardResponses[422],
    403: standardResponses[403],
    500: standardResponses[500],
  },
  requestBody: {
    description: 'Tournament update details. At least one field must be provided.',
    required: false,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          minProperties: 1,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            short_name: { type: 'string', maxLength: 50, nullable: true, description: 'Short name for tournament' },
            starts_at: { type: 'string', format: 'date-time' },
            finishes_at: { type: 'string', format: 'date-time' },
            proposed_entry_fee: { type: 'integer', minimum: 0 },
            maximum_cut_amount: { type: 'integer', minimum: 0 },
            maximum_score_generator: { type: 'integer', minimum: 0 },
            players: { type: 'array', items: { type: 'string' } },
            colours: {
              type: 'object',
              required: ['primary', 'secondary', 'highlight'],
              properties: {
                primary: { type: 'string', description: 'Primary colour for tournament branding' },
                secondary: { type: 'string', description: 'Secondary colour for tournament branding' },
                highlight: { type: 'string', description: 'Highlight colour for tournament branding' },
              },
              description: 'Tournament colour scheme',
            },
            sport: {
              type: 'string',
              enum: ['Golf'],
              description: 'Sport type (currently only Golf is supported)',
            },
            rules: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              description: 'Array of tournament rules',
            },
            instructions: {
              type: 'array',
              items: { type: 'string' },
              nullable: true,
              description: 'Array of tournament instructions (optional)',
            },
            description: { type: 'string', nullable: true },
            url: { type: 'string', format: 'uri', nullable: true },
            cover_picture: { type: 'string', nullable: true },
            gallery: { type: 'array', items: { type: 'string' }, nullable: true },
            holes: { type: 'array', items: { type: 'string' }, nullable: true },
            ads: { type: 'array', items: { type: 'string' }, nullable: true },
            external_id: { type: 'string', minLength: 1, description: 'External tournament ID' },
            course_name: {
              type: 'string',
              nullable: true,
              description: 'Name of the golf course where the tournament is held',
            },
            tour: {
              type: 'string',
              enum: ['pga', 'euro', 'kft', 'opp', 'alt', 'major'],
              nullable: true,
              description:
                'Tournament tour type: pga (PGA Tour), euro (European Tour), kft (Korn Ferry Tour), opp (opposite field), alt (alternate event), major (Major Championship)',
            },
            status: {
              type: 'string',
              enum: ['active', 'processing', 'finished', 'cancelled'],
              nullable: true,
              description:
                'Tournament processing status: active (not yet processed), processing (currently being processed for rewards), finished (rewards processed), cancelled (cancelled tournament). Normally set automatically by the tournament processing script.',
            },
          },
        },
      },
    },
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
