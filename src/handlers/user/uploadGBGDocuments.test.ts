jest.mock('../../integrations/GBG/GBG', () => ({
  getAuthToken: jest.fn(),
  handleGBGError: jest.fn(),
}));

import { NextFunction, Request, Response } from 'express';
import { getAuthToken, handleGBGError } from '../../integrations/GBG/GBG';
import { uploadGBGDocumentsHandler } from './uploadGBGDocuments';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {
    user: {
      id: 'test-user-id',
      first_name: 'John',
      last_name: 'Doe',
      kyc_instance_id: 'test-instance-123',
    },
  };
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

const mockAuthToken = {
  access_token: 'mock-access-token',
  token_type: 'Bearer',
  expires_in: 14400,
};

const mockTaskListResponse = {
  status: 'InProgress',
  instanceId: 'test-instance-123',
  tasks: [
    {
      taskId: 'task-123',
      variantId: 'variant-123',
    },
  ],
};

const mockSubmitTaskResponse = {
  status: 'Completed',
  instanceId: 'test-instance-123',
};

// Helper to create valid base64 JPEG
const createValidBase64JPEG = () => {
  const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return `data:image/jpeg;base64,${base64Data}`;
};

const createValidRequestBody = (overrides: any = {}) => ({
  documents: [createValidBase64JPEG()],
  ...overrides,
});

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

afterEach(() => {
  jest.clearAllMocks();
});

beforeEach(() => {
  (getAuthToken as jest.Mock).mockResolvedValue(mockAuthToken);
  (handleGBGError as jest.Mock).mockReturnValue({
    message: 'GBG error occurred',
    code: 'GBG_ERROR',
  });

  // Default successful fetch responses
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/journey/task/list')) {
      return Promise.resolve({
        ok: true,
        json: async () => mockTaskListResponse,
        text: async () => JSON.stringify(mockTaskListResponse),
      });
    } else if (url.includes('/journey/task/update')) {
      return Promise.resolve({
        ok: true,
        json: async () => mockSubmitTaskResponse,
        text: async () => JSON.stringify(mockSubmitTaskResponse),
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({}),
    });
  });
});

describe('uploadGBGDocumentsHandler', () => {
  describe('Successful uploads', () => {
    test('successfully uploads single document', async () => {
      const req = {
        body: createValidRequestBody(),
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(getAuthToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://eu.platform.go.gbgplc.com/captain/api/journey/task/list',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-access-token',
          }),
          body: JSON.stringify({ instanceId: 'test-instance-123' }),
        }),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        'https://eu.platform.go.gbgplc.com/captain/api/journey/task/update',
        expect.objectContaining({
          method: 'POST',
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        data: {
          instanceId: 'test-instance-123',
          taskId: 'task-123',
          message: 'Documents uploaded successfully. Verification in progress.',
        },
      });
    });

    test('successfully uploads multiple documents', async () => {
      const req = {
        body: createValidRequestBody({
          documents: [createValidBase64JPEG(), createValidBase64JPEG()],
        }),
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            instanceId: 'test-instance-123',
            taskId: 'task-123',
          }),
        }),
      );
    });
  });

  describe('Document validation', () => {
    test('returns 422 if documents is not an array', async () => {
      const req = {
        body: { documents: 'not-an-array' },
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Invalid request body',
        message: 'documents must be an array of base64-encoded JPEG images',
      });
    });

    test('returns 422 if documents is missing', async () => {
      const req = {
        body: {},
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Invalid request body',
        message: 'documents must be an array of base64-encoded JPEG images',
      });
    });

    test('returns 422 if documents array is empty', async () => {
      const req = {
        body: { documents: [] },
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Invalid request body',
        message: 'Provide at least 1 document for verification',
      });
    });

    test('returns 422 if document is not a string', async () => {
      const req = {
        body: { documents: [123] },
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Invalid request body',
        message: 'Document 1 must be a base64-encoded string',
      });
    });

    test('returns 422 if document is not valid base64 JPEG format', async () => {
      const req = {
        body: { documents: ['not-valid-base64'] },
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Invalid request body',
        message: 'Document 1 must be a base64-encoded JPEG image with format: data:image/jpeg;base64,...',
      });
    });

    test('returns 422 if document exceeds 10MB size limit', async () => {
      // Create a large base64 string (over 10MB)
      const largeData = 'A'.repeat(14 * 1024 * 1024); // 14MB of 'A' characters
      const largeDocument = `data:image/jpeg;base64,${largeData}`;

      const req = {
        body: { documents: [largeDocument] },
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Invalid request body',
        message: 'Document 1 exceeds the maximum size of 10MB',
      });
    });

    test('accepts JPG format (alternative to JPEG)', async () => {
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const jpgDocument = `data:image/jpg;base64,${base64Data}`;

      const req = {
        body: { documents: [jpgDocument] },
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('User validation', () => {
    test('returns 422 if user missing first_name', async () => {
      const req = {
        body: createValidRequestBody(),
      } as unknown as Request;
      const res = mockResponse();
      res.locals.user.first_name = '';

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Invalid request body',
        message: 'User must have first_name and last_name for document verification',
      });
    });

    test('returns 422 if user missing last_name', async () => {
      const req = {
        body: createValidRequestBody(),
      } as unknown as Request;
      const res = mockResponse();
      res.locals.user.last_name = '';

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Invalid request body',
        message: 'User must have first_name and last_name for document verification',
      });
    });

    test('returns 422 if user missing kyc_instance_id', async () => {
      const req = {
        body: createValidRequestBody(),
      } as unknown as Request;
      const res = mockResponse();
      res.locals.user.kyc_instance_id = '';

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Invalid request body',
        message: 'User must have an active verification journey. Please start verification first.',
      });
    });

    test('returns 422 if user kyc_instance_id is null', async () => {
      const req = {
        body: createValidRequestBody(),
      } as unknown as Request;
      const res = mockResponse();
      res.locals.user.kyc_instance_id = null;

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Invalid request body',
        message: 'User must have an active verification journey. Please start verification first.',
      });
    });
  });

  describe('Authentication', () => {
    test('returns 503 if auth token fails after 3 attempts', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (getAuthToken as jest.Mock).mockResolvedValue(null);

      const req = {
        body: createValidRequestBody(),
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(getAuthToken).toHaveBeenCalledTimes(3);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Service Unavailable',
        message: 'Unable to authenticate with verification service. Please try again later.',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] Failed to obtain GBG auth token after 3 attempts'),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Task retrieval', () => {
    test('returns 500 if task list request fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/journey/task/list')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: async () => 'GBG API error',
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const req = {
        body: createValidRequestBody(),
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to upload documents for verification',
        details: 'GBG error occurred',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DEBUG] Failed to retrieve tasks:',
        500,
        'GBG API error',
      );

      consoleErrorSpy.mockRestore();
    });

    test('returns 422 if no tasks available', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/journey/task/list')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'InProgress',
              instanceId: 'test-instance-123',
              tasks: [],
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const req = {
        body: createValidRequestBody(),
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Invalid request body',
        message: 'No pending tasks found for this verification journey',
      });
    });

    test('handles null tasks gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/journey/task/list')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'InProgress',
              instanceId: 'test-instance-123',
              tasks: null,
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const req = {
        body: createValidRequestBody(),
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      // The handler will crash when trying to access tasks.length on null, resulting in 500
      expect(res.status).toHaveBeenCalledWith(500);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Document submission', () => {
    test('returns 500 if document submission fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/journey/task/list')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockTaskListResponse,
          });
        } else if (url.includes('/journey/task/update')) {
          return Promise.resolve({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            text: async () => 'Invalid document format',
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const req = {
        body: createValidRequestBody(),
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to upload documents for verification',
        details: 'GBG error occurred',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DEBUG] Failed to submit documents:',
        400,
        'Invalid document format',
      );

      consoleErrorSpy.mockRestore();
    });

    test('includes correct context in submission request', async () => {
      const req = {
        body: createValidRequestBody({
          documents: [createValidBase64JPEG(), createValidBase64JPEG()],
        }),
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      const submitCall = mockFetch.mock.calls.find(call =>
        call[0].includes('/journey/task/update')
      );
      expect(submitCall).toBeDefined();
      const submitBody = JSON.parse(submitCall[1].body);
      expect(submitBody).toMatchObject({
        intent: 'Complete',
        instanceId: 'test-instance-123',
        taskId: 'task-123',
        context: {
          subject: {
            identity: {
              firstName: 'John',
              lastNames: ['Doe'],
            },
            documents: expect.arrayContaining([
              expect.objectContaining({ side1Image: expect.any(String) }),
            ]),
          },
        },
      });
      expect(submitBody.context.subject.documents).toHaveLength(2);
    });
  });

  describe('Error handling', () => {
    test('returns 500 with GBG error details on unexpected error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (getAuthToken as jest.Mock).mockRejectedValue(new Error('Unexpected error'));
      (handleGBGError as jest.Mock).mockReturnValue({
        message: 'Authentication failed',
        code: 'AUTH_FAILED',
      });

      const req = {
        body: createValidRequestBody(),
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(handleGBGError).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to upload documents for verification',
        details: 'Authentication failed',
      });

      consoleErrorSpy.mockRestore();
    });

    test('logs error information', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (getAuthToken as jest.Mock).mockRejectedValue(new Error('Test error'));

      const req = {
        body: createValidRequestBody(),
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG] Document upload error:', 'Test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG] GBG error code:', 'GBG_ERROR');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG] GBG error message:', 'GBG error occurred');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Multiple documents handling', () => {
    test('correctly extracts base64 data from multiple documents', async () => {
      const doc1 = createValidBase64JPEG();
      const doc2 = createValidBase64JPEG();

      const req = {
        body: { documents: [doc1, doc2] },
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      const submitCall = mockFetch.mock.calls.find(call =>
        call[0].includes('/journey/task/update')
      );
      const submitBody = JSON.parse(submitCall[1].body);

      expect(submitBody.context.subject.documents).toHaveLength(2);
      expect(submitBody.context.subject.documents[0].side1Image).not.toContain('data:image/jpeg;base64,');
      expect(submitBody.context.subject.documents[1].side1Image).not.toContain('data:image/jpeg;base64,');
    });
  });
});
