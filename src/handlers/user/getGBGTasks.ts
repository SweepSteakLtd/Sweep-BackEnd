import { NextFunction, Request, Response } from 'express';
import { handleGBGError, retrieveTasks } from '../../integrations/GBG/GBG';
import { apiKeyAuth } from '../schemas';

/**
 * Get pending GBG verification tasks for the current user
 * Retrieves the list of tasks that need to be completed for the user's verification journey
 * This is useful for checking what documents or information are needed before uploading
 * @returns List of pending tasks
 */
export const getGBGTasksHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  try {
    const user = res.locals.user;

    // Check if user has a verification journey
    if (!user.kyc_instance_id) {
      console.log('[DEBUG] User does not have a journey instance ID');
      return res.status(422).send({
        error: 'Invalid request',
        message: 'User must have an active verification journey. Please start verification first.',
      });
    }

    console.log('[DEBUG] Retrieving tasks for instance:', user.kyc_instance_id);

    // Retrieve tasks using the GBG integration function
    const taskList = await retrieveTasks(user.kyc_instance_id);

    console.log('[DEBUG] Retrieved tasks:', taskList.tasks.length);

    return res.status(200).send({
      data: {
        instanceId: taskList.instanceId,
        status: taskList.status,
        tasks: taskList.tasks,
        tasksCount: taskList.tasks.length,
        message:
          taskList.tasks.length > 0
            ? 'Tasks available for completion'
            : 'No pending tasks at this time',
      },
    });
  } catch (error: any) {
    console.error('[DEBUG] Task retrieval error:', error.message);
    const gbgError = handleGBGError(error);
    console.error('[DEBUG] GBG error code:', gbgError.code);
    console.error('[DEBUG] GBG error message:', gbgError.message);

    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve verification tasks',
      details: gbgError.message,
    });
  }
};

getGBGTasksHandler.apiDescription = {
  summary: 'Get pending GBG verification tasks',
  description:
    'Retrieves the list of pending tasks for the current user\'s GBG verification journey. This endpoint is useful for checking what documents or information are needed before attempting to upload documents. Returns the journey status, task list, and task count.',
  operationId: 'getGBGTasks',
  tags: ['users', 'verification'],
  responses: {
    200: {
      description: 'Tasks retrieved successfully',
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
                    description: 'GBG journey instance ID',
                    example: 'gbg_abc123def456',
                  },
                  status: {
                    type: 'string',
                    description: 'Journey status',
                    enum: ['InProgress', 'Completed', 'Failed'],
                    example: 'InProgress',
                  },
                  tasks: {
                    type: 'array',
                    description: 'List of pending tasks',
                    items: {
                      type: 'object',
                      properties: {
                        taskId: {
                          type: 'string',
                          description: 'Unique task identifier',
                          example: 'task_xyz789',
                        },
                        variantId: {
                          type: 'string',
                          description: 'Task variant identifier',
                          example: 'variant_abc123',
                        },
                      },
                    },
                  },
                  tasksCount: {
                    type: 'number',
                    description: 'Number of pending tasks',
                    example: 1,
                  },
                  message: {
                    type: 'string',
                    description: 'Human-readable status message',
                    example: 'Tasks available for completion',
                  },
                },
              },
            },
          },
          examples: {
            'tasks-available': {
              summary: 'Tasks available for completion',
              value: {
                data: {
                  instanceId: 'gbg_abc123def456',
                  status: 'InProgress',
                  tasks: [
                    {
                      taskId: 'task_xyz789',
                      variantId: 'variant_abc123',
                    },
                  ],
                  tasksCount: 1,
                  message: 'Tasks available for completion',
                },
              },
            },
            'no-tasks': {
              summary: 'No pending tasks',
              value: {
                data: {
                  instanceId: 'gbg_abc123def456',
                  status: 'Completed',
                  tasks: [],
                  tasksCount: 0,
                  message: 'No pending tasks at this time',
                },
              },
            },
          },
        },
      },
    },
    422: {
      description: 'Invalid request - no active verification journey',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Invalid request' },
              message: {
                type: 'string',
                example: 'User must have an active verification journey. Please start verification first.',
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
                example: 'Failed to retrieve verification tasks',
              },
              details: { type: 'string' },
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
