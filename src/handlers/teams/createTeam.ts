import { createId } from '@paralleldrive/cuid2';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { bets, leagues, players, Team, teams, tournaments, users } from '../../models';
import { database } from '../../services';
import { apiKeyAuth, dataWrapper, standardResponses, teamSchema } from '../schemas';

/**
 * Create team (authenticated endpoint)
 * @body name - string - optional
 * @body league_id - string - required
 * @body players - array - optional
 * @returns Team
 * @note User can create up to max_participants teams in a league
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

    const { name, league_id, players: playerProfileIds } = req.body;

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

    const league = existingLeague[0];
    const maxParticipants = league.max_participants;

    const user = res.locals.user;

    // Check if user has enough balance to cover entry fee
    if (user.current_balance < league.entry_fee) {
      console.log('[DEBUG] Insufficient balance:', {
        userId: user.id,
        currentBalance: user.current_balance,
        entryFee: league.entry_fee,
      });
      return res.status(422).send({
        error: 'Insufficient balance',
        message: `You need ${league.entry_fee} coins to join this league, but you only have ${user.current_balance} coins`,
      });
    }

    // Fetch the tournament to validate players
    const existingTournament = await database
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, league.tournament_id))
      .limit(1)
      .execute();

    if (!existingTournament.length) {
      console.log('[DEBUG] Tournament not found:', league.tournament_id);
      return res.status(404).send({
        error: 'Not found',
        message: 'Tournament not found for this league',
      });
    }

    const tournament = existingTournament[0];

    if (maxParticipants !== null && maxParticipants !== undefined) {
      const userTeamsInLeague = await database
        .select()
        .from(teams)
        .where(and(eq(teams.league_id, league_id), eq(teams.owner_id, res.locals.user.id)))
        .execute();

      if (userTeamsInLeague.length >= maxParticipants) {
        console.log('[DEBUG] User has reached max teams limit:', maxParticipants);
        return res.status(403).send({
          error: 'Forbidden',
          message: `You have reached the maximum number of teams (${maxParticipants}) allowed in this league`,
        });
      }
    }

    // Map player profile IDs to tournament player IDs
    let tournamentPlayerIds: string[] = [];

    if (playerProfileIds !== undefined && playerProfileIds !== null) {
      if (!Array.isArray(playerProfileIds)) {
        console.log('[DEBUG] Invalid players: must be an array');
        return res.status(422).send({
          error: 'Invalid request body',
          message: 'players must be an array',
        });
      }

      for (const profileId of playerProfileIds) {
        if (typeof profileId !== 'string' || profileId.trim().length === 0) {
          console.log('[DEBUG] Invalid player_id in players array');
          return res.status(422).send({
            error: 'Invalid request body',
            message: 'Each player_id must be a non-empty string',
          });
        }
      }

      // Find tournament players that match the provided player profile IDs
      const tournamentPlayers = await database
        .select()
        .from(players)
        .where(
          and(
            eq(players.tournament_id, tournament.id),
            inArray(players.profile_id, playerProfileIds)
          )
        )
        .execute();

      // Check if all player profile IDs were found in the tournament
      if (tournamentPlayers.length !== playerProfileIds.length) {
        const foundProfileIds = tournamentPlayers.map(p => p.profile_id);
        const invalidProfileIds = playerProfileIds.filter(id => !foundProfileIds.includes(id));

        console.log('[DEBUG] Invalid player profile IDs for tournament:', invalidProfileIds);
        return res.status(422).send({
          error: 'Invalid request body',
          message: `The following player profile IDs are not valid for this tournament: ${invalidProfileIds.join(', ')}`,
        });
      }

      // Extract the tournament player IDs
      tournamentPlayerIds = tournamentPlayers.map(p => p.id);

      console.log('[INFO] Mapped player profiles to tournament players:', {
        profileIds: playerProfileIds,
        tournamentPlayerIds,
      });
    }

    const teamObject: Team = {
      id: createId(),
      owner_id: res.locals.user.id,
      league_id: league_id,
      name: name || null,
      position: null,
      player_ids: tournamentPlayerIds,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await database.transaction(async (tx: any) => {
      await tx.insert(teams).values(teamObject);

      await tx.insert(bets).values({
        league_id: league_id!,
        owner_id: res.locals.user.id,
        team_id: teamObject.id,
        amount: league.entry_fee,
        id: createId(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      await tx
        .update(users)
        .set({
          current_balance: sql`${users.current_balance} - ${league.entry_fee}`,
          updated_at: new Date(),
        })
        .where(eq(users.id, res.locals.user.id));

      console.log('[INFO] Entry fee deducted from user balance:', {
        userId: res.locals.user.id,
        teamId: teamObject.id,
        leagueId: league_id,
        entryFee: league.entry_fee,
        previousBalance: user.current_balance,
        newBalance: user.current_balance - league.entry_fee,
      });
    });

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
    'Creates a new team with optional name and player list. The owner_id is automatically set from the authenticated user. League validation is performed if league_id is provided. Users can create up to max_participants teams per league (e.g., if max_participants is 5, a user can create up to 5 teams in that league). When creating a team for a private league, a valid join_code query parameter is required. The user must have sufficient balance to cover the league entry fee, which will be deducted from their account upon team creation.',
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
    422: {
      description: 'Unprocessable Entity - Invalid input or insufficient balance',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          examples: {
            insufficientBalance: {
              summary: 'User has insufficient balance',
              value: {
                error: 'Insufficient balance',
                message: 'You need 100 coins to join this league, but you only have 50 coins',
              },
            },
            invalidInput: {
              summary: 'Invalid request body',
              value: {
                error: 'Invalid request body',
                message: 'name must be a non-empty string',
              },
            },
          },
        },
      },
    },
    403: {
      description:
        'Forbidden - Authentication required, max teams limit reached, or invalid join_code for private league',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          examples: {
            notAuthenticated: {
              summary: 'User not authenticated',
              value: {
                error: 'Forbidden',
                message: 'User authentication is required',
              },
            },
            maxTeamsReached: {
              summary: 'User has reached maximum teams limit',
              value: {
                error: 'Forbidden',
                message: 'You have reached the maximum number of teams (5) allowed in this league',
              },
            },
            noJoinCode: {
              summary: 'Private league accessed without join_code',
              value: {
                error: 'Forbidden',
                message: 'This is a private league. A valid join code is required to access it.',
              },
            },
            invalidJoinCode: {
              summary: 'Private league accessed with invalid join_code',
              value: {
                error: 'Forbidden',
                message: 'Invalid join code for this private league.',
              },
            },
          },
        },
      },
    },
    500: standardResponses[500],
  },
  parameters: [
    {
      name: 'join_code',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description:
        'Join code for creating teams in private leagues. Required when league_id refers to a private league, optional for public leagues.',
      example: 'GOLF2025',
    },
  ],
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
              nullable: false,
              description: 'League ID for validation (required)',
              example: 'league_abc123',
            },
            players: {
              type: 'array',
              items: { type: 'string' },
              default: [],
              description: 'Array of player profile IDs (will be automatically mapped to tournament-specific player IDs)',
              example: ['profile_1', 'profile_2', 'profile_3'],
            },
          },
        },
        examples: {
          full: {
            summary: 'Create team with all fields',
            value: {
              name: 'Dream Team',
              league_id: 'league_abc123',
              players: ['profile_abc123', 'profile_def456', 'profile_ghi789'],
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
