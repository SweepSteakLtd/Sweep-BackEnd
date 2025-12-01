import type { RequestHandler } from 'express';
import {
  createBetHandler,
  createLeagueHandler,
  createPlayerHandler,
  createPlayerProfileHandler,
  createTeamHandler,
  createTournamentHandler,
  createTransactionHandler,
  createUserHandler,
  deleteBetHandler,
  deleteCurrentUserHandler,
  deleteLeagueAdminHandler,
  deleteLeagueHandler,
  deletePlayerByIdHandler,
  deletePlayerProfileHandler,
  deleteTournamentHandler,
  deleteTransactionHandler,
  deleteUserHandler,
  fetchGBGStateHandler,
  getActivityHandler,
  getAllLeaguesAdminHandler,
  getAllLeaguesHandler,
  getAllPlayerProfilesAdminHandler,
  getAllTeamsHandler,
  getAllTournamentsHandler,
  getAllTransactionsHandler,
  getAllUsersHandler,
  getBetsHandler,
  getCurrentUserHandler,
  getLeaderboardHandler,
  getLeagueByIdHandler,
  getPlayerProfilesHandler,
  getPlayersByTournamentHandler,
  getTournamentsHandler,
  getTransactionsHandler,
  updateBetHandler,
  updateCurrentUserHandler,
  updateLeagueAdminHandler,
  updateLeagueHandler,
  updatePlayerProfileHandler,
  updateTeamHandler,
  updateTournamentHandler,
  updateTransactionHandler,
  updateUserHandler,
} from '../handlers';
import {
  AuthenticateAdminMiddleware,
  AuthenticateEmailMiddleware,
  AuthenticateMiddleware,
  CheckMonthlyBetLimitMiddleware,
  JoinCodeMiddleware,
} from '../middlewares';

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
      { method: 'get', name: '/verify/gbg', stack: [AuthenticateMiddleware, fetchGBGStateHandler] },
    ],
  },
  {
    apiName: 'tournaments',
    endpoints: [
      {
        method: 'get',
        name: '/',
        stack: [AuthenticateMiddleware, getTournamentsHandler],
      },
    ],
  },
  {
    apiName: 'teams',
    endpoints: [
      {
        method: 'post',
        name: '/',
        stack: [
          AuthenticateMiddleware,
          JoinCodeMiddleware,
          CheckMonthlyBetLimitMiddleware,
          createTeamHandler,
        ],
      },
      {
        method: 'get',
        name: '/',
        stack: [AuthenticateMiddleware, getAllTeamsHandler],
      },
      {
        method: 'put',
        name: '/:id',
        stack: [AuthenticateMiddleware, updateTeamHandler],
      },
    ],
  },
  {
    apiName: 'leagues',
    endpoints: [
      {
        method: 'post',
        name: '/',
        stack: [AuthenticateMiddleware, createLeagueHandler],
      },
      {
        method: 'get',
        name: '/',
        stack: [AuthenticateMiddleware, getAllLeaguesHandler],
      },
      {
        method: 'get',
        name: '/:id',
        stack: [AuthenticateMiddleware, JoinCodeMiddleware, getLeagueByIdHandler],
      },
      {
        method: 'put',
        name: '/:id',
        stack: [AuthenticateMiddleware, updateLeagueHandler],
      },
      {
        method: 'delete',
        name: '/:id',
        stack: [AuthenticateMiddleware, deleteLeagueHandler],
      },
    ],
  },
  {
    apiName: 'bets',
    endpoints: [
      {
        method: 'post',
        name: '/',
        stack: [AuthenticateMiddleware, CheckMonthlyBetLimitMiddleware, createBetHandler],
      },
      {
        method: 'get',
        name: '/',
        stack: [AuthenticateMiddleware, getBetsHandler],
      },
      {
        method: 'put',
        name: '/:id',
        stack: [AuthenticateMiddleware, updateBetHandler],
      },
      {
        method: 'delete',
        name: '/:id',
        stack: [AuthenticateMiddleware, deleteBetHandler],
      },
    ],
  },
  {
    apiName: 'player-profiles',
    endpoints: [
      {
        method: 'get',
        name: '/',
        stack: [AuthenticateMiddleware, getPlayerProfilesHandler],
      },
    ],
  },
  {
    apiName: 'transactions',
    endpoints: [
      {
        method: 'get',
        name: '/',
        stack: [AuthenticateMiddleware, getTransactionsHandler],
      },
    ],
  },
  {
    apiName: 'activities',
    endpoints: [
      {
        method: 'get',
        name: '/',
        stack: [AuthenticateMiddleware, getActivityHandler],
      },
    ],
  },
  {
    apiName: 'leaderboards',
    endpoints: [
      {
        method: 'get',
        name: '/:league_id',
        stack: [AuthenticateMiddleware, JoinCodeMiddleware, getLeaderboardHandler],
      },
    ],
  },
  {
    apiName: 'admin',
    endpoints: [
      // League admin endpoints
      {
        method: 'get',
        name: '/leagues',
        stack: [AuthenticateAdminMiddleware, getAllLeaguesAdminHandler],
      },
      {
        method: 'put',
        name: '/leagues/:id',
        stack: [AuthenticateAdminMiddleware, updateLeagueAdminHandler],
      },
      {
        method: 'delete',
        name: '/leagues/:id',
        stack: [AuthenticateAdminMiddleware, deleteLeagueAdminHandler],
      },

      // Player profiles admin endpoints
      {
        method: 'post',
        name: '/player-profiles',
        stack: [AuthenticateAdminMiddleware, createPlayerProfileHandler],
      },
      {
        method: 'get',
        name: '/player-profiles',
        stack: [AuthenticateAdminMiddleware, getAllPlayerProfilesAdminHandler],
      },
      {
        method: 'get',
        name: '/player-profiles/:id',
        stack: [AuthenticateAdminMiddleware, getAllPlayerProfilesAdminHandler],
      },
      {
        method: 'put',
        name: '/player-profiles/:id',
        stack: [AuthenticateAdminMiddleware, updatePlayerProfileHandler],
      },
      {
        method: 'delete',
        name: '/player-profiles/:id',
        stack: [AuthenticateAdminMiddleware, deletePlayerProfileHandler],
      },

      // Players admin endpoints
      {
        method: 'post',
        name: '/players',
        stack: [AuthenticateAdminMiddleware, createPlayerHandler],
      },
      {
        method: 'get',
        name: '/players/tournament/:tournamentId',
        stack: [AuthenticateAdminMiddleware, getPlayersByTournamentHandler],
      },
      // {
      //   method: 'put',
      //   name: '/players/:id',
      //   stack: [AuthenticateAdminMiddleware, updatePlayerByIdHandler],
      // },
      {
        method: 'delete',
        name: '/players/:id',
        stack: [AuthenticateAdminMiddleware, deletePlayerByIdHandler],
      },

      // Tournaments admin endpoints
      {
        method: 'post',
        name: '/tournaments',
        stack: [AuthenticateAdminMiddleware, createTournamentHandler],
      },
      {
        method: 'get',
        name: '/tournaments',
        stack: [AuthenticateAdminMiddleware, getAllTournamentsHandler],
      },
      {
        method: 'put',
        name: '/tournaments/:id',
        stack: [AuthenticateAdminMiddleware, updateTournamentHandler],
      },
      {
        method: 'delete',
        name: '/tournaments/:id',
        stack: [AuthenticateAdminMiddleware, deleteTournamentHandler],
      },

      // Transactions admin endpoints
      {
        method: 'post',
        name: '/transactions',
        stack: [AuthenticateAdminMiddleware, createTransactionHandler],
      },
      {
        method: 'get',
        name: '/transactions',
        stack: [AuthenticateAdminMiddleware, getAllTransactionsHandler],
      },
      {
        method: 'put',
        name: '/transactions/:id',
        stack: [AuthenticateAdminMiddleware, updateTransactionHandler],
      },
      {
        method: 'delete',
        name: '/transactions/:id',
        stack: [AuthenticateAdminMiddleware, deleteTransactionHandler],
      },

      // Users admin endpoints
      {
        method: 'get',
        name: '/users',
        stack: [AuthenticateAdminMiddleware, getAllUsersHandler],
      },
      {
        method: 'put',
        name: '/users/:id',
        stack: [AuthenticateAdminMiddleware, updateUserHandler],
      },
      {
        method: 'delete',
        name: '/users/:id',
        stack: [AuthenticateAdminMiddleware, deleteUserHandler],
      },
    ],
  },
];
