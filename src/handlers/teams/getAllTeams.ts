import { eq, inArray } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Bet, bets, League, leagues, Player, players, Team, teams, User } from '../../models';
import { database } from '../../services';
import {
  apiKeyAuth,
  dataWrapper,
  leagueSchema,
  playerSchema,
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
    const existingBets: Bet[] = await database
      .select(bets)
      .from(bets)
      .where(eq(bets.owner_id, user.id));

    const resolvedBet = await Promise.all(
      existingBets.map(async bet => {
        const existingLeague: League[] = await database
          .select(leagues)
          .from(leagues)
          .where(eq(leagues.id, bet.league_id))
          .execute();

        const existingTeam: Team[] = await database
          .select(teams)
          .from(teams)
          .where(eq(teams.id, bet.team_id))
          .execute();

        const existingPlayers = await database
          .select(players)
          .from(players)
          .where(inArray(players.id, existingTeam[0].player_ids))
          .execute();

        return {
          league: existingLeague[0] as League,
          team: existingTeam[0] as Team,
          players: existingPlayers as Player[],
        };
      }),
    );

    return res.status(200).send({ data: resolvedBet });
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
    'Retrieves all teams for the authenticated user based on their bets. Returns league, team, and player details for each bet.',
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
                  items: playerSchema,
                },
              },
            },
          }),
          examples: {
            success: {
              summary: 'User teams with full details',
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
                      player_ids: ['player_1', 'player_2', 'player_3'],
                      created_at: '2025-01-16T09:00:00Z',
                      updated_at: '2025-01-16T09:00:00Z',
                    },
                    players: [
                      {
                        id: 'player_1',
                        external_id: 'ext_player_1',
                        level: 4,
                        current_score: -5,
                        position: 12,
                        attempts: { '1': 3, '2': 4 },
                        missed_cut: false,
                        odds: 15.5,
                        profile_id: 'profile_abc',
                        created_at: '2025-01-10T00:00:00Z',
                        updated_at: '2025-01-16T12:00:00Z',
                      },
                      {
                        id: 'player_2',
                        external_id: 'ext_player_2',
                        level: 5,
                        current_score: -8,
                        position: 3,
                        attempts: { '1': 2, '2': 3 },
                        missed_cut: false,
                        odds: 8.2,
                        profile_id: 'profile_def',
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
