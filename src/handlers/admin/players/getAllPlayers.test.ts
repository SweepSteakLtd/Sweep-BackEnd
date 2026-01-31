jest.mock('../../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../../services';
import { getPlayersByTournamentHandler } from './getAllPlayers';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

test('getPlayersByTournamentHandler - returns all players when no tournament_id', async () => {
  const res = mockResponse();
  const req = { params: {} } as unknown as Request;

  const players = [
    { id: 'p1', external_ids: { datagolf: 27644 }, level: 1 },
    { id: 'p2', external_ids: { datagolf: 10959 }, level: 2 },
  ];

  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({
      execute: async () => players,
    }),
  }));

  await getPlayersByTournamentHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: players });
});

test('getPlayersByTournamentHandler - returns 422 when tournament not found', async () => {
  const res = mockResponse();
  const req = { params: { tournament_id: 't1' } } as unknown as Request;

  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    where: () => ({
      execute: async () => [],
    }),
  }));

  await getPlayersByTournamentHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith({
    error: 'Missing tournament',
    message: 'Tournament with provided ID doesnt exist',
  });
});

test('getPlayersByTournamentHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  const req = { params: {} } as unknown as Request;

  jest.spyOn(database as any, 'select').mockImplementation(() => ({
    from: () => ({
      execute: async () => {
        throw new Error('select failed');
      },
    }),
  }));

  await getPlayersByTournamentHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
