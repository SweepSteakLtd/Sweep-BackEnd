import { inArray } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { players, Tournament, tournamentAd, tournamentHole, tournaments } from '../../models';
import { database } from '../../services';
import { apiKeyAuth } from '../schemas';

/**
 * Get all tournaments (auth endpoint)
 * @query status - optional
 * @returns Tournament[]
 */
export const getTournamentsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existingTournaments = await database.select().from(tournaments);

    const wholeTournaments = await Promise.all(
      existingTournaments.map(async (tournament: Tournament) => {
        const existingHoles = await database
          .select()
          .from(tournamentHole)
          .where(inArray(tournamentHole.id, tournament.holes));

        const existingAds = await database
          .select()
          .from(tournamentAd)
          .where(inArray(tournamentAd.id, tournament.ads));

        const existingPlayers = await database
          .select()
          .from(players)
          .where(inArray(players.id, tournament.players));

        return {
          ...tournament,
          holes: existingHoles,
          ads: existingAds,
          players: existingPlayers,
        };
      }),
    );

    return res.status(200).send({ data: wholeTournaments });
  } catch (error: any) {
    console.log(`GET ALL TOURNAMENTS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
getTournamentsHandler.apiDescription = {
  summary: 'Get all tournaments',
  description:
    'Retrieves all tournaments with complete details including holes, ads, and players. Each tournament includes its full nested data.',
  operationId: 'getTournaments',
  tags: ['tournaments'],
  responses: {
    200: {
      description: 'Tournaments retrieved successfully',
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
                    id: {
                      type: 'string',
                    },
                    name: {
                      type: 'string',
                    },
                    starts_at: {
                      type: 'string',
                    },
                    finishes_at: {
                      type: 'string',
                    },
                    description: {
                      type: 'string',
                    },
                    url: {
                      type: 'string',
                    },
                    cover_picture: {
                      type: 'string',
                    },
                    gallery: {
                      type: 'array',
                      items: {
                        type: 'string',
                      },
                    },
                    holes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                          },
                          name: {
                            type: 'string',
                          },
                          description: {
                            type: 'string',
                          },
                          position: {
                            type: 'number',
                          },
                          cover_image: {
                            type: 'string',
                          },
                          par: {
                            type: 'number',
                          },
                          distance: {
                            type: 'number',
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
                          'name',
                          'description',
                          'position',
                          'cover_image',
                          'par',
                          'distance',
                          'created_at',
                          'updated_at',
                        ],
                      },
                    },
                    ads: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                          },
                          name: {
                            type: 'string',
                          },
                          description: {
                            type: 'string',
                          },
                          position: {
                            type: 'number',
                          },
                          website: {
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
                          'name',
                          'description',
                          'position',
                          'website',
                          'created_at',
                          'updated_at',
                        ],
                      },
                    },
                    proposed_entry_fee: {
                      type: 'number',
                    },
                    maximum_cut_amount: {
                      type: 'number',
                    },
                    maximum_score_generator: {
                      type: 'number',
                    },
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
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                day: {
                                  type: 'string',
                                },
                                hole_id: {
                                  type: 'string',
                                },
                                hole_name: {
                                  type: 'string',
                                },
                                par: {
                                  type: 'number',
                                },
                                attempt: {
                                  type: 'number',
                                },
                              },
                              required: ['day', 'hole_id', 'hole_name', 'par', 'attempt'],
                            },
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
                          'profile_id',
                          'created_at',
                          'updated_at',
                        ],
                      },
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
                    'name',
                    'starts_at',
                    'finishes_at',
                    'description',
                    'url',
                    'cover_picture',
                    'gallery',
                    'holes',
                    'ads',
                    'proposed_entry_fee',
                    'maximum_cut_amount',
                    'maximum_score_generator',
                    'players',
                    'created_at',
                    'updated_at',
                  ],
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
    422: {
      description: '422 validation Error',
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
  security: [apiKeyAuth],
};
