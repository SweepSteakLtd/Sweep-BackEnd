import { Request, Response, NextFunction } from 'express';
import { paysafeConfig } from '../../config/paysafe.config';
import { apiKeyAuth, standardResponses } from '../schemas';

export const getPublicKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Return public API key for frontend
    const publicKey = Buffer.from(
      `${paysafeConfig.apiKeyUsername}:${paysafeConfig.apiKeyPassword}`
    ).toString('base64');

    return res.status(200).send({
      data: {
        apiKey: publicKey,
        environment: paysafeConfig.environment,
      },
    });
  } catch (error: any) {
    console.log(`GET PUBLIC KEY ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

// OpenAPI documentation
getPublicKey.apiDescription = {
  summary: 'Get Paysafe public API key',
  description: 'Returns the public API key for Paysafe Checkout SDK',
  operationId: 'getPublicKey',
  tags: ['payments'],
  responses: {
    200: {
      description: 'Public key retrieved',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  apiKey: { type: 'string' },
                  environment: { type: 'string', enum: ['TEST', 'LIVE'] },
                },
              },
            },
          },
        },
      },
    },
    500: standardResponses[500],
  },
  security: [apiKeyAuth],
};
