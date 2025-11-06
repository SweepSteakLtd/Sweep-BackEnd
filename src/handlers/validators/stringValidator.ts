/**
 * String Validator
 * Consolidates 33+ string validation patterns across handlers
 */

export interface StringValidationOptions {
  minLength?: number;
  maxLength?: number;
  allowEmpty?: boolean;
  pattern?: RegExp;
  customMessage?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates string fields with various constraints
 * @param value - The value to validate
 * @param fieldName - Name of the field (for error messages)
 * @param options - Validation options
 */
export const validateString = (
  value: any,
  fieldName: string,
  options: StringValidationOptions = {},
): ValidationResult => {
  // Handle null/undefined
  if (value === undefined || value === null) {
    if (options.allowEmpty) {
      return { valid: true };
    }
    return {
      valid: false,
      error: `${fieldName} is required`,
    };
  }

  // Type check
  if (typeof value !== 'string') {
    return {
      valid: false,
      error: `${fieldName} must be a string`,
    };
  }

  // Empty string check
  if (!options.allowEmpty && value.trim().length === 0) {
    return {
      valid: false,
      error: `${fieldName} must be a non-empty string`,
    };
  }

  // Min length check
  if (options.minLength !== undefined && value.length < options.minLength) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${options.minLength} characters`,
    };
  }

  // Max length check
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    return {
      valid: false,
      error: `${fieldName} must not exceed ${options.maxLength} characters`,
    };
  }

  // Pattern check
  if (options.pattern && !options.pattern.test(value)) {
    return {
      valid: false,
      error: options.customMessage || `${fieldName} format is invalid`,
    };
  }

  return { valid: true };
};

/**
 * Email validator - specialized string validator
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (value: any, fieldName: string = 'email'): ValidationResult => {
  return validateString(value, fieldName, {
    pattern: EMAIL_REGEX,
    customMessage: `${fieldName} must be a valid email address`,
  });
};

/**
 * URL validator - specialized string validator
 */
export const validateURL = (value: any, fieldName: string = 'url'): ValidationResult => {
  if (value === undefined || value === null || value === '') {
    return { valid: true }; // Allow empty
  }

  if (typeof value !== 'string') {
    return {
      valid: false,
      error: `${fieldName} must be a string`,
    };
  }

  try {
    new URL(value);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `${fieldName} must be a valid URL`,
    };
  }
};

export const Validators = {
  firstName: (value: any) => validateString(value, 'first_name', { maxLength: 100 }),
  lastName: (value: any) => validateString(value, 'last_name', { maxLength: 100 }),
  nickname: (value: any) => validateString(value, 'nickname', { maxLength: 50, allowEmpty: true }),
  bio: (value: any) => validateString(value, 'bio', { maxLength: 500, allowEmpty: true }),
  name: (value: any) => validateString(value, 'name', { maxLength: 200 }),
  description: (value: any) =>
    validateString(value, 'description', { maxLength: 1000, allowEmpty: true }),
  tournamentId: (value: any) => validateString(value, 'tournament_id', {}),
  email: validateEmail,
  profilePicture: (value: any) => validateURL(value, 'profile_picture'),
};
