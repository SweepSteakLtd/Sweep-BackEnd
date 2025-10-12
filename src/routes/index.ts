import type { RequestHandler } from 'express';
import {
  createBetHandler,
  createGameHandler,
  createPlayerHandler,
  createPlayerProfileHandler,
  createTournamentHandler,
  createTransactionHandler,
  createUserHandler,
  deleteBetHandler,
  deleteCurrentUserHandler,
  deleteGameAdminHandler,
  deleteGameHandler,
  deletePlayerByIdHandler,
  deletePlayerProfileHandler,
  deleteTournamentHandler,
  deleteTransactionHandler,
  deleteUserHandler,
  getAllGamesAdminHandler,
  getAllGamesHandler,
  getAllPlayerProfilesAdminHandler,
  getAllTournamentsHandler,
  getAllTransactionsHandler,
  getAllUsersHandler,
  getBetsHandler,
  getCurrentUserHandler,
  getGameByIdHandler,
  getPlayerProfilesHandler,
  getPlayersByTournamentHandler,
  getTransactionsHandler,
  updateBetHandler,
  updateCurrentUserHandler,
  updateGameAdminHandler,
  updateGameHandler,
  updatePlayerByIdHandler,
  updatePlayerProfileHandler,
  updateTournamentHandler,
  updateTransactionHandler,
  updateUserHandler,
} from '../handlers';
import { AuthenticateMiddleware } from '../middlewares';

interface RouteEndpoint {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  name: string;
  stack: RequestHandler[];
  apiDescription: {
    responses: {
      [statusCode: number]: {
        description: string;
        content?: {
          [contentType: string]: {
            schema: {
              type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
              properties?: Record<string, { type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' }>;
            };
          };
        };
      };
    };
    requestBody?: any;
  };
}

interface RouteDescription {
  apiName: string;
  endpoints: RouteEndpoint[];
}

export const routes: RouteDescription[] = [
  {
    apiName: 'users',
    endpoints: [
      {
        method: 'post',
        name: '/',
        stack: [createUserHandler],
        apiDescription: {
          responses: {
            201: {
              description: '201 Created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      first_name: { type: 'string' },
                      last_name: { type: 'string' },
                      email: { type: 'string' },
                      bio: { type: 'string' },
                      profile_picture: { type: 'string' },
                      phone_number: { type: 'string' },
                      game_stop_id: { type: 'string' },
                      is_auth_verified: { type: 'boolean' },
                      is_identity_verified: { type: 'boolean' },
                      deposit_limit: { type: 'number' },
                      betting_limit: { type: 'number' },
                      payment_id: { type: 'string' },
                      current_balance: { type: 'number' },
                      created_at: { type: 'string' },
                      updated_at: { type: 'string' },
                    },
                  },
                },
              },
            },
            422: {
              description: '422 Validation Error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string' },
                      message: { type: 'string' },
                      details: { type: 'array' },
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

          requestBody: {
            content: {
              'application/json': {
                example: {
                  id: 'user123',
                  first_name: 'John',
                  last_name: 'Doe',
                  email: 'john.doe@example.com',
                  bio: 'Golf enthusiast',
                  profile_picture: 'https://example.com/avatar.jpg',
                  phone_number: '+1234567890',
                  game_stop_id: 'gs123',
                },
              },
            },
            required: true,
          },
        },
      },
      {
        method: 'get',
        name: '/me',
        stack: [AuthenticateMiddleware, getCurrentUserHandler],
        apiDescription: {
          responses: {
            200: {
              description: '200 OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      first_name: { type: 'string' },
                      last_name: { type: 'string' },
                      email: { type: 'string' },
                      bio: { type: 'string' },
                      profile_picture: { type: 'string' },
                      phone_number: { type: 'string' },
                      game_stop_id: { type: 'string' },
                      is_auth_verified: { type: 'boolean' },
                      is_identity_verified: { type: 'boolean' },
                      deposit_limit: { type: 'number' },
                      betting_limit: { type: 'number' },
                      payment_id: { type: 'string' },
                      current_balance: { type: 'number' },
                      created_at: { type: 'string' },
                      updated_at: { type: 'string' },
                    },
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
        },
      },
      {
        method: 'put',
        name: '/me',
        stack: [AuthenticateMiddleware, updateCurrentUserHandler],
        apiDescription: {
          responses: {
            200: {
              description: '200 OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      first_name: { type: 'string' },
                      last_name: { type: 'string' },
                      email: { type: 'string' },
                      bio: { type: 'string' },
                      profile_picture: { type: 'string' },
                      phone_number: { type: 'string' },
                      game_stop_id: { type: 'string' },
                      is_auth_verified: { type: 'boolean' },
                      is_identity_verified: { type: 'boolean' },
                      deposit_limit: { type: 'number' },
                      betting_limit: { type: 'number' },
                      payment_id: { type: 'string' },
                      current_balance: { type: 'number' },
                      created_at: { type: 'string' },
                      updated_at: { type: 'string' },
                    },
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
              description: '422 Validation Error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string' },
                      message: { type: 'string' },
                      details: { type: 'array' },
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
        },
      },
      {
        method: 'delete',
        name: '/me',
        stack: [AuthenticateMiddleware, deleteCurrentUserHandler],
        apiDescription: {
          responses: {
            204: {
              description: '204 No Content',
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
        },
      },
    ],
  },
  {
    apiName: 'games',
    endpoints: [
      {
        method: 'post',
        name: '/',
        stack: [createGameHandler],
        apiDescription: {
          responses: {
            201: {
              description: '201 Created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                      entry_fee: { type: 'number' },
                      contact_phone: { type: 'string' },
                      contact_email: { type: 'string' },
                      contact_visibility: { type: 'boolean' },
                      join_code: { type: 'string' },
                      max_participants: { type: 'number' },
                      rewards: { type: 'array' },
                      start_time: { type: 'string' },
                      end_time: { type: 'string' },
                      owner_id: { type: 'string' },
                      tournament_id: { type: 'string' },
                      user_id_list: { type: 'array' },
                      created_at: { type: 'string' },
                      updated_at: { type: 'string' },
                    },
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
              description: '422 Validation Error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string' },
                      message: { type: 'string' },
                      details: { type: 'array' },
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
        },
      },
      {
        method: 'get',
        name: '/',
        stack: [getAllGamesHandler],
        apiDescription: {
          responses: {
            200: {
              description: '200 OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
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
        },
      },
      {
        method: 'get',
        name: '/:id',
        stack: [getGameByIdHandler],
        apiDescription: {
          responses: {
            200: {
              description: '200 OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
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
        },
      },
      {
        method: 'put',
        name: '/:id',
        stack: [updateGameHandler],
        apiDescription: {
          responses: {
            200: { description: '200 OK' },
            403: { description: '403 Forbidden' },
            422: { description: '422 Validation Error' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'delete',
        name: '/:id',
        stack: [deleteGameHandler],
        apiDescription: {
          responses: {
            204: { description: '204 No Content' },
            403: { description: '403 Forbidden' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
    ],
  },
  {
    apiName: 'bets',
    endpoints: [
      {
        method: 'post',
        name: '/',
        stack: [createBetHandler],
        apiDescription: {
          responses: {
            201: {
              description: '201 Created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      owner_id: { type: 'string' },
                      game_id: { type: 'string' },
                      player_id: { type: 'string' },
                      created_at: { type: 'string' },
                      updated_at: { type: 'string' },
                    },
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
              description: '422 Validation Error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string' },
                      message: { type: 'string' },
                      details: { type: 'array' },
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
        },
      },
      {
        method: 'get',
        name: '/',
        stack: [getBetsHandler],
        apiDescription: {
          responses: {
            200: {
              description: '200 OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
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
        },
      },
      {
        method: 'put',
        name: '/:id',
        stack: [updateBetHandler],
        apiDescription: {
          responses: {
            200: { description: '200 OK' },
            403: { description: '403 Forbidden' },
            422: { description: '422 Validation Error' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'delete',
        name: '/:id',
        stack: [deleteBetHandler],
        apiDescription: {
          responses: {
            204: { description: '204 No Content' },
            403: { description: '403 Forbidden' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
    ],
  },
  {
    apiName: 'player-profiles',
    endpoints: [
      {
        method: 'get',
        name: '/',
        stack: [getPlayerProfilesHandler],
        apiDescription: {
          responses: {
            200: {
              description: '200 OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
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
        },
      },
    ],
  },
  {
    apiName: 'transactions',
    endpoints: [
      {
        method: 'get',
        name: '/',
        stack: [getTransactionsHandler],
        apiDescription: {
          responses: {
            200: {
              description: '200 OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
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
        },
      },
    ],
  },
  {
    apiName: 'admin',
    endpoints: [
      // Games admin endpoints
      {
        method: 'get',
        name: '/games',
        stack: [getAllGamesAdminHandler],
        apiDescription: {
          responses: {
            200: { description: '200 OK' },
            403: { description: '403 Forbidden' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'put',
        name: '/games/:id',
        stack: [updateGameAdminHandler],
        apiDescription: {
          responses: {
            200: { description: '200 OK' },
            403: { description: '403 Forbidden' },
            422: { description: '422 Validation Error' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'delete',
        name: '/games/:id',
        stack: [deleteGameAdminHandler],
        apiDescription: {
          responses: {
            204: { description: '204 No Content' },
            403: { description: '403 Forbidden' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },

      // Player profiles admin endpoints
      {
        method: 'post',
        name: '/player-profiles',
        stack: [createPlayerProfileHandler],
        apiDescription: {
          responses: {
            201: { description: '201 Created' },
            403: { description: '403 Forbidden' },
            422: { description: '422 Validation Error' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'get',
        name: '/player-profiles',
        stack: [getAllPlayerProfilesAdminHandler],
        apiDescription: {
          responses: {
            200: { description: '200 OK' },
            403: { description: '403 Forbidden' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'put',
        name: '/player-profiles/:id',
        stack: [updatePlayerProfileHandler],
        apiDescription: {
          responses: {
            200: { description: '200 OK' },
            403: { description: '403 Forbidden' },
            422: { description: '422 Validation Error' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'delete',
        name: '/player-profiles/:id',
        stack: [deletePlayerProfileHandler],
        apiDescription: {
          responses: {
            204: { description: '204 No Content' },
            403: { description: '403 Forbidden' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },

      // Players admin endpoints
      {
        method: 'post',
        name: '/players',
        stack: [createPlayerHandler],
        apiDescription: {
          responses: {
            201: { description: '201 Created' },
            403: { description: '403 Forbidden' },
            422: { description: '422 Validation Error' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'get',
        name: '/players/tournament/:tournamentId',
        stack: [getPlayersByTournamentHandler],
        apiDescription: {
          responses: {
            200: { description: '200 OK' },
            403: { description: '403 Forbidden' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'put',
        name: '/players/:id',
        stack: [updatePlayerByIdHandler],
        apiDescription: {
          responses: {
            200: { description: '200 OK' },
            403: { description: '403 Forbidden' },
            422: { description: '422 Validation Error' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'delete',
        name: '/players/:id',
        stack: [deletePlayerByIdHandler],
        apiDescription: {
          responses: {
            204: { description: '204 No Content' },
            403: { description: '403 Forbidden' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },

      // Tournaments admin endpoints
      {
        method: 'post',
        name: '/tournaments',
        stack: [createTournamentHandler],
        apiDescription: {
          responses: {
            201: { description: '201 Created' },
            403: { description: '403 Forbidden' },
            422: { description: '422 Validation Error' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'get',
        name: '/tournaments',
        stack: [getAllTournamentsHandler],
        apiDescription: {
          responses: {
            200: { description: '200 OK' },
            403: { description: '403 Forbidden' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'put',
        name: '/tournaments/:id',
        stack: [updateTournamentHandler],
        apiDescription: {
          responses: {
            200: { description: '200 OK' },
            403: { description: '403 Forbidden' },
            422: { description: '422 Validation Error' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'delete',
        name: '/tournaments/:id',
        stack: [deleteTournamentHandler],
        apiDescription: {
          responses: {
            204: { description: '204 No Content' },
            403: { description: '403 Forbidden' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },

      // Transactions admin endpoints
      {
        method: 'post',
        name: '/transactions',
        stack: [createTransactionHandler],
        apiDescription: {
          responses: {
            201: { description: '201 Created' },
            403: { description: '403 Forbidden' },
            422: { description: '422 Validation Error' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'get',
        name: '/transactions',
        stack: [getAllTransactionsHandler],
        apiDescription: {
          responses: {
            200: { description: '200 OK' },
            403: { description: '403 Forbidden' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'put',
        name: '/transactions/:id',
        stack: [updateTransactionHandler],
        apiDescription: {
          responses: {
            200: { description: '200 OK' },
            403: { description: '403 Forbidden' },
            422: { description: '422 Validation Error' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
      {
        method: 'delete',
        name: '/transactions/:id',
        stack: [deleteTransactionHandler],
        apiDescription: {
          responses: {
            204: { description: '204 No Content' },
            403: { description: '403 Forbidden' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },

      // Users admin endpoints
      {
        method: 'get',
        name: '/users',
        stack: [getAllUsersHandler],
        apiDescription: {
          responses: {
            200: {
              description: '200 OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
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
        },
      },
      {
        method: 'put',
        name: '/users/:id',
        stack: [updateUserHandler],
        apiDescription: {
          responses: {
            200: {
              description: '200 OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
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
              description: '422 Validation Error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string' },
                      message: { type: 'string' },
                      details: { type: 'array' },
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
        },
      },
      {
        method: 'delete',
        name: '/users/:id',
        stack: [deleteUserHandler],
        apiDescription: {
          responses: {
            204: { description: '204 No Content' },
            403: { description: '403 Forbidden' },
            500: { description: '500 Internal Server Error' },
          },
        },
      },
    ],
  },
];
