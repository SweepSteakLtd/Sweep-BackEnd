/**
 * Phone Number Validator (E.164 Format)
 * Consolidates 6 duplicated phone validation patterns
 */

const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates phone number in E.164 format
 * @param value - The phone number to validate
 * @param fieldName - Name of the field (for error messages)
 * @returns Validation result with error message if invalid
 */
export const validatePhoneNumber = (
  value: any,
  fieldName: string = 'phone_number',
): ValidationResult => {
  if (value === undefined || value === null || value === '') {
    // Allow empty values (use separate required check if needed)
    return { valid: true };
  }

  if (typeof value !== 'string') {
    return {
      valid: false,
      error: `${fieldName} must be a string`,
    };
  }

  if (!PHONE_REGEX.test(value)) {
    return {
      valid: false,
      error: `${fieldName} must be in E.164 format (e.g., +12345678901)`,
    };
  }

  return { valid: true };
};

/**
 * Asserts phone number is valid, throws if not
 * Useful for required phone numbers
 */
export const assertValidPhoneNumber = (value: any, fieldName: string = 'phone_number'): void => {
  const result = validatePhoneNumber(value, fieldName);
  if (!result.valid) {
    throw new Error(result.error);
  }
};
