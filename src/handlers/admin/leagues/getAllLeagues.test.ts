jest.mock('../../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../../services';
import { getAllLeaguesAdminHandler } from './getAllLeagues';

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

test('getAllLeaguesAdminHandler - returns all leagues', async () => {
  const res = mockResponse();
  const req = { query: {} } as unknown as Request;

  const leagues = [
    { id: 'l1', name: 'League 1', description: 'Test league 1' },
    { id: 'l2', name: 'League 2', description: 'Test league 2' },
  ];
  mockSelectExecute(leagues);

  await getAllLeaguesAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ data: leagues });
});

test('getAllLeaguesAdminHandler - returns 422 when entry_fee is invalid', async () => {
  const res = mockResponse();
  const req = { query: { entry_fee: 'not-a-number' } } as unknown as Request;

  await getAllLeaguesAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid query parameter',
      message: 'entry_fee must be a non-negative number',
    }),
  );
});

test('getAllLeaguesAdminHandler - returns 422 when entry_fee is negative', async () => {
  const res = mockResponse();
  const req = { query: { entry_fee: '-10' } } as unknown as Request;

  await getAllLeaguesAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid query parameter',
      message: 'entry_fee must be a non-negative number',
    }),
  );
});

test('getAllLeaguesAdminHandler - returns 422 when owner_id is empty string', async () => {
  const res = mockResponse();
  const req = { query: { owner_id: '   ' } } as unknown as Request;

  await getAllLeaguesAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid query parameter',
      message: 'owner_id must be a non-empty string',
    }),
  );
});

test('getAllLeaguesAdminHandler - returns 422 when tournament_id is empty string', async () => {
  const res = mockResponse();
  const req = { query: { tournament_id: '   ' } } as unknown as Request;

  await getAllLeaguesAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'Invalid query parameter',
      message: 'tournament_id must be a non-empty string',
    }),
  );
});

test('getAllLeaguesAdminHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  const req = { query: {} } as unknown as Request;

  mockSelectExecute(null, true);

  await getAllLeaguesAdminHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});
