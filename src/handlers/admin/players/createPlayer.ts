import { createId } from '@paralleldrive/cuid2';
import { NextFunction, Request, Response } from 'express';
import { Player, players } from '../../../models';
import { database } from '../../../services';
import { apiKeyAuth, dataWrapper, playerSchema, standardResponses } from '../../schemas';

/**
 * Create player (admin endpoint)
 * @body external_ids - object - optional (e.g., {"datagolf": 12345})
 * @body level - number - required
 * @body current_score - number - optional
 * @body position - number - optional
 * @body attempts - array - optional
 * @body missed_cut - boolean - optional
 * @body odds - number - optional
 * @body profile_id - string - required
 * @body tournament_id - string - required
 * @returns Player
 */
export const createPlayerHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requiredProperties = ['level', 'profile_id', 'tournament_id'];

    for (const field of requiredProperties) {
      if (!req.body[field]) {
        console.log(`[DEBUG] Missing required field: ${field}`);
        return res.status(422).send({
          error: 'Invalid request body',
          message: `Missing required field: ${field}`,
        });
      }
    }

    const requestBodyPlayer: Player = req.body;

    const createdPlayer: Player = {
      id: createId(),
      external_ids: requestBodyPlayer.external_ids || {},
      level: requestBodyPlayer.level,
      current_score: requestBodyPlayer.current_score,
      position: requestBodyPlayer.position,
      attempts: requestBodyPlayer.attempts,
      missed_cut: requestBodyPlayer.missed_cut,
      odds: requestBodyPlayer.odds,
      profile_id: requestBodyPlayer.profile_id,
      tournament_id: requestBodyPlayer.tournament_id,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await database.insert(players).values(createdPlayer).execute();
    return res.status(201).send({ data: createdPlayer });
  } catch (error: any) {
    console.log(`CREATE PLAYER ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
createPlayerHandler.apiDescription = {
  summary: 'Create player (Admin)',
  description: 'Admin endpoint to create a new player with profile association.',
  operationId: 'adminCreatePlayer',
  tags: ['admin', 'players'],
  responses: {
    201: {
      description: 'Player created successfully',
      content: {
        'application/json': {
          schema: dataWrapper(playerSchema),
          examples: {
            success: {
              summary: 'Created player',
              value: {
                data: {
                  id: 'player_abc123',
                  external_ids: { datagolf: 27644 },
                  level: 4,
                  current_score: 0,
                  position: null,
                  attempts: {},
                  missed_cut: false,
                  odds: 15.5,
                  profile_id: 'profile_tiger_woods',
                  tournament_id: 'tournament_masters_2025',
                  created_at: '2025-01-20T10:00:00Z',
                  updated_at: '2025-01-20T10:00:00Z',
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
    description: 'Player creation details. All fields except optional ones are required.',
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['level', 'profile_id', 'tournament_id'],
          properties: {
            external_ids: {
              type: 'object',
              additionalProperties: { type: 'number' },
              description: 'External API identifiers by provider (e.g., {"datagolf": 27644})',
              default: {}
            },
            level: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
              description: 'Player skill level (1-5)',
            },
            current_score: {
              type: 'integer',
              nullable: true,
              description: 'Current tournament score',
            },
            position: {
              type: 'integer',
              nullable: true,
              minimum: 1,
              description: 'Current leaderboard position',
            },
            attempts: {
              type: 'object',
              nullable: true,
              description: 'Hole-by-hole attempt counts',
            },
            missed_cut: {
              type: 'boolean',
              default: false,
              description: 'Whether player missed the cut',
            },
            odds: {
              type: 'number',
              nullable: true,
              minimum: 0,
              description: 'Betting odds for this player',
            },
            profile_id: {
              type: 'string',
              format: 'uuid',
              description: 'Reference to player profile',
            },
            tournament_id: {
              type: 'string',
              format: 'uuid',
              description: 'Reference to tournament',
            },
          },
        },
        examples: {
          newPlayer: {
            summary: 'Create new player for tournament',
            value: {
              external_ids: { datagolf: 27644 },
              level: 4,
              current_score: 0,
              position: null,
              attempts: {},
              missed_cut: false,
              odds: 15.5,
              profile_id: 'profile_tiger_woods',
              tournament_id: 'tournament_masters_2025',
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
