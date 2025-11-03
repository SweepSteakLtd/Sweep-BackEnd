import { eq, inArray } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { Bet, bets, League, leagues, Player, players, Team, teams, User } from '../../models';
import { database } from '../../services';

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
  responses: {
    200: {
      description: '200 OK',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    league: {},
                    team: {},
                    players: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                          },
                          external_id: {
                            type: 'string',
                          },
                          level: {
                            type: 'number',
                          },
                          current_score: {
                            type: 'number',
                          },
                          position: {
                            type: 'number',
                          },
                          attempts: {
                            type: 'object',
                            properties: {
                              hole1: {
                                type: 'number',
                              },
                              hole2: {
                                type: 'number',
                              },
                            },
                            required: ['hole1', 'hole2'],
                          },
                          missed_cut: {
                            type: 'boolean',
                          },
                          odds: {
                            type: 'number',
                          },
                          profile_id: {
                            type: 'string',
                          },
                          created_at: {
                            type: 'string',
                          },
                          updated_at: {
                            type: 'string',
                          },
                        },
                        required: [
                          'id',
                          'external_id',
                          'level',
                          'current_score',
                          'position',
                          'attempts',
                          'missed_cut',
                          'odds',
                          'profile_id',
                          'created_at',
                          'updated_at',
                        ],
                      },
                    },
                  },
                },
              },
            },
            required: ['data'],
          },
        },
      },
    },
    403: {
      description: '403 Forbidden',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    500: {
      description: '500 Internal Server Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};
