import { getRemoteConfig } from 'firebase-admin/remote-config';

// ============================================================================
// Remote Config Interface
// ============================================================================

interface RemoteConfigValues {
  gbg_resource_id: string;
}

// ============================================================================
// Remote Config Cache
// ============================================================================

let configCache: RemoteConfigValues | null = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Remote Config Service
// ============================================================================

/**
 * Initialize Remote Config with default values
 */
export const initializeRemoteConfig = async (): Promise<void> => {
  try {
    const remoteConfig = getRemoteConfig();
    const template = await remoteConfig.getTemplate();

    // Define default values if they don't exist
    const defaultParameters = {
      gbg_resource_id: {
        defaultValue: {
          value: 'd27b6807703eec9f5f5c0d45eb3abc883c142236055b85e30df2f75fdb22cbbe@latest',
        },
        description: 'GBG Resource ID for verification',
      },
    };

    // Merge existing parameters with defaults (don't overwrite existing)
    let needsUpdate = false;
    for (const [key, config] of Object.entries(defaultParameters)) {
      if (!template.parameters[key]) {
        // TypeScript cannot infer the Firebase Remote Config parameter structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        template.parameters[key] = config as any;
        needsUpdate = true;
      }
    }

    // Update template only if new parameters were added
    if (needsUpdate) {
      await remoteConfig.publishTemplate(template);
      console.log('[Remote Config] Template updated with default values');
    }

    console.log('[Remote Config] Initialized successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Remote Config] Initialization error:', errorMessage);
    // Don't throw - allow app to continue with defaults
  }
};

/**
 * Fetch and cache Remote Config values
 */
export const fetchRemoteConfig = async (): Promise<RemoteConfigValues> => {
  const now = Date.now();

  // Return cached values if still valid
  if (configCache && now - lastFetchTime < CACHE_DURATION_MS) {
    console.log('[Remote Config] Using cached values');
    return configCache;
  }

  try {
    const remoteConfig = getRemoteConfig();
    const template = await remoteConfig.getTemplate();

    // Parse values from template
    interface RemoteConfigParam {
      defaultValue?: {
        value?: string;
        useInAppDefault?: boolean;
      };
    }

    const getStringValue = (param: RemoteConfigParam | undefined): string => {
      if (!param?.defaultValue) return '';
      const defaultValue = param.defaultValue;
      // Handle both { value: string } and { useInAppDefault: boolean } formats
      if ('value' in defaultValue && defaultValue.value) {
        return defaultValue.value;
      }
      return '';
    };

    const values: RemoteConfigValues = {
      gbg_resource_id:
        getStringValue(template.parameters.gbg_resource_id) ||
        'd27b6807703eec9f5f5c0d45eb3abc883c142236055b85e30df2f75fdb22cbbe@1gobnzjz',
    };

    // Update cache
    configCache = values;
    lastFetchTime = now;

    console.log('[Remote Config] Fetched values:', values);
    return values;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Remote Config] Fetch error:', errorMessage);

    // Return cached values if available, otherwise defaults
    if (configCache) {
      console.log('[Remote Config] Using stale cache due to fetch error');
      return configCache;
    }

    // Return default values as fallback
    const defaults: RemoteConfigValues = {
      gbg_resource_id: 'd27b6807703eec9f5f5c0d45eb3abc883c142236055b85e30df2f75fdb22cbbe@1gobnzjz',
    };

    console.log('[Remote Config] Using default values due to error');
    return defaults;
  }
};

/**
 * Get a specific Remote Config value
 */
export const getConfigValue = async <K extends keyof RemoteConfigValues>(
  key: K,
): Promise<RemoteConfigValues[K]> => {
  const config = await fetchRemoteConfig();
  return config[key];
};

/**
 * Clear the Remote Config cache (useful for testing or forcing refresh)
 */
export const clearConfigCache = (): void => {
  configCache = null;
  lastFetchTime = 0;
  console.log('[Remote Config] Cache cleared');
};

/**
 * Get all Remote Config values
 */
export const getAllConfigValues = async (): Promise<RemoteConfigValues> => {
  return fetchRemoteConfig();
};
