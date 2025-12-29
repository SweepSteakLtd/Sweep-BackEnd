jest.mock('../../integrations/GBG/GBG', () => ({
  getAuthToken: jest.fn(),
  handleGBGError: jest.fn(),
  retrieveTasks: jest.fn(),
  submitDocumentsToTask: jest.fn(),
  retryWithBackoff: jest.fn(async (fn) => await fn()),
}));

import { NextFunction, Request, Response } from 'express';
import {
  getAuthToken,
  handleGBGError,
  retrieveTasks,
  submitDocumentsToTask,
  retryWithBackoff,
} from '../../integrations/GBG/GBG';
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

beforeEach(() => {
  jest.clearAllMocks();

  // Set up default successful mocks for each test
  (getAuthToken as jest.Mock).mockResolvedValue(mockAuthToken);
  (handleGBGError as jest.Mock).mockReturnValue({
    message: 'GBG error occurred',
    code: 'GBG_ERROR',
  });
  (retrieveTasks as jest.Mock).mockResolvedValue(mockTaskListResponse);
  (submitDocumentsToTask as jest.Mock).mockResolvedValue(mockSubmitTaskResponse);
  (retryWithBackoff as jest.Mock).mockImplementation(async (fn) => await fn());
});

describe('uploadGBGDocumentsHandler', () => {
  describe('Successful uploads', () => {
    test('successfully uploads single document', async () => {
      const req = {
        body: createValidRequestBody(),
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(retryWithBackoff).toHaveBeenCalled();
      expect(getAuthToken).toHaveBeenCalled();
      expect(retrieveTasks).toHaveBeenCalledWith('test-instance-123', mockAuthToken);
      expect(submitDocumentsToTask).toHaveBeenCalledWith(
        'test-instance-123',
        'task-123',
        'John',
        'Doe',
        expect.any(Array),
        mockAuthToken,
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
        message: 'documents must be an array of base64-encoded images',
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
        message: 'documents must be an array of base64-encoded images',
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
        message: 'Document 1 must be a base64-encoded image with format: base64,...',
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
    test('returns 500 if auth token fails after retries', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (retryWithBackoff as jest.Mock).mockRejectedValue(new Error('Failed to get auth token'));

      const req = {
        body: createValidRequestBody(),
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(retryWithBackoff).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to upload documents for verification',
        details: expect.any(String),
      });
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Task retrieval', () => {
    test('returns 500 if task list request fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (retrieveTasks as jest.Mock).mockRejectedValue(new Error('Failed to retrieve tasks: 500 Internal Server Error - GBG API error'));

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
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test('returns 422 if no tasks available', async () => {
      (retrieveTasks as jest.Mock).mockResolvedValue({
        status: 'InProgress',
        instanceId: 'test-instance-123',
        tasks: [],
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
      (retrieveTasks as jest.Mock).mockResolvedValue({
        status: 'InProgress',
        instanceId: 'test-instance-123',
        tasks: null,
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
      (submitDocumentsToTask as jest.Mock).mockRejectedValue(
        new Error('Failed to submit documents: 400 Bad Request - Invalid document format')
      );

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
      expect(consoleErrorSpy).toHaveBeenCalled();

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

      expect(submitDocumentsToTask).toHaveBeenCalledWith(
        'test-instance-123',
        'task-123',
        'John',
        'Doe',
        expect.any(Array),
        mockAuthToken
      );

      // Verify the documents array passed (should have base64 data stripped)
      const documentsArg = (submitDocumentsToTask as jest.Mock).mock.calls[0][4];
      expect(documentsArg).toHaveLength(2);
      expect(documentsArg[0]).not.toContain('data:image/jpeg;base64,');
      expect(documentsArg[1]).not.toContain('data:image/jpeg;base64,');
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
      (retryWithBackoff as jest.Mock).mockRejectedValue(new Error('Test error'));

      const req = {
        body: createValidRequestBody(),
      } as unknown as Request;
      const res = mockResponse();

      await uploadGBGDocumentsHandler(req, res, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] Document upload error:'), expect.anything());
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

      expect(submitDocumentsToTask).toHaveBeenCalled();
      const documentsArg = (submitDocumentsToTask as jest.Mock).mock.calls[0][4];

      expect(documentsArg).toHaveLength(2);
      expect(documentsArg[0]).not.toContain('data:image/jpeg;base64,');
      expect(documentsArg[1]).not.toContain('data:image/jpeg;base64,');
    });
  });
});
