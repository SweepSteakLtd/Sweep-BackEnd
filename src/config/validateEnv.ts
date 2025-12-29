/**
 * Environment Variable Validation
 * Validates that all required environment variables are set on application startup
 */

interface ValidationResult {
  valid: boolean;
  missing: string[];
  errors: string[];
}

/**
 * Validate GBG-related environment variables
 */
export function validateGBGEnv(): ValidationResult {
  const required = ['GBG_CLIENT_ID', 'GBG_CLIENT_SECRET', 'GBG_USERNAME', 'GBG_PASSWORD'];

  const missing = required.filter(key => !process.env[key]);
  const errors: string[] = [];

  // Check for empty values
  required.forEach(key => {
    if (process.env[key] && process.env[key]!.trim() === '') {
      errors.push(`${key} is set but empty`);
    }
  });

  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors,
  };
}

/**
 * Validate GamStop-related environment variables
 */
export function validateGamStopEnv(): ValidationResult {
  const required = ['GAMSTOP_API_KEY'];

  const missing = required.filter(key => !process.env[key]);
  const errors: string[] = [];

  // Check for empty values
  required.forEach(key => {
    if (process.env[key] && process.env[key]!.trim() === '') {
      errors.push(`${key} is set but empty`);
    }
  });

  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors,
  };
}

/**
 * Validate all compliance-related environment variables (GBG + GamStop)
 * Throws an error if validation fails
 */
export function validateComplianceEnv(): void {
  const gbgValidation = validateGBGEnv();
  const gamstopValidation = validateGamStopEnv();

  const allMissing = [...gbgValidation.missing, ...gamstopValidation.missing];
  const allErrors = [...gbgValidation.errors, ...gamstopValidation.errors];

  if (allMissing.length > 0 || allErrors.length > 0) {
    const errorMessages: string[] = [];

    if (allMissing.length > 0) {
      errorMessages.push(`Missing required environment variables: ${allMissing.join(', ')}`);
    }

    if (allErrors.length > 0) {
      errorMessages.push(`Environment variable errors: ${allErrors.join(', ')}`);
    }

    throw new Error(
      `Environment validation failed:\n${errorMessages.join('\n')}\n\nPlease check your environment configuration.`,
    );
  }

  console.log('[ENV] ✓ All compliance environment variables validated successfully');
}

/**
 * Get environment name with fallback
 */
export function getEnvironment(): string {
  return process.env.APPLIED_ENV || process.env.NODE_ENV || 'development';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development' || getEnvironment() === 'local';
}
