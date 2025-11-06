/**
 * Array Validator
 * Consolidates 9 array validation patterns (player_ids, rewards, user_id_list)
 */

export interface ArrayValidationOptions {
  minItems?: number;
  maxItems?: number;
  unique?: boolean;
  itemType?: 'string' | 'number' | 'object';
  allowNull?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates array fields with various constraints
 */
export const validateArray = (
  value: any,
  fieldName: string,
  options: ArrayValidationOptions = {},
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
  if (!Array.isArray(value)) {
    return {
      valid: false,
      error: `${fieldName} must be an array`,
    };
  }

  // Min items check
  if (options.minItems !== undefined && value.length < options.minItems) {
    if (options.minItems === 1) {
      return {
        valid: false,
        error: `${fieldName} must contain at least one item`,
      };
    }
    return {
      valid: false,
      error: `${fieldName} must contain at least ${options.minItems} items`,
    };
  }

  // Max items check
  if (options.maxItems !== undefined && value.length > options.maxItems) {
    return {
      valid: false,
      error: `${fieldName} must not exceed ${options.maxItems} items`,
    };
  }

  // Item type validation
  if (options.itemType) {
    for (let i = 0; i < value.length; i++) {
      const item = value[i];

      if (options.itemType === 'string') {
        if (typeof item !== 'string' || item.trim().length === 0) {
          return {
            valid: false,
            error: `All ${fieldName} must be non-empty strings`,
          };
        }
      } else if (options.itemType === 'number') {
        if (typeof item !== 'number' || isNaN(item)) {
          return {
            valid: false,
            error: `All ${fieldName} must be numbers`,
          };
        }
      } else if (options.itemType === 'object') {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          return {
            valid: false,
            error: `All ${fieldName} must be objects`,
          };
        }
      }
    }
  }

  // Uniqueness check
  if (options.unique) {
    const uniqueItems = new Set(value);
    if (uniqueItems.size !== value.length) {
      return {
        valid: false,
        error: `${fieldName} must contain unique values (no duplicates)`,
      };
    }
  }

  return { valid: true };
};

/**
 * Validates string array (most common use case)
 */
export const validateStringArray = (
  value: any,
  fieldName: string,
  options: Omit<ArrayValidationOptions, 'itemType'> = {},
): ValidationResult => {
  return validateArray(value, fieldName, {
    ...options,
    itemType: 'string',
  });
};

// COMMON FIELD VALIDATORS
export const Validators = {
  playerIds: (value: any) =>
    validateStringArray(value, 'player_ids', {
      minItems: 1,
      maxItems: 10,
      unique: true,
    }),
  userIdList: (value: any) =>
    validateStringArray(value, 'user_id_list', {
      allowNull: true,
    }),
  rewards: (value: any) =>
    validateArray(value, 'rewards', {
      itemType: 'object',
      allowNull: true,
    }),
};
