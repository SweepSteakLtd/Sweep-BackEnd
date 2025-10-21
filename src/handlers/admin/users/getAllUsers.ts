import { NextFunction, Request, Response } from 'express';

/**
 * Get all users (admin endpoint)
 * @query email - optional
 * @returns User[]
 */
export const getAllUsersHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).send({ data: [], is_mock: true });
  } catch (error: any) {
    console.log(`GET ALL USERS ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

getAllUsersHandler.apiDescription = {
  responses: {
    200: {
      description: '200 OK',
      content: {
        'application/json': {
          schema: {
            type: 'array',
          },
        },
      },
    },
    403: {
      description: '403 Forbidden',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    500: {
      description: '500 Internal Server Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
};
