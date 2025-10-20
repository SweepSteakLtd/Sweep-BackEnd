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
import { AuthenticateEmailMiddleware, AuthenticateMiddleware } from '../middlewares';

type ApiSecurity = Array<{ [scheme: string]: any }>;

type ApiSchema = {
  type: string; // OpenAPI allows 'object', 'array', 'string', 'number', etc.
  properties?: Record<string, { type: string }>; // Only for 'object'
  items?: ApiSchema; // Only for 'array'
};

type ApiResponse = {
  description: string;
  content?: Record<string, { schema: ApiSchema }>;
};

type ApiRequestBody = {
  content: {
    [contentType: string]: { example: Record<string, string | number | boolean> };
  };
  required?: boolean;
};

export type ApiDescription = {
  security?: ApiSecurity;
  responses: Record<number, ApiResponse>;
  requestBody?: ApiRequestBody;
};

interface RouteEndpoint {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  name: string;
  stack: (RequestHandler & { apiDescription?: ApiDescription })[];
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
        stack: [AuthenticateEmailMiddleware, createUserHandler],
      },
      {
        method: 'get',
        name: '/me',
        stack: [AuthenticateMiddleware, getCurrentUserHandler],
      },
      {
        method: 'put',
        name: '/me',
        stack: [AuthenticateMiddleware, updateCurrentUserHandler],
      },
      {
        method: 'delete',
        name: '/me',
        stack: [AuthenticateMiddleware, deleteCurrentUserHandler],
      },
    ],
  },
  {
    apiName: 'games',
    endpoints: [
      {
        method: 'post',
        name: '/',
        stack: [AuthenticateMiddleware, createGameHandler],
      },
      {
        method: 'get',
        name: '/',
        stack: [AuthenticateMiddleware, getAllGamesHandler],
      },
      {
        method: 'get',
        name: '/:id',
        stack: [AuthenticateMiddleware, getGameByIdHandler],
      },
      {
        method: 'put',
        name: '/:id',
        stack: [AuthenticateMiddleware, updateGameHandler],
      },
      {
        method: 'delete',
        name: '/:id',
        stack: [AuthenticateMiddleware, deleteGameHandler],
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
      },
      {
        method: 'get',
        name: '/',
        stack: [getBetsHandler],
      },
      {
        method: 'put',
        name: '/:id',
        stack: [updateBetHandler],
      },
      {
        method: 'delete',
        name: '/:id',
        stack: [deleteBetHandler],
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
      },
      {
        method: 'put',
        name: '/games/:id',
        stack: [updateGameAdminHandler],
      },
      {
        method: 'delete',
        name: '/games/:id',
        stack: [deleteGameAdminHandler],
      },

      // Player profiles admin endpoints
      {
        method: 'post',
        name: '/player-profiles',
        stack: [createPlayerProfileHandler],
      },
      {
        method: 'get',
        name: '/player-profiles',
        stack: [getAllPlayerProfilesAdminHandler],
      },
      {
        method: 'put',
        name: '/player-profiles/:id',
        stack: [updatePlayerProfileHandler],
      },
      {
        method: 'delete',
        name: '/player-profiles/:id',
        stack: [deletePlayerProfileHandler],
      },

      // Players admin endpoints
      {
        method: 'post',
        name: '/players',
        stack: [createPlayerHandler],
      },
      {
        method: 'get',
        name: '/players/tournament/:tournamentId',
        stack: [getPlayersByTournamentHandler],
      },
      {
        method: 'put',
        name: '/players/:id',
        stack: [updatePlayerByIdHandler],
      },
      {
        method: 'delete',
        name: '/players/:id',
        stack: [deletePlayerByIdHandler],
      },

      // Tournaments admin endpoints
      {
        method: 'post',
        name: '/tournaments',
        stack: [createTournamentHandler],
      },
      {
        method: 'get',
        name: '/tournaments',
        stack: [getAllTournamentsHandler],
      },
      {
        method: 'put',
        name: '/tournaments/:id',
        stack: [updateTournamentHandler],
      },
      {
        method: 'delete',
        name: '/tournaments/:id',
        stack: [deleteTournamentHandler],
      },

      // Transactions admin endpoints
      {
        method: 'post',
        name: '/transactions',
        stack: [createTransactionHandler],
      },
      {
        method: 'get',
        name: '/transactions',
        stack: [getAllTransactionsHandler],
      },
      {
        method: 'put',
        name: '/transactions/:id',
        stack: [updateTransactionHandler],
      },
      {
        method: 'delete',
        name: '/transactions/:id',
        stack: [deleteTransactionHandler],
      },

      // Users admin endpoints
      {
        method: 'get',
        name: '/users',
        stack: [getAllUsersHandler],
      },
      {
        method: 'put',
        name: '/users/:id',
        stack: [updateUserHandler],
      },
      {
        method: 'delete',
        name: '/users/:id',
        stack: [deleteUserHandler],
      },
    ],
  },
];
