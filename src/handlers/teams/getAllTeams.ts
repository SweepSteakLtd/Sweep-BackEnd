import { eq, inArray } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { League, leagues, playerProfiles, Team, teams, User } from '../../models';
import { database } from '../../services';
import {
  apiKeyAuth,
  dataWrapper,
  leagueSchema,
  playerProfileSchema,
  standardResponses,
  teamSchema,
} from '../schemas';

/**
 * Get all teams (auth endpoint)
 * @returns
 */
export const getAllTeamsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user: User = res.locals.user;
    const existingTeams: Team[] = await database
      .select(teams)
      .from(teams)
      .where(eq(teams.owner_id, user.id));

    const resolvedTeams = await Promise.all(
      existingTeams.map(async team => {
        const existingLeague: League[] = await database
          .select(leagues)
          .from(leagues)
          .where(eq(leagues.id, team.league_id))
          .execute();

        const existingPlayers = await database
          .select(playerProfiles)
          .from(playerProfiles)
          .where(inArray(playerProfiles.id, team.player_ids))
          .execute();

        return {
          league: existingLeague[0] as League,
          team: team,
          players: existingPlayers,
        };
      }),
    );

    return res.status(200).send({ data: resolvedTeams });
  } catch (error: any) {
    console.log(`GET ALL TEAM ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getAllTeamsHandler.apiDescription = {
  summary: 'Get user teams',
  description:
    'Retrieves all teams owned by the authenticated user. Returns league, team, and player profile details for each team.',
  operationId: 'getAllTeams',
  tags: ['teams'],
  responses: {
    200: {
      description: 'Teams retrieved successfully',
      content: {
        'application/json': {
          schema: dataWrapper({
            type: 'array',
            items: {
              type: 'object',
              required: ['league', 'team', 'players'],
              properties: {
                league: leagueSchema,
                team: teamSchema,
                players: {
                  type: 'array',
                  items: playerProfileSchema,
                  description: 'Array of player profiles for the team',
                },
              },
            },
          }),
          examples: {
            success: {
              summary: 'User teams with league and player profile details',
              value: {
                data: [
                  {
                    league: {
                      id: 'league_abc123',
                      name: 'Masters Championship League',
                      description: 'Compete for the top spot',
                      entry_fee: 100,
                      contact_phone: '+12345678901',
                      contact_email: 'organizer@sweepstake.com',
                      contact_visibility: true,
                      join_code: null,
                      max_participants: 50,
                      rewards: [],
                      start_time: '2025-04-10T12:00:00Z',
                      end_time: '2025-04-14T18:00:00Z',
                      type: 'public',
                      user_id_list: [],
                      tournament_id: 'tournament_masters2025',
                      owner_id: 'user_xyz789',
                      created_at: '2025-01-15T10:30:00Z',
                      updated_at: '2025-01-15T10:30:00Z',
                    },
                    team: {
                      id: 'team_def456',
                      owner_id: 'user_abc123',
                      player_ids: ['profile_abc', 'profile_def', 'profile_ghi'],
                      created_at: '2025-01-16T09:00:00Z',
                      updated_at: '2025-01-16T09:00:00Z',
                    },
                    players: [
                      {
                        id: 'profile_abc',
                        external_id: 'ext_player_1',
                        first_name: 'Tiger',
                        last_name: 'Woods',
                        country: 'USA',
                        age: 48,
                        ranking: 15,
                        profile_picture: 'https://example.com/tiger-woods.jpg',
                        group: 'A',
                        created_at: '2025-01-10T00:00:00Z',
                        updated_at: '2025-01-16T12:00:00Z',
                      },
                      {
                        id: 'profile_def',
                        external_id: 'ext_player_2',
                        first_name: 'Rory',
                        last_name: 'McIlroy',
                        country: 'NIR',
                        age: 34,
                        ranking: 3,
                        profile_picture: 'https://example.com/rory-mcilroy.jpg',
                        group: 'A',
                        created_at: '2025-01-10T00:00:00Z',
                        updated_at: '2025-01-16T12:00:00Z',
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    },
    403: standardResponses[403],
    500: standardResponses[500],
  },
  security: [apiKeyAuth],
};
