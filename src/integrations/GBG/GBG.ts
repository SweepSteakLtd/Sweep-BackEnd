// ============================================================================
// Type Definitions
// ============================================================================

import { getGBGConfig } from '../../config/gbg.config';
import { fetchWithTimeout, retryWithBackoff as retry } from '../../utils/fetchWithTimeout';

// Re-export for use in handlers
export { retryWithBackoff } from '../../utils/fetchWithTimeout';

const gbgConfig = getGBGConfig();

interface AuthResponse {
  access_token: string; // really big string
  token_type: string; // Bearer
  expires_in: number; // usually 4 hours but recommendation is to fetch it each time journey is starting
}

interface Address {
  line1: string;
  line2: string;
  line3: string;
  postcode: string;
  town: string;
  county: string;
  country: string;
}

interface PersonData {
  first_name: string;
  last_name: string;
  date_of_birth?: string; // Format: YYYY-MM-DD
  address?: Address;
  email?: string;
  phone_number?: string;
  national_id?: string; // SSN, NIN, etc.
}

// ============================================================================
// Journey API Types
// ============================================================================

interface GBGCurrentAddress {
  lines?: string[]; // Address lines
  premise?: string; // street number
  thoroughfare?: string; // Street name
  locality?: string; // Town/City
  postalCode?: string;
  administrativeArea?: string; // State England
  subAdministrativeArea?: string; // county // Greater Manchester
  country: 'GB';
  addressString?: string;
}

interface GBGIdentity {
  title?: string;
  firstName: string;
  middleNames?: string[];
  lastNames: string[];
  gender?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  currentAddress?: GBGCurrentAddress;
  placeofBirth?: {
    locality?: string;
    administrativeArea?: string;
    country?: string;
  };
  mothersMaidenName?: string;
  phones?: Array<{
    type: string;
    number: string;
  }>;
  emails?: Array<{
    type: string;
    email: string;
  }>;
}

interface GBGDocument {
  type?: string;
  number?: string;
  country?: string;
}

interface GBGBiometric {
  faceImage?: string;
}

interface StartJourneyRequest {
  resourceId: string; // GBG Resource ID
  context: {
    config?: { async: boolean };
    subject: {
      uid?: string;
      identity: GBGIdentity;
      documents?: GBGDocument[];
      biometrics?: GBGBiometric[];
    };
  };
}

interface StartJourneyResponse {
  instanceId: string;
  status?: 'started' | 'in_progress' | 'completed' | 'failed';
  session_token?: string;
  expires_at?: string;
  next_steps?: string[];
}

type Decision =
  | 'Decision: Alert'
  | 'Decision: Manual review'
  | 'Decision: Pass 1+1'
  | 'Decision: Pass 2+2';

export const getAuthToken = async (): Promise<AuthResponse | null> => {
  try {
    console.log('[DEBUG]: trying to get auth token');
    const res = await fetchWithTimeout(gbgConfig.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: gbgConfig.clientId,
        client_secret: gbgConfig.clientSecret,
        grant_type: 'password',
        scope: 'openid',
        username: gbgConfig.username,
        password: gbgConfig.password,
      }),
      timeout: gbgConfig.timeout,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`GBG Auth failed: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const result = (await res.json()) as AuthResponse;

    return result;
  } catch (e) {
    console.log('[DEBUG] failed to get GBG auth token:', e);
    return null;
  }
};

const startJourney = async (
  request: StartJourneyRequest,
  authToken?: AuthResponse | null,
): Promise<StartJourneyResponse> => {
  const token = authToken || (await getAuthToken());

  if (!token) {
    throw new Error('Failed to obtain GBG authentication token');
  }

  const res = await fetchWithTimeout(`${gbgConfig.baseUrl}/captain/api/journey/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.access_token}`,
    },
    body: JSON.stringify(request),
    timeout: gbgConfig.timeout,
  });

  if (!res.ok) {
    const errorData = await res.text().catch(() => 'Unknown error');
    throw new Error(`Failed to start journey: ${res.status} ${res.statusText} - ${errorData}`);
  }

  const result = (await res.json()) as StartJourneyResponse;

  return result;
};

export const fetchState = async (instanceId: string, authToken?: AuthResponse | null) => {
  const token = authToken || (await getAuthToken());

  if (!token) {
    throw new Error('Failed to obtain GBG authentication token');
  }

  const res = await fetchWithTimeout(`${gbgConfig.baseUrl}/captain/api/journey/state/fetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.access_token}`,
    },
    body: JSON.stringify({
      instanceId: instanceId,
      filterKeys: ['/.*/'],
    }),
    timeout: gbgConfig.timeout,
  });

  if (!res.ok) {
    const errorData = await res.text().catch(() => 'Unknown error');
    throw new Error(`Failed to start journey: ${res.status} ${res.statusText} - ${errorData}`);
  }

  const result = (await res.json()) as {
    status: string;
    data: {
      context: {
        process: {
          flow: Record<string, { _ggo?: Record<string, string>; result: { outcome: Decision } }>;
        };
        result: {
          status: 'pending';
        };
      };
    };
  };

  return result;
};

// ============================================================================
// High-Level Helper Functions
// ============================================================================

/**
 * Perform a complete identity verification with person data
 * @param person Person data to verify (with address)
 * @param resourceId Optional GBG Resource ID (defaults to hardcoded value)
 * @returns Complete journey result
 */
export const verifyIdentity = async (person: PersonData, resourceId: string): Promise<string> => {
  if (!person.address) {
    throw new Error('Address is required for identity verification');
  }

  // Get auth token with retry logic and exponential backoff
  console.log('[DEBUG] Fetching GBG auth token...');
  const authToken = await retry(
    async () => {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Failed to get auth token');
      }
      return token;
    },
    gbgConfig.maxRetries,
    1000, // 1 second base delay
  );

  console.log('[DEBUG] GBG auth token obtained');

  const streetParts = person.address.line1?.split(' ') || [];
  const buildingNumber =
    streetParts.length > 0 && /^\d+$/.test(streetParts[0]) ? streetParts[0] : '';
  const thoroughfare = buildingNumber ? streetParts.slice(1).join(' ') : person.address.line1 || '';

  const { line1, line2, line3, postcode, town } = person.address || {};

  const extractPremise = (addressLine: string): string => {
    if (!addressLine) return '';

    // Remove common prefixes (flat, apartment, unit) and their numbers
    const withoutPrefix = addressLine.replace(/^(flat|apartment|unit)\s+\d+[a-z]?,?\s*/i, '');

    // Match the first number or number range (e.g., "280" or "12-14")
    const numberMatch = withoutPrefix.match(/^(\d+[-]?\d*[a-z]?)/i);
    if (numberMatch) {
      return numberMatch[1];
    }

    // If no number found at start, try to find after comma (e.g., "Building Name, 123 Street")
    const afterCommaMatch = addressLine.match(/,\s*(\d+[-]?\d*[a-z]?)/i);
    if (afterCommaMatch) {
      return afterCommaMatch[1];
    }

    // Fallback: try to extract any number from the beginning of the original line
    const anyNumberMatch = addressLine.match(/\b(\d+[-]?\d*[a-z]?)\b/i);
    if (anyNumberMatch) {
      return anyNumberMatch[1];
    }

    return '';
  };

  const premise = extractPremise(line1);

  const lines = [line1, line2, line3].filter(item => item);

  // Build the GBG request format according to schema
  const journeyRequest: StartJourneyRequest = {
    resourceId: resourceId,
    context: {
      config: { async: true },
      subject: {
        identity: {
          firstName: person.first_name,
          lastNames: [person.last_name],
          dateOfBirth: person.date_of_birth,
          currentAddress: {
            lines: lines,
            locality: town,
            postalCode: postcode,
            country: 'GB',
            addressString: `${lines.join(',')}, ${postcode}, United Kingdom`,
            premise,
            thoroughfare: thoroughfare,
            administrativeArea: 'England',
          },
          emails: person.email ? [{ type: 'private', email: person.email }] : undefined,
          phones: person.phone_number
            ? [{ type: 'mobile', number: person.phone_number }]
            : undefined,
        },
        documents: [],
        biometrics: [],
      },
    },
  };

  // Start journey with identity data (reuse auth token)
  const journey = await startJourney(journeyRequest, authToken);
  console.log('[DEBUG] GBG journey started:', journey.instanceId);

  return journey.instanceId;
};

// ============================================================================
// Task Management Functions
// ============================================================================

export interface GBGTask {
  taskId: string;
  variantId: string;
}

export interface GBGTaskListResponse {
  status: string;
  instanceId: string;
  tasks: GBGTask[];
}

export interface GBGSubmitTaskResponse {
  status: string;
  instanceId: string;
}

/**
 * Retrieve pending tasks for a GBG verification journey
 * @param instanceId - GBG journey instance ID
 * @param authToken - Optional auth token (will fetch if not provided)
 * @returns Task list response
 */
export const retrieveTasks = async (
  instanceId: string,
  authToken?: AuthResponse | null,
): Promise<GBGTaskListResponse> => {
  const token = authToken || (await getAuthToken());

  if (!token) {
    throw new Error('Failed to obtain GBG authentication token');
  }

  const res = await fetchWithTimeout(`${gbgConfig.baseUrl}/captain/api/journey/task/list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.access_token}`,
    },
    body: JSON.stringify({
      instanceId: instanceId,
    }),
    timeout: gbgConfig.timeout,
  });

  if (!res.ok) {
    const errorData = await res.text().catch(() => 'Unknown error');
    throw new Error(`Failed to retrieve tasks: ${res.status} ${res.statusText} - ${errorData}`);
  }

  const result = (await res.json()) as GBGTaskListResponse;

  return result;
};

/**
 * Submit documents to complete a GBG verification task
 * @param instanceId - GBG journey instance ID
 * @param taskId - Task ID to complete
 * @param firstName - User first name
 * @param lastName - User last name
 * @param documents - Array of base64-encoded document images
 * @param authToken - Optional auth token (will fetch if not provided)
 * @returns Submit task response
 */
export const submitDocumentsToTask = async (
  instanceId: string,
  taskId: string,
  firstName: string,
  lastName: string,
  documents: string[],
  authToken?: AuthResponse | null,
): Promise<GBGSubmitTaskResponse> => {
  const token = authToken || (await getAuthToken());

  if (!token) {
    throw new Error('Failed to obtain GBG authentication token');
  }

  const documentsArray = documents.map(base64Data => ({
    side1Image: base64Data,
  }));

  const submitTaskRequest = {
    intent: 'Complete',
    instanceId: instanceId,
    taskId: taskId,
    context: {
      subject: {
        identity: {
          firstName: firstName,
          lastNames: [lastName],
        },
        documents: documentsArray,
      },
    },
  };

  const res = await fetchWithTimeout(`${gbgConfig.baseUrl}/captain/api/journey/task/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.access_token}`,
    },
    body: JSON.stringify(submitTaskRequest),
    timeout: gbgConfig.timeout,
  });

  if (!res.ok) {
    const errorData = await res.text().catch(() => 'Unknown error');
    throw new Error(`Failed to submit documents: ${res.status} ${res.statusText} - ${errorData}`);
  }

  const result = (await res.json()) as GBGSubmitTaskResponse;

  return result;
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Handle GBG API errors with proper error messages
 * @param error Error object from GBG API
 * @returns User-friendly error message and code
 */
export const handleGBGError = (error: unknown): { message: string; code: string } => {
  if (error instanceof Error) {
    const errorMsg = error.message.toLowerCase();

    // Check for common GBG error patterns
    if (errorMsg.includes('401') || errorMsg.includes('auth failed')) {
      return {
        message: 'Authentication failed. Please check GBG credentials.',
        code: 'AUTH_FAILED',
      };
    }
    if (errorMsg.includes('403') || errorMsg.includes('forbidden')) {
      return {
        message: 'Access denied. Insufficient permissions or invalid credentials.',
        code: 'FORBIDDEN',
      };
    }
    if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
      return {
        message: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT',
      };
    }
    if (errorMsg.includes('500') || errorMsg.includes('service error')) {
      return {
        message: 'GBG service error. Please try again later.',
        code: 'SERVICE_ERROR',
      };
    }
    if (errorMsg.includes('timeout')) {
      return {
        message: 'Verification timed out. Please try again.',
        code: 'TIMEOUT',
      };
    }
    if (errorMsg.includes('invalid') || errorMsg.includes('validation')) {
      return {
        message: 'Invalid data provided. Please check your input.',
        code: 'VALIDATION_ERROR',
      };
    }

    return { message: error.message, code: 'UNKNOWN_ERROR' };
  }

  return { message: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' };
};
