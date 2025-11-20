import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { leagues, Team, teams } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, dataWrapper, standardResponses, teamSchema } from '../schemas';

/**
 * Create team (authenticated endpoint)
 * @body name - string - optional
 * @body league_id - string - optional
 * @body players - array - optional
 * @returns Team
 */
export const createTeamHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!res.locals.user || !res.locals.user.id) {
      console.log('[DEBUG] Missing authenticated user information');
      return res.status(403).send({
        error: 'Forbidden',
        message: 'User authentication is required',
      });
    }

    const { name, league_id, players } = req.body;

    if (name !== undefined && name !== null) {
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
    }

    if (league_id !== undefined && league_id !== null) {
      if (typeof league_id !== 'string' || league_id.trim().length === 0) {
        console.log('[DEBUG] Invalid league_id: must be non-empty string');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'league_id must be a non-empty string',
        });
      }

      const existingLeague = await database
        .select()
        .from(leagues)
        .where(eq(leagues.id, league_id))
        .limit(1)
        .execute();

      if (!existingLeague.length) {
        console.log('[DEBUG] League not found:', league_id);
        return res.status(404).send({
          error: 'Not found',
          message: 'League not found',
        });
      }
    }

    if (players !== undefined && players !== null) {
      if (!Array.isArray(players)) {
        console.log('[DEBUG] Invalid players: must be an array');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'players must be an array',
        });
      }

      for (const playerId of players) {
        if (typeof playerId !== 'string' || playerId.trim().length === 0) {
          console.log('[DEBUG] Invalid player_id in players array');
          return res.status(422).send({
            error: 'Invalid request body',
            message: 'Each player_id must be a non-empty string',
          });
        }
      }
    }

    const teamObject: Team = {
      id: createId(),
      owner_id: res.locals.user.id,
      name: name || null,
      position: null,
      player_ids: players || [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    await database.insert(teams).values(teamObject).execute();

    return res.status(201).send({ data: teamObject });
  } catch (error: any) {
    console.log(`CREATE TEAM ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

createTeamHandler.apiDescription = {
  summary: 'Create a new team',
  description:
    'Creates a new team with optional name and player list. The owner_id is automatically set from the authenticated user. League validation is performed if league_id is provided.',
  operationId: 'createTeam',
  tags: ['teams'],
  responses: {
    201: {
      description: 'Team created successfully',
      content: {
        'application/json': {
          schema: dataWrapper(teamSchema),
          examples: {
            withPlayers: {
              summary: 'Team with players',
              value: {
                data: {
                  id: 'team_abc123',
                  owner_id: 'user_xyz789',
                  name: 'Dream Team',
                  position: null,
                  player_ids: ['player_1', 'player_2', 'player_3'],
                  created_at: '2025-01-15T10:30:00Z',
                  updated_at: '2025-01-15T10:30:00Z',
                },
              },
            },
            minimal: {
              summary: 'Minimal team',
              value: {
                data: {
                  id: 'team_def456',
                  owner_id: 'user_xyz789',
                  name: null,
                  position: null,
                  player_ids: [],
                  created_at: '2025-01-15T10:30:00Z',
                  updated_at: '2025-01-15T10:30:00Z',
                },
              },
            },
          },
        },
      },
    },
    404: standardResponses[404],
    422: standardResponses[422],
    403: standardResponses[403],
    500: standardResponses[500],
  },
  requestBody: {
    description:
      'Team creation details. All fields are optional. Owner ID is automatically set from authenticated user.',
    required: false,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              nullable: true,
              minLength: 1,
              maxLength: 200,
              description: 'Team name',
              example: 'Dream Team',
            },
            league_id: {
              type: 'string',
              nullable: true,
              description: 'League ID for validation (optional)',
              example: 'league_abc123',
            },
            players: {
              type: 'array',
              items: { type: 'string' },
              default: [],
              description: 'Array of player IDs',
              example: ['player_1', 'player_2', 'player_3'],
            },
          },
        },
        examples: {
          full: {
            summary: 'Create team with all fields',
            value: {
              name: 'Dream Team',
              league_id: 'league_abc123',
              players: ['player_1', 'player_2', 'player_3'],
            },
          },
          minimal: {
            summary: 'Create team with minimal fields',
            value: {},
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
