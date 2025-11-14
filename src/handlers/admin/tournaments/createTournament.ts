import { createId } from '@paralleldrive/cuid2';
import { NextFunction, Request, Response } from 'express';
import { Tournament, tournaments } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, dataWrapper, standardResponses, tournamentSchema } from '../../schemas';

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
 * @body colours - {primary: string; secondary: string; highlight: string;} - required
 * @body sport - enum Gold - required - enum will get updated later on
 * @body rules - array<string> - required
 * @body instructions - array<string> - optional
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
      colours,
      sport,
      rules,
      instructions,
    } = req.body as Tournament;

    if (
      !starts_at ||
      !finishes_at ||
      proposed_entry_fee === undefined ||
      maximum_cut_amount === undefined ||
      maximum_score_generator === undefined ||
      !players ||
      players.length === 0 ||
      !colours ||
      !sport ||
      !rules ||
      rules.length === 0
    ) {
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'required properties missing' });
    }

    // Validate colours structure
    if (!colours.primary || !colours.secondary || !colours.highlight) {
      return res
        .status(422)
        .send({ error: 'Invalid request body', message: 'colours must have primary, secondary, and highlight properties' });
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
      colours,
      sport,
      rules,
      instructions,
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
  summary: 'Create tournament (Admin)',
  description:
    'Admin endpoint to create a new golf tournament with schedule, fees, and player assignments.',
  operationId: 'adminCreateTournament',
  tags: ['admin', 'tournaments'],
  responses: {
    201: {
      description: 'Tournament created successfully',
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
    description: 'Tournament creation details.',
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: [
            'name',
            'starts_at',
            'finishes_at',
            'proposed_entry_fee',
            'maximum_cut_amount',
            'maximum_score_generator',
            'players',
            'colours',
            'sport',
            'rules',
          ],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200, description: 'Tournament name' },
            starts_at: {
              type: 'string',
              format: 'date-time',
              description: 'Tournament start date/time',
            },
            finishes_at: {
              type: 'string',
              format: 'date-time',
              description: 'Tournament end date/time',
            },
            proposed_entry_fee: { type: 'integer', minimum: 0, description: 'Suggested entry fee' },
            maximum_cut_amount: {
              type: 'integer',
              minimum: 0,
              description: 'Maximum players making the cut',
            },
            maximum_score_generator: {
              type: 'integer',
              minimum: 0,
              description: 'Maximum score generator value',
            },
            players: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              description: 'Array of player IDs',
            },
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
            description: { type: 'string', nullable: true, description: 'Tournament description' },
            url: {
              type: 'string',
              format: 'uri',
              nullable: true,
              description: 'Tournament website URL',
            },
            cover_picture: { type: 'string', nullable: true, description: 'Cover image URL' },
            gallery: {
              type: 'array',
              items: { type: 'string' },
              nullable: true,
              description: 'Gallery image URLs',
            },
            holes: {
              type: 'array',
              items: { type: 'string' },
              nullable: true,
              description: 'Hole IDs',
            },
            ads: {
              type: 'array',
              items: { type: 'string' },
              nullable: true,
              description: 'Advertisement IDs',
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
