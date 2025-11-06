/**
 * Number Validator
 * Consolidates 15+ number validation patterns
 */

export interface NumberValidationOptions {
  minimum?: number;
  maximum?: number;
  integer?: boolean;
  allowNull?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates numeric fields with various constraints
 */
export const validateNumber = (
  value: any,
  fieldName: string,
  options: NumberValidationOptions = {},
): ValidationResult => {
  // Handle null/undefined
  if (value === undefined || value === null) {
    if (options.allowNull) {
      return { valid: true };
    }
    return {
      valid: false,
      error: `${fieldName} is required`,
    };
  }

  // Type check
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      error: `${fieldName} must be a number`,
    };
  }

  // Integer check
  if (options.integer && !Number.isInteger(value)) {
    return {
      valid: false,
      error: `${fieldName} must be an integer`,
    };
  }

  // Minimum check
  if (options.minimum !== undefined && value < options.minimum) {
    if (options.minimum === 0) {
      return {
        valid: false,
        error: `${fieldName} must be non-negative`,
      };
    }
    return {
      valid: false,
      error: `${fieldName} must be at least ${options.minimum}`,
    };
  }

  // Maximum check
  if (options.maximum !== undefined && value > options.maximum) {
    return {
      valid: false,
      error: `${fieldName} must not exceed ${options.maximum}`,
    };
  }

  return { valid: true };
};

/**
 * Validates positive number (> 0)
 */
export const validatePositiveNumber = (value: any, fieldName: string): ValidationResult => {
  return validateNumber(value, fieldName, { minimum: 0.01 });
};

/**
 * Validates non-negative number (>= 0)
 */
export const validateNonNegativeNumber = (value: any, fieldName: string): ValidationResult => {
  return validateNumber(value, fieldName, { minimum: 0 });
};

// COMMON FIELD VALIDATORS
export const Validators = {
  amount: (value: any) => validatePositiveNumber(value, 'amount'),
  entryFee: (value: any) => validateNumber(value, 'entry_fee', { minimum: 0, allowNull: true }),
  bettingLimit: (value: any) =>
    validateNumber(value, 'betting_limit', { minimum: 0, allowNull: true }),
  currentBalance: (value: any) =>
    validateNumber(value, 'current_balance', { minimum: 0, allowNull: true }),
  maxParticipants: (value: any) =>
    validateNumber(value, 'max_participants', { minimum: 2, integer: true }),
};
