jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { getAllLeaguesHandler } from './getAllLeagues';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

const mockSelectExecute = (result: any, withWhere = false, shouldThrow = false) => {
  if (shouldThrow) {
    jest.spyOn(database as any, 'select').mockImplementation(() => ({
      from: () => ({
        execute: async () => {
          throw new Error('select failed');
        },
      }),
    }));
  } else if (withWhere) {
    jest.spyOn(database as any, 'select').mockImplementation(() => ({
      from: () => ({ where: () => ({ execute: async () => result }) }),
    }));
  } else {
    jest.spyOn(database as any, 'select').mockImplementation(() => ({
      from: () => ({ execute: async () => result }),
    }));
  }
};

test('getAllGamesHandler - returns 200 with all games when no filters', async () => {
  const res = mockResponse();
  const req = { query: {} } as unknown as Request;

  const games = [{ id: 'g1' }, { id: 'g2' }];
  mockSelectExecute(games);

  await getAllLeaguesHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: games });
});

test('getAllGamesHandler - returns 200 with filtered games', async () => {
  const res = mockResponse();
  const req = { query: { tournament_id: 't1' } } as unknown as Request;

  const games = [{ id: 'g1', tournament_id: 't1' }];
  mockSelectExecute(games, true);

  await getAllLeaguesHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: games });
});

test('getAllGamesHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  const req = { query: {} } as unknown as Request;

  mockSelectExecute(null, false, true);

  await getAllLeaguesHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'Internal Server Error' }));
});
