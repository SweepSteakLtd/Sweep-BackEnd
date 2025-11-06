jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { getLeagueByIdHandler } from './getLeagueById';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

const mockSelectChain = (results: any[]) => {
  // first call: existingGame, second: tournament, third: bets
  const impl = jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: () => ({ execute: async () => results.shift() }),
      }),
    }),
  }));
  return impl;
};

test('getGameByIdHandler - returns 422 when id missing', async () => {
  const res = mockResponse();
  const req = { params: {} } as unknown as Request;

  await getLeagueByIdHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith({
    error: 'Invalid request body',
    message: 'required properties missing',
  });
});

test('getGameByIdHandler - returns 403 when game not found', async () => {
  const res = mockResponse();
  const req = { params: { id: 'g1' } } as unknown as Request;

  mockSelectChain([[]]);

  await getLeagueByIdHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.send).toHaveBeenCalledWith({
    error: 'Missing league',
    message: "league doesn't exist",
  });
});

test('getGameByIdHandler - returns 200 with game, tournament and bets', async () => {
  const res = mockResponse();
  const req = { params: { id: 'g1' } } as unknown as Request;

  const existingGame = [{ id: 'g1', tournament_id: 't1' }];
  const tournament = [{ id: 't1', name: 'T' }];
  const bets = [{ id: 'b1', game_id: 'g1' }];

  mockSelectChain([existingGame, tournament, bets]);

  await getLeagueByIdHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    data: { league: existingGame[0], tournament: tournament[0], user_bets: bets },
  });
});

test('getGameByIdHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  const req = { params: { id: 'g1' } } as unknown as Request;

  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: () => ({
          execute: async () => {
            throw new Error('select failed');
          },
        }),
      }),
    }),
  }));

  await getLeagueByIdHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
