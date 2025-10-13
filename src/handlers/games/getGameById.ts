import { NextFunction, Request, Response } from 'express';
import { mockBets, mockGames, mockTournaments } from '../../models/__mocks';

/**
 * Get game by ID (authenticated endpoint)
 * @params id - required
 * @returns Game with Tournament and Bets
 */
export const getGameByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gameData = {
      game: mockGames[0],
      tournament: mockTournaments[0],
      user_bets: mockBets,
    };
    return res.status(200).send({ data: gameData, is_mock: true });
  } catch (error: any) {
    console.log(`GET GAME BY ID ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getGameByIdHandler.apiDescription = {
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
};
