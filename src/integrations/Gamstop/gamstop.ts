import { getGamStopConfig } from '../../config/gamstop.config';
import { fetchWithTimeout } from '../../utils/fetchWithTimeout';

const gamstopConfig = getGamStopConfig();

interface GamstopUserData {
  first_name: string;
  last_name: string;
  date_of_birth: string; // Format: YYYY-MM-DD
  email: string;
  phone: string;
  postcode: string;
}

export interface GamstopCheckResult {
  is_registered: boolean; // true if user is self-excluded with Gamstop
  registration_id?: string; // Gamstop registration ID if applicable
}

export interface GamstopBatchUserData {
  correlationId?: string; // Optional unique identifier for tracking
  first_name: string;
  last_name: string;
  date_of_birth: string; // Format: YYYY-MM-DD
  email: string;
  phone: string;
  postcode: string;
}

export interface GamstopBatchCheckResult {
  correlationId?: string; // Optional correlation ID if provided in request
  is_registered: boolean; // true if user is self-excluded with Gamstop
  ms_request_id: string; // Microsoft request ID for tracking
}

export const checkGamstopRegistration = async (
  userData: GamstopUserData,
): Promise<GamstopCheckResult> => {
  try {
    const response = await fetchWithTimeout(gamstopConfig.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-API-Key': gamstopConfig.apiKey,
      },
      body: new URLSearchParams({
        firstName: userData.first_name,
        lastName: userData.last_name,
        dateOfBirth: userData.date_of_birth,
        email: userData.email,
        postcode: userData.postcode,
        mobile: userData.phone,
      }),
      timeout: gamstopConfig.timeout,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Gamstop API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const exclusionValue = response.headers.get('x-exclusion');
    const exclusionId = response.headers.get('x-unique-id');

    return {
      is_registered: exclusionValue === 'Y' ? true : false,
      registration_id: exclusionId,
    };
  } catch (error: any) {
    console.error('[ERROR] Gamstop API error:', error.message);
    throw error;
  }
};

/**
 * Batch check GamStop registration for multiple users
 * Supports up to 1,000 users per request
 * Rate limit: 1 request per second average in a 5-minute period
 * @param usersData Array of user data to check (max 1,000)
 * @returns Array of check results with correlation IDs
 */
export const checkGamstopRegistrationBatch = async (
  usersData: GamstopBatchUserData[],
): Promise<GamstopBatchCheckResult[]> => {
  try {
    if (usersData.length === 0) {
      return [];
    }

    if (usersData.length > gamstopConfig.batchSize) {
      throw new Error(`Batch requests are limited to ${gamstopConfig.batchSize} users per request`);
    }

    // Format data according to GamStop API requirements
    const requestBody = usersData.map(user => ({
      ...(user.correlationId && { correlationId: user.correlationId }),
      firstName: user.first_name,
      lastName: user.last_name,
      dateOfBirth: user.date_of_birth,
      email: user.email,
      postcode: user.postcode,
      mobile: user.phone,
    }));

    const response = await fetchWithTimeout(gamstopConfig.batchApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': gamstopConfig.apiKey,
      },
      body: JSON.stringify(requestBody),
      timeout: gamstopConfig.timeout,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Gamstop Batch API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const batchUniqueId = response.headers.get('x-unique-id');
    console.log(`[INFO] Gamstop batch request ID: ${batchUniqueId}`);

    // Parse response body
    const responseData = await response.json();

    if (!Array.isArray(responseData)) {
      throw new Error('Invalid response format from Gamstop batch API');
    }

    // Map response to our interface
    const results: GamstopBatchCheckResult[] = responseData.map((item: any) => ({
      correlationId: item.correlationId,
      is_registered: item.exclusion === 'Y' || item.exclusion === 'P',
      ms_request_id: item.msRequestId,
    }));

    return results;
  } catch (error: any) {
    console.error('[ERROR] Gamstop Batch API error:', error.message);
    throw error;
  }
};

/**
 * Handle Gamstop API errors with proper error messages
 * @param error Error object from Gamstop API
 * @returns User-friendly error message and code
 */
export const handleGamstopError = (error: any): { message: string; code: string } => {
  if (error instanceof Error) {
    const errorMsg = error.message.toLowerCase();

    // Check for common API error patterns
    if (errorMsg.includes('400')) {
      return {
        message: 'Gamstop authentication failed. Please check if all necessary data are sent.',
        code: 'INVALID_REQUEST',
      };
    }
    if (errorMsg.includes('403')) {
      return {
        message: 'Access denied to Gamstop API. Whitelist ip or API key is invalid',
        code: 'INVALID_REQUEST',
      };
    }
    if (errorMsg.includes('405')) {
      return {
        message: 'Access denied to Gamstop API. Request was not using POST method',
        code: 'INVALID_REQUEST',
      };
    }

    return { message: error.message, code: 'UNKNOWN_ERROR' };
  }

  return { message: 'An unexpected error occurred during Gamstop check', code: 'UNKNOWN_ERROR' };
};
