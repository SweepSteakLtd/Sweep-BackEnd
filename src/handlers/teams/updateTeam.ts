import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { teams } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, dataWrapper, standardResponses, teamSchema } from '../schemas';

/**
 * Update team (authenticated endpoint)
 * @params id - required
 * @body name - string - optional
 * @body players - array - optional
 * @returns Team
 */
export const updateTeamHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!res.locals.user || !res.locals.user.id) {
      console.log('[DEBUG] Missing authenticated user information');
      return res.status(403).send({
        error: 'Forbidden',
        message: 'User authentication is required',
      });
    }

    const user = res.locals.user;
    const propertiesAvailableForUpdate = ['name', 'players'];

    const { id } = req.params;

    if (!id) {
      console.log('[DEBUG] missing id in request params');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Missing required parameter: id',
      });
    }

    if (typeof id !== 'string' || id.trim().length === 0) {
      console.log('[DEBUG] Invalid id: must be non-empty string');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'id must be a non-empty string',
      });
    }

    if (req.body.name !== undefined && req.body.name !== null) {
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

    if (req.body.players !== undefined && req.body.players !== null) {
      if (!Array.isArray(req.body.players)) {
        console.log('[DEBUG] Invalid players: must be an array');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'players must be an array',
        });
      }

      for (const playerId of req.body.players) {
        if (typeof playerId !== 'string' || playerId.trim().length === 0) {
          console.log('[DEBUG] Invalid player_id in players array');
          return res.status(422).send({
            error: 'Invalid request body',
            message: 'Each player_id must be a non-empty string',
          });
        }
      }
    }

    const hasUpdateableProperty = propertiesAvailableForUpdate.some(
      prop => req.body[prop] !== undefined,
    );

    if (!hasUpdateableProperty) {
      console.log('[DEBUG] No updateable properties provided');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'At least one updateable property must be provided (name, players)',
      });
    }

    const existingTeam = await database
      .select()
      .from(teams)
      .where(and(eq(teams.id, id), eq(teams.owner_id, user.id)))
      .limit(1)
      .execute();

    if (!existingTeam.length) {
      console.log('[DEBUG] Team not found or unauthorized:', id);
      return res.status(404).send({
        error: 'Not found',
        message: 'Team not found or you do not have permission to update it',
      });
    }

    const updateObject: any = {
      updated_at: new Date(),
    };

    if (req.body.name !== undefined) {
      updateObject.name = req.body.name;
    }

    if (req.body.players !== undefined) {
      updateObject.player_ids = req.body.players;
    }

    const updatedTeam = await database
      .update(teams)
      .set(updateObject)
      .where(and(eq(teams.id, id), eq(teams.owner_id, user.id)))
      .returning()
      .execute();

    if (!updatedTeam.length) {
      console.log('[DEBUG] Failed to update team');
      return res.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update team',
      });
    }

    return res.status(200).send({ data: updatedTeam[0] });
  } catch (error: any) {
    console.log(`UPDATE TEAM ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

updateTeamHandler.apiDescription = {
  summary: 'Update a team',
  description:
    'Updates an existing team. Users can only update teams they own. All fields are optional, but at least one must be provided.',
  operationId: 'updateTeam',
  tags: ['teams'],
  responses: {
    200: {
      description: 'Team updated successfully',
      content: {
        'application/json': {
          schema: dataWrapper(teamSchema),
          examples: {
            updated: {
              summary: 'Updated team',
              value: {
                data: {
                  id: 'team_abc123',
                  owner_id: 'user_xyz789',
                  name: 'Updated Dream Team',
                  position: null,
                  player_ids: ['player_1', 'player_2', 'player_4'],
                  created_at: '2025-01-15T10:30:00Z',
                  updated_at: '2025-01-15T11:00:00Z',
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
    description: 'Team update details. All fields are optional, but at least one must be provided.',
    required: true,
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
              example: 'Updated Dream Team',
            },
            players: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of player IDs',
              example: ['player_1', 'player_2', 'player_4'],
            },
          },
        },
        examples: {
          updateName: {
            summary: 'Update team name only',
            value: {
              name: 'Updated Dream Team',
            },
          },
          updatePlayers: {
            summary: 'Update players only',
            value: {
              players: ['player_1', 'player_2', 'player_4'],
            },
          },
          updateBoth: {
            summary: 'Update both name and players',
            value: {
              name: 'Updated Dream Team',
              players: ['player_1', 'player_2', 'player_4'],
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
