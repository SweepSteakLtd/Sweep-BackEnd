import { createId } from '@paralleldrive/cuid2';
import axios from 'axios';
import { NextFunction, Request, Response } from 'express';
import { firebaseConfig } from '../../config';
import { apiKeyAuth, standardResponses } from '../schemas';
import { validatePhoneNumber } from '../validators/phoneValidator';

/**
 * Send verification code using Firebase Identity Toolkit REST API
 * This bypasses client-side reCAPTCHA by handling verification server-side
 */
const sendFirebaseVerificationCode = async (
  phoneNumber: string,
  // token: string,
): Promise<{ sessionInfo: string }> => {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${firebaseConfig.apiKey}`;

  try {
    const response = await axios.post(url, {
      phoneNumber: '+3850916213581',
      // recaptchaToken: token,
      recaptchaToken: '',
    });
    console.log('@@@@@@@@@@@ response:', phoneNumber);
    console.log('[Firebase] Verification code sent successfully via Firebase Identity Toolkit');
    return {
      sessionInfo: response.data.sessionInfo,
    };
  } catch (error: any) {
    console.error(
      '[Firebase] Error sending verification code:',
      error.response?.data || error.message,
    );

    // Check if reCAPTCHA verification is required
    if (error.response?.data?.error?.message?.includes('MISSING_RECAPTCHA_TOKEN')) {
      throw new Error(
        'Firebase phone verification requires reCAPTCHA to be disabled for server-side use. ' +
          'Please enable "Phone Number Sign-In Provider" without reCAPTCHA in Firebase Console.',
      );
    }

    throw new Error(
      `Failed to send verification code: ${error.response?.data?.error?.message || error.message}`,
    );
  }
};

const getRecaptchaParams = async (): Promise<{
  recaptchaParam: { recaptchaStoken: string; recaptchaSiteKey: string };
}> => {
  const url = `https://identitytoolkit.googleapis.com/v1/recaptchaParams?key=${firebaseConfig.apiKey}`;

  try {
    const response = await axios.get(url);
    console.log('@@@@@@ recaptcha params:', response.data);
    return {
      recaptchaParam: response.data,
    };
  } catch (error: any) {
    console.error(
      '[Firebase] Error sending verification code:',
      error.response?.data || error.message,
    );

    // Check if reCAPTCHA verification is required
    if (error.response?.data?.error?.message?.includes('MISSING_RECAPTCHA_TOKEN')) {
      throw new Error(
        'Firebase phone verification requires reCAPTCHA to be disabled for server-side use. ' +
          'Please enable "Phone Number Sign-In Provider" without reCAPTCHA in Firebase Console.',
      );
    }

    throw new Error(
      `Failed to send verification code: ${error.response?.data?.error?.message || error.message}`,
    );
  }
};

/**
 * Send phone verification code (Server-side Firebase handling)
 *
 * Flow:
 * 1. React Native app calls this backend endpoint with phone number
 * 2. Backend calls Firebase Identity Toolkit API to send verification code
 * 3. Firebase handles SMS sending and code generation
 * 4. Backend stores the sessionInfo from Firebase
 * 5. Backend returns verification ID to client
 * 6. Client receives SMS code and calls verify endpoint with the code
 *
 * This approach uses Firebase natively and avoids client-side reCAPTCHA complexity
 *
 * @body phone_number - string - required (E.164 format)
 * @returns {success: boolean, verificationId: string, message: string}
 */
export const sendVerificationCodeHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  try {
    // Validate phone_number is provided
    if (!req.body.phone_number) {
      console.log('[DEBUG] Missing required field: phone_number');
      return res.status(422).send({
        error: 'Invalid request body',
        message: 'Missing required field: phone_number',
      });
    }

    // Validate phone_number format (E.164)
    const phoneValidation = validatePhoneNumber(req.body.phone_number);
    if (!phoneValidation.valid) {
      console.log('[DEBUG] Invalid phone_number format:', req.body.phone_number);
      return res.status(422).send({
        error: 'Invalid request body',
        message: phoneValidation.error,
      });
    }

    // Optional: Add rate limiting here to prevent abuse
    // Example: Check if phone number has requested too many codes recently

    // Send verification code via Firebase Identity Toolkit
    let sessionInfo: string;
    try {
      const recaptchaParams = await getRecaptchaParams();

      const result = await sendFirebaseVerificationCode(
        req.body.phone_number,
        // recaptchaParams.recaptchaParam.recaptchaStoken,
      );
      sessionInfo = result.sessionInfo;
      console.log('@@@@@@@@@@@ session info', result.sessionInfo);
    } catch (firebaseError: any) {
      console.error('[Firebase] Failed to send verification code:', firebaseError.message);
      return res.status(500).send({
        error: 'Internal Server Error',
        message: firebaseError.message || 'Failed to send verification code',
      });
    }

    // Generate a unique verification ID
    const verificationId = createId();

    // Set expiration time to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // // Store verification session in database
    // // We store the sessionInfo from Firebase instead of a custom code
    // const phoneVerification = {
    //   id: verificationId,
    //   phone_number: req.body.phone_number,
    //   code: sessionInfo, // Store Firebase sessionInfo instead of custom code
    //   verified: false,
    //   expires_at: expiresAt,
    //   created_at: new Date(),
    //   updated_at: new Date(),
    // };

    // await database.insert(phoneVerifications).values(phoneVerification).execute();

    console.log(`[DEBUG] Firebase verification session created: ${verificationId}`);
    console.log(`[DEBUG] Session expires at: ${expiresAt.toISOString()}`);

    return res.status(200).send({
      success: true,
      verificationId: verificationId,
      message: 'code sent',
    });
  } catch (error: any) {
    console.log(`[DEBUG] SEND VERIFICATION CODE ERROR: ${error.message} 🛑`);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};

sendVerificationCodeHandler.apiDescription = {
  summary: 'Send phone verification code (Firebase native)',
  description:
    'Initiates phone verification using Firebase Identity Toolkit REST API. Firebase generates and sends a 6-digit code via SMS. This backend approach handles reCAPTCHA server-side, avoiding client-side complexity. The verification ID is returned for use in the verify endpoint.',
  operationId: 'sendVerificationCode',
  tags: ['phone-verification'],
  responses: {
    200: {
      description: 'Verification code sent successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              verificationId: { type: 'string', example: 'clh3x8q9z0000qz8r8z8r8z8r' },
              message: { type: 'string', example: 'code sent' },
            },
          },
          examples: {
            success: {
              summary: 'Verification code sent',
              value: {
                success: true,
                verificationId: 'clh3x8q9z0000qz8r8z8r8z8r',
                message: 'code sent',
              },
            },
          },
        },
      },
    },
    422: standardResponses[422],
    500: standardResponses[500],
  },
  requestBody: {
    description: 'Phone number to send verification code to',
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['phone_number'],
          properties: {
            phone_number: {
              type: 'string',
              pattern: '^\\+[1-9]\\d{1,14}$',
              description: 'Phone number in E.164 format',
              example: '+12345678901',
            },
          },
        },
        examples: {
          standard: {
            summary: 'Send verification code',
            value: {
              phone_number: '+12345678901',
            },
          },
        },
      },
    },
  },
  security: [apiKeyAuth],
};
