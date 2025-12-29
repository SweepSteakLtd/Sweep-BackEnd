import { NextFunction, Request, Response } from 'express';
import {
  handleGBGError,
  retrieveTasks,
  retryWithBackoff,
  getAuthToken,
  submitDocumentsToTask,
} from '../../integrations/GBG/GBG';
import { apiKeyAuth } from '../schemas';

/**
 * Upload GBG Documents for Identity Verification
 * @body documents - Array of base64-encoded images (at least 1 document)
 * @returns GBG instance ID and status
 */
export const uploadGBGDocumentsHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  try {
    const user = res.locals.user;

    if (!req.body.documents || !Array.isArray(req.body.documents)) {
      console.log('[DEBUG] Invalid documents: must be an array');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'documents must be an array of base64-encoded images',
      });
    }

    if (req.body.documents.length < 1) {
      console.log('[DEBUG] Invalid document count:', req.body.documents.length);
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Provide at least 1 document for verification',
      });
    }

    const base64Regex = /^data:image\/(jpeg|jpg|png);base64,[A-Za-z0-9+/]*={0,2}$/;
    const validDocuments: string[] = [];

    for (let i = 0; i < req.body.documents.length; i++) {
      const doc = req.body.documents[i];

      if (typeof doc !== 'string') {
        console.log(`[DEBUG] Document ${i + 1} is not a string`);
        return res.status(422).send({
          error: 'Invalid request body',
          message: `Document ${i + 1} must be a base64-encoded string`,
        });
      }

      if (!base64Regex.test(doc)) {
        console.log(`[DEBUG] Document ${i + 1} is not a valid base64`);
        return res.status(422).send({
          error: 'Invalid request body',
          message: `Document ${i + 1} must be a base64-encoded image with format: base64,...`,
        });
      }

      const base64Data = doc.split(',')[1];

      const sizeInBytes = (base64Data.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);

      if (sizeInMB > 10) {
        console.log(`[DEBUG] Document ${i + 1} exceeds 10MB size limit`);
        return res.status(422).send({
          error: 'Invalid request body',
          message: `Document ${i + 1} exceeds the maximum size of 10MB`,
        });
      }

      validDocuments.push(base64Data);
    }

    if (!user.first_name || !user.last_name) {
      console.log('[DEBUG] User missing required name information');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'User must have first_name and last_name for document verification',
      });
    }

    if (!user.kyc_instance_id) {
      console.log('[DEBUG] User does not have a journey instance ID');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'User must have an active verification journey. Please start verification first.',
      });
    }

    // Get GBG auth token with retry logic
    console.log('[DEBUG] Fetching GBG auth token...');
    const authToken = await retryWithBackoff(
      async () => {
        const token = await getAuthToken();
        if (!token) {
          throw new Error('Failed to get auth token');
        }
        return token;
      },
      3,
      1000,
    );

    console.log('[DEBUG] GBG auth token obtained');

    // Retrieve tasks for the verification journey
    console.log('[DEBUG] Retrieving tasks for instance:', user.kyc_instance_id);
    const taskList = await retrieveTasks(user.kyc_instance_id, authToken);
    console.log('[DEBUG] Retrieved tasks:', taskList.tasks.length);

    if (!taskList.tasks || taskList.tasks.length === 0) {
      console.log('[DEBUG] No tasks available for this journey');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'No pending tasks found for this verification journey',
      });
    }

    const task = taskList.tasks[0];
    console.log('[DEBUG] Using task:', task.taskId, JSON.stringify(taskList));

    // Submit documents to the task
    console.log('[DEBUG] Submitting documents to task...');
    const result = await submitDocumentsToTask(
      user.kyc_instance_id,
      task.taskId,
      user.first_name,
      user.last_name,
      validDocuments,
      authToken,
    );

    console.log('[DEBUG] Documents submitted successfully for instance:', result.instanceId);

    return res.status(200).send({
      data: {
        instanceId: result.instanceId,
        taskId: task.taskId,
        message: 'Documents uploaded successfully. Verification in progress.',
      },
    });
  } catch (error: any) {
    console.error('[DEBUG] Document upload error:', error.message);
    const gbgError = handleGBGError(error);
    console.error('[DEBUG] GBG error code:', gbgError.code);
    console.error('[DEBUG] GBG error message:', gbgError.message);

    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to upload documents for verification',
      details: gbgError.message,
    });
  }
};

uploadGBGDocumentsHandler.apiDescription = {
  summary: 'Upload documents for GBG identity verification',
  description:
    'Upload identity documents (passport, driver license, etc.) as base64-encoded images for GBG verification. The user must have an active verification journey (kyc_instance_id) before uploading documents. This endpoint retrieves pending tasks for the journey and submits the documents to complete the task. Returns the journey instance ID and task ID for tracking.',
  operationId: 'uploadGBGDocuments',
  tags: ['users', 'verification'],
  responses: {
    200: {
      description: 'Documents uploaded successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  instanceId: {
                    type: 'string',
                    description: 'GBG journey instance ID for tracking verification',
                    example: 'gbg_abc123def456',
                  },
                  taskId: {
                    type: 'string',
                    description: 'The task ID that was completed with the document upload',
                    example: 'task_xyz789',
                  },
                  message: {
                    type: 'string',
                    example: 'Documents uploaded successfully. Verification in progress.',
                  },
                },
              },
            },
          },
        },
      },
    },
    422: {
      description: 'Invalid request body - validation errors',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Invalid request body' },
              message: {
                type: 'string',
                examples: [
                  'documents must be an array of base64-encoded images',
                  'Provide at least 1 document for verification',
                  'Document 1 must be a base64-encoded image with format: ...',
                  'Document 1 exceeds the maximum size of 10MB',
                  'User must have first_name and last_name for document verification',
                  'User must have an active verification journey. Please start verification first.',
                  'No pending tasks found for this verification journey',
                ],
              },
            },
          },
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Internal Server Error' },
              message: {
                type: 'string',
                example: 'Failed to upload documents for verification',
              },
              details: { type: 'string' },
            },
          },
        },
      },
    },
    503: {
      description: 'Service Unavailable - GBG authentication service unavailable',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Service Unavailable' },
              message: {
                type: 'string',
                example:
                  'Unable to authenticate with verification service. Please try again later.',
              },
            },
          },
        },
      },
    },
  },
  requestBody: {
    description:
      'Array of identity documents as base64-encoded images. Each document must be in data URL format (...) and not exceed 10MB in size. The user must have an active verification journey (kyc_instance_id) before calling this endpoint.',
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['documents'],
          properties: {
            documents: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'string',
                format: 'byte',
                pattern: '^data:image/(jpeg|jpg);base64,[A-Za-z0-9+/=]+$',
                description: 'Base64-encoded JPEG image in data URL format',
              },
              description:
                'Array of document images (passport, driver license, etc.) encoded as base64 JPEG',
              example: [
                '/9j/4AAQSkZJRgABAQEAYABgAAD/...',
                '/9j/4AAQSkZJRgABAQEAYABgAAD/...',
              ],
            },
          },
        },
        examples: {
          'single-document': {
            summary: 'Single document upload',
            value: {
              documents: ['/9j/4AAQSkZJRgABAQEAYABgAAD/...'],
            },
          },
          'multiple-documents': {
            summary: 'Multiple documents upload',
            value: {
              documents: [
                '/9j/4AAQSkZJRgABAQEAYABgAAD/...',
                '/9j/4AAQSkZJRgABAQEAYABgAAD/...',
                '/9j/4AAQSkZJRgABAQEAYABgAAD/...',
              ],
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
