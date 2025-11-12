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

export const checkGamstopRegistration = async (
  userData: GamstopUserData,
): Promise<GamstopCheckResult> => {
  try {
    const apiUrl = 'https://api.stage.gamstop.io/v2';
    const apiKey = process.env.GAMSTOP_API_KEY;

    if (!apiKey) {
      throw new Error('GAMSTOP_API_KEY environment variable is not set');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-API-Key': `${apiKey}`,
      },
      body: new URLSearchParams({
        firstName: userData.first_name,
        lastName: userData.last_name,
        dateOfBirth: userData.date_of_birth,
        email: userData.email,
        postcode: userData.postcode,
        mobile: '07700900461',
      }),
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
