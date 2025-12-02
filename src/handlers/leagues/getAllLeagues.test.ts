jest.mock('../../services');

import { NextFunction, Request, Response } from 'express';
import { database } from '../../services';
import { getAllLeaguesHandler } from './getAllLeagues';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

afterEach(() => jest.resetAllMocks());

const mockSelectExecute = (result: any, shouldThrow = false, nameQueryResult?: any) => {
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
          execute: async () => (nameQueryResult !== undefined ? nameQueryResult : result),
        }),
        execute: async () => result,
      }),
    }));
  }
};

test('getAllLeaguesHandler - returns all leagues when no filters', async () => {
  const res = mockResponse();
  res.locals.user = { id: 'user_123' };
  const req = { query: {} } as unknown as Request;

  const leagues = [
    {
      id: 'l1',
      name: 'League 1',
      description: 'Test league 1',
      entry_fee: 100,
      owner_id: 'user_123',
      join_code: 'ABC123',
    },
    {
      id: 'l2',
      name: 'League 2',
      description: 'Test league 2',
      entry_fee: 200,
      owner_id: 'user_456',
      join_code: 'DEF456',
    },
  ];
  mockSelectExecute(leagues);

  await getAllLeaguesHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  const sent = (res.send as jest.Mock).mock.calls[0][0];
  expect(sent.data.length).toBe(2);
  // User owns first league, should have join_code
  expect(sent.data[0].join_code).toBe('ABC123');
  // User doesn't own second league, should not have join_code
  expect(sent.data[1].join_code).toBeUndefined();
});

test('getAllLeaguesHandler - returns filtered leagues by search term', async () => {
  const res = mockResponse();
  res.locals.user = { id: 'user_123' };
  const req = { query: { search_term: 'awesome' } } as unknown as Request;

  const leagues = [
    {
      id: 'l1',
      name: 'Awesome League',
      description: 'Test league 1',
      entry_fee: 100,
      owner_id: 'user_123',
      join_code: 'ABC123',
    },
    {
      id: 'l2',
      name: 'League 2',
      description: 'An awesome league',
      entry_fee: 200,
      owner_id: 'user_456',
      join_code: 'DEF456',
    },
    {
      id: 'l3',
      name: 'League 3',
      description: 'Test league 3',
      entry_fee: 300,
      owner_id: 'user_789',
      join_code: 'GHI789',
    },
  ];
  mockSelectExecute(leagues);

  await getAllLeaguesHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  const sent = (res.send as jest.Mock).mock.calls[0][0];
  expect(sent.data.length).toBe(2);
  expect(sent.data[0].id).toBe('l1');
  expect(sent.data[0].join_code).toBe('ABC123'); // User owns this league
  expect(sent.data[1].id).toBe('l2');
  expect(sent.data[1].join_code).toBeUndefined(); // User doesn't own this league
});

test('getAllLeaguesHandler - removes join_code from all leagues when user not authenticated', async () => {
  const res = mockResponse();
  // No user in res.locals
  const req = { query: {} } as unknown as Request;

  const leagues = [
    {
      id: 'l1',
      name: 'League 1',
      description: 'Test league 1',
      entry_fee: 100,
      owner_id: 'user_123',
      join_code: 'ABC123',
    },
    {
      id: 'l2',
      name: 'League 2',
      description: 'Test league 2',
      entry_fee: 200,
      owner_id: 'user_456',
      join_code: 'DEF456',
    },
  ];
  mockSelectExecute(leagues);

  await getAllLeaguesHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(200);
  const sent = (res.send as jest.Mock).mock.calls[0][0];
  expect(sent.data.length).toBe(2);
  // No user authenticated, all join_codes should be removed
  expect(sent.data[0].join_code).toBeUndefined();
  expect(sent.data[1].join_code).toBeUndefined();
});

test('getAllLeaguesHandler - returns 500 on DB error', async () => {
  const res = mockResponse();
  const req = { query: {} } as unknown as Request;

  mockSelectExecute(null, true);

  await getAllLeaguesHandler(req, res, mockNext);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Internal Server Error' }),
  );
});

describe('getAllLeaguesHandler - name query parameter', () => {
  test('returns leagues matching exact name (case-insensitive)', async () => {
    const res = mockResponse();
    res.locals.user = { id: 'user_123' };
    const req = { query: { name: 'Masters Championship League' } } as unknown as Request;

    const leagues = [
      {
        id: 'l1',
        name: 'Masters Championship League',
        description: 'Test league 1',
        entry_fee: 100,
        owner_id: 'user_456',
        join_code: 'ABC123',
        type: 'private',
      },
    ];
    mockSelectExecute([], false, leagues);

    await getAllLeaguesHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    const sent = (res.send as jest.Mock).mock.calls[0][0];
    expect(sent.data.length).toBe(1);
    expect(sent.data[0].id).toBe('l1');
    expect(sent.data[0].name).toBe('Masters Championship League');
  });

  test('bypasses privacy filters when searching by name', async () => {
    const res = mockResponse();
    res.locals.user = { id: 'user_123' };
    const req = { query: { name: 'Private League' } } as unknown as Request;

    const leagues = [
      {
        id: 'l1',
        name: 'Private League',
        description: 'A private league',
        entry_fee: 100,
        owner_id: 'user_456',
        join_code: 'ABC123',
        type: 'private',
      },
      {
        id: 'l2',
        name: 'Private League',
        description: 'Another private league',
        entry_fee: 200,
        owner_id: 'user_789',
        join_code: 'DEF456',
        type: 'private',
      },
    ];
    mockSelectExecute([], false, leagues);

    await getAllLeaguesHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    const sent = (res.send as jest.Mock).mock.calls[0][0];
    // Should return both private leagues even though user doesn't own them
    expect(sent.data.length).toBe(2);
    expect(sent.data[0].id).toBe('l1');
    expect(sent.data[1].id).toBe('l2');
    // join_code should still be removed for non-owned leagues
    expect(sent.data[0].join_code).toBeUndefined();
    expect(sent.data[1].join_code).toBeUndefined();
  });

  test('includes join_code for owned leagues when searching by name', async () => {
    const res = mockResponse();
    res.locals.user = { id: 'user_123' };
    const req = { query: { name: 'My League' } } as unknown as Request;

    const leagues = [
      {
        id: 'l1',
        name: 'My League',
        description: 'My private league',
        entry_fee: 100,
        owner_id: 'user_123',
        join_code: 'ABC123',
        type: 'private',
      },
    ];
    mockSelectExecute([], false, leagues);

    await getAllLeaguesHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    const sent = (res.send as jest.Mock).mock.calls[0][0];
    expect(sent.data.length).toBe(1);
    expect(sent.data[0].id).toBe('l1');
    // User owns this league, should have join_code
    expect(sent.data[0].join_code).toBe('ABC123');
  });

  test('returns empty array when no leagues match name', async () => {
    const res = mockResponse();
    res.locals.user = { id: 'user_123' };
    const req = { query: { name: 'Nonexistent League' } } as unknown as Request;

    mockSelectExecute([], false, []);

    await getAllLeaguesHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    const sent = (res.send as jest.Mock).mock.calls[0][0];
    expect(sent.data.length).toBe(0);
  });

  test('name parameter takes precedence over other filters', async () => {
    const res = mockResponse();
    res.locals.user = { id: 'user_123' };
    const req = {
      query: {
        name: 'Specific League',
        tournament_id: 'tournament_123',
        search_term: 'other',
      },
    } as unknown as Request;

    const leagues = [
      {
        id: 'l1',
        name: 'Specific League',
        description: 'Test league',
        entry_fee: 100,
        owner_id: 'user_456',
        join_code: 'ABC123',
        type: 'public',
        tournament_id: 'tournament_999', // Different tournament
      },
    ];
    mockSelectExecute([], false, leagues);

    await getAllLeaguesHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    const sent = (res.send as jest.Mock).mock.calls[0][0];
    // Should return the league matching name, ignoring other filters
    expect(sent.data.length).toBe(1);
    expect(sent.data[0].id).toBe('l1');
  });

  test('returns multiple leagues with the same name', async () => {
    const res = mockResponse();
    res.locals.user = { id: 'user_123' };
    const req = { query: { name: 'Championship League' } } as unknown as Request;

    const leagues = [
      {
        id: 'l1',
        name: 'Championship League',
        description: 'First instance',
        entry_fee: 100,
        owner_id: 'user_456',
        join_code: 'ABC123',
        type: 'public',
      },
      {
        id: 'l2',
        name: 'Championship League',
        description: 'Second instance',
        entry_fee: 200,
        owner_id: 'user_789',
        join_code: 'DEF456',
        type: 'private',
      },
      {
        id: 'l3',
        name: 'Championship League',
        description: 'User owned',
        entry_fee: 150,
        owner_id: 'user_123',
        join_code: 'GHI789',
        type: 'private',
      },
    ];
    mockSelectExecute([], false, leagues);

    await getAllLeaguesHandler(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    const sent = (res.send as jest.Mock).mock.calls[0][0];
    expect(sent.data.length).toBe(3);
    expect(sent.data[0].id).toBe('l1');
    expect(sent.data[1].id).toBe('l2');
    expect(sent.data[2].id).toBe('l3');
    // Only user-owned league should have join_code
    expect(sent.data[0].join_code).toBeUndefined();
    expect(sent.data[1].join_code).toBeUndefined();
    expect(sent.data[2].join_code).toBe('GHI789');
  });
});
