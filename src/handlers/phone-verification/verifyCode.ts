import axios from 'axios';
import { NextFunction, Request, Response } from 'express';
import { firebaseConfig } from '../../config';
// import { database } from '../../services';
import { apiKeyAuth, standardResponses } from '../schemas';

/**
 * Verify code using Firebase Identity Toolkit REST API
 */
const verifyFirebaseCode = async (
  sessionInfo: string,
  code: string,
): Promise<{ idToken: string; refreshToken: string }> => {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${firebaseConfig.apiKey}`;

  try {
    const response = await axios.post(url, {
      sessionInfo: sessionInfo,
      code: code,
    });

    console.log('[Firebase] Code verified successfully via Firebase Identity Toolkit');
    return {
      idToken: response.data.idToken,
      refreshToken: response.data.refreshToken,
    };
  } catch (error: any) {
    console.error('[Firebase] Error verifying code:', error.response?.data || error.message);

    const errorMessage = error.response?.data?.error?.message || error.message;
    if (errorMessage?.includes('INVALID_CODE')) {
      throw new Error('Invalid verification code');
    } else if (errorMessage?.includes('SESSION_EXPIRED')) {
      throw new Error('Verification session expired');
    }

    throw new Error(`Failed to verify code: ${errorMessage}`);
  }
};

/**
 * Verify phone verification code (Server-side Firebase flow)
 *
 * Flow:
 * 1. Client sends verification code + verification ID to this endpoint
 * 2. Backend retrieves the Firebase sessionInfo from database
 * 3. Backend calls Firebase API to verify the code
 * 4. Firebase returns idToken and refreshToken
 * 5. Backend marks verification as complete
 * 6. Client receives Firebase tokens for authentication
 *
 * This approach uses Firebase natively and bypasses client-side reCAPTCHA
 *
 * @param verificationId - string - required (from URL params)
 * @body code - string - required (6-digit verification code received via SMS)
 * @returns {success: boolean, message: string, idToken: string, refreshToken: string, phoneNumber: string}
 */
export const verifyCodeHandler = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { verificationId } = req.params;
    const { code } = req.query;

    // Validate verificationId is provided
    if (!verificationId || verificationId.trim() === '') {
      console.log('[DEBUG] Missing required parameter: verificationId');
      return res.status(422).send({
        error: 'Invalid request',
        message: 'Missing required parameter: verificationId',
      });
    }

    // Validate code is provided
    if (!code || typeof code !== 'string' || code.trim() === '') {
      console.log('[DEBUG] Missing or invalid verification code');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Missing required field: code',
      });
    }

    // // Fetch verification record from database
    // const verificationRecords = await database
    //   .select()
    //   .from(phoneVerifications)
    //   .where(eq(phoneVerifications.id, verificationId))
    //   .limit(1)
    //   .execute();

    // if (verificationRecords.length === 0) {
    //   console.log('[DEBUG] Verification ID not found:', verificationId);
    //   return res.status(404).send({
    //     error: 'Not found',
    //     message: 'Verification ID not found',
    //   });
    // }

    // const verification = verificationRecords[0];

    // // Check if verification has expired
    // if (new Date() > verification.expires_at) {
    //   console.log('[DEBUG] Verification session expired for ID:', verificationId);
    //   return res.status(400).send({
    //     error: 'Expired',
    //     message: 'Verification session has expired',
    //   });
    // }

    // Verify the code with Firebase using the stored sessionInfo
    const sessionInfo = verificationId; // We stored sessionInfo in the code field
    let idToken: string;
    let refreshToken: string;

    try {
      const result = await verifyFirebaseCode(sessionInfo, code.trim());
      idToken = result.idToken;
      refreshToken = result.refreshToken;
    } catch (firebaseError: any) {
      console.error('[Firebase] Failed to verify code:', firebaseError.message);
      return res.status(400).send({
        error: 'Invalid code',
        message: firebaseError.message || 'Verification code does not match',
      });
    }

    // // Mark verification as verified
    // await database
    //   .update(phoneVerifications)
    //   .set({ verified: true, updated_at: new Date() })
    //   .where(eq(phoneVerifications.id, verificationId))
    //   .execute();

    return res.status(200).send({
      success: true,
      message: 'verified',
      idToken: idToken,
      refreshToken: refreshToken,
      // phoneNumber: verification.phone_number,
    });
  } catch (error: any) {
    console.log(`[DEBUG] VERIFY CODE ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

verifyCodeHandler.apiDescription = {
  summary: 'Verify phone verification code and get Firebase tokens',
  description:
    'Verifies the 6-digit code sent via Firebase SMS and returns Firebase authentication tokens (idToken and refreshToken). The client can use these tokens directly with Firebase Auth. This server-side approach bypasses client-side reCAPTCHA complexity.',
  operationId: 'verifyCode',
  tags: ['phone-verification'],
  responses: {
    200: {
      description: 'Phone number verified successfully with Firebase tokens',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'verified' },
              idToken: {
                type: 'string',
                example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
                description: 'Firebase ID token for authentication',
              },
              refreshToken: {
                type: 'string',
                example: 'AMf-vBwAAAAAGK...',
                description: 'Firebase refresh token',
              },
              phoneNumber: {
                type: 'string',
                example: '+12345678901',
                description: 'The verified phone number',
              },
            },
          },
          examples: {
            success: {
              summary: 'Phone number verified with Firebase tokens',
              value: {
                success: true,
                message: 'verified',
                idToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
                refreshToken: 'AMf-vBwAAAAAGK...',
                phoneNumber: '+12345678901',
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad Request - Code expired or invalid',
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
    404: {
      description: 'Not found - Verification ID not found',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Not found' },
              message: { type: 'string', example: 'Verification ID not found' },
            },
          },
        },
      },
    },
    422: standardResponses[422],
    500: standardResponses[500],
  },
  requestBody: {
    description: 'Verification code received via SMS',
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['code'],
          properties: {
            code: {
              type: 'string',
              pattern: '^\\d{6}$',
              description: '6-digit verification code received via SMS',
              example: '123456',
            },
          },
        },
        examples: {
          standard: {
            summary: 'Verify code',
            value: {
              code: '123456',
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
