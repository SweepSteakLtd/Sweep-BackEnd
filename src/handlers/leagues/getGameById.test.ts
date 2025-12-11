jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { getLeagueByIdHandler } from './getLeagueById';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = { user: { id: 'u1' } };
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

const mockSelectChain = (results: any[]) => {
  // first call: existingGame, second: tournament, third: bets
  const executeFunc = async () => results.shift();
  const impl = jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: () => ({ execute: executeFunc }),
        execute: executeFunc,
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

test('getGameByIdHandler - returns 200 with game, tournament and team counts', async () => {
  const res = mockResponse();
  const req = { params: { id: 'g1' } } as unknown as Request;

  const existingGame = [{ id: 'g1', tournament_id: 't1', entry_fee: 100 }];
  const tournament = [{ id: 't1', name: 'T' }];
  const teams = [{ id: 't1', league_id: 'g1', owner_id: 'u1' }, { id: 't2', league_id: 'g1', owner_id: 'u2' }];

  mockSelectChain([existingGame, tournament, teams]);

  await getLeagueByIdHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    data: {
      league: existingGame[0],
      tournament: tournament[0],
      user_team_count: 1, // user u1 has 1 team
      total_team_count: 2,
      total_pot: 180, // 2 teams * 100 entry_fee * 0.9
    },
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
