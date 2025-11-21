jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { getPlayerProfilesHandler } from './getPlayerProfiles';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

const mockSelectExecute = (result: any, shouldThrow = false) => {
  if (shouldThrow) {
    jest.spyOn(database as any, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          execute: async () => {
            throw new Error('select failed');
          },
        }),
        execute: async () => {
          throw new Error('select failed');
        },
      }),
    }));
  } else {
    jest.spyOn(database as any, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          execute: async () => result,
        }),
        execute: async () => result,
      }),
    }));
  }
};

test('getPlayerProfilesHandler - returns all player profiles grouped when no country filter', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { query: {} } as unknown as Request;

  const profiles = [
    { id: 'p1', first_name: 'John', last_name: 'Doe', country: 'USA', group: 'A' },
    { id: 'p2', first_name: 'Jane', last_name: 'Smith', country: 'UK', group: 'B' },
  ];
  mockSelectExecute(profiles);

  await getPlayerProfilesHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    data: [
      { name: 'A', players: [profiles[0]] },
      { name: 'B', players: [profiles[1]] },
    ],
  });
});

test('getPlayerProfilesHandler - filters by country and groups when provided', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { query: { country: 'USA' } } as unknown as Request;

  const profiles = [{ id: 'p1', first_name: 'John', last_name: 'Doe', country: 'USA', group: 'A' }];
  mockSelectExecute(profiles);

  await getPlayerProfilesHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    data: [{ name: 'A', players: profiles }],
  });
});

test('getPlayerProfilesHandler - groups players without group as Ungrouped', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { query: {} } as unknown as Request;

  const profiles = [
    { id: 'p1', first_name: 'John', last_name: 'Doe', country: 'USA', group: '' },
    { id: 'p2', first_name: 'Jane', last_name: 'Smith', country: 'UK', group: 'A' },
  ];
  mockSelectExecute(profiles);

  await getPlayerProfilesHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({
    data: [
      { name: 'Ungrouped', players: [profiles[0]] },
      { name: 'A', players: [profiles[1]] },
    ],
  });
});

test('getPlayerProfilesHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  (res as any).locals.user = { id: 'u1' };
  const req = { query: {} } as unknown as Request;

  mockSelectExecute(null, true);

  await getPlayerProfilesHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
