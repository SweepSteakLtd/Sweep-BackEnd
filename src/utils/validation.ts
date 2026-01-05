/**
 * Centralized validation utilities for consistent input validation
 */

import { ValidationError } from './errors';

/**
 * Email validation using RFC 5322 compliant regex
 */
export function validateEmail(email: string): boolean {
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Validate email and throw error if invalid
 */
export function assertValidEmail(email: string, fieldName = 'email'): void {
  if (!validateEmail(email)) {
    throw new ValidationError(`${fieldName} must be a valid email address`);
  }
}

/**
 * Phone number validation (E.164 format)
 * Supports international phone numbers starting with +
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate phone number and throw error if invalid
 */
export function assertValidPhoneNumber(phone: string, fieldName = 'phone_number'): void {
  if (!validatePhoneNumber(phone)) {
    throw new ValidationError(
      `${fieldName} must be in E.164 format (e.g., +1234567890, max 15 digits)`,
    );
  }
}

/**
 * Validate string is non-empty
 */
export function validateNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Assert string is non-empty and throw error if not
 */
export function assertNonEmptyString(value: unknown, fieldName: string): asserts value is string {
  if (!validateNonEmptyString(value)) {
    throw new ValidationError(`${fieldName} must be a non-empty string`);
  }
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: string,
  options: { min?: number; max?: number },
): boolean {
  const length = value.length;
  if (options.min !== undefined && length < options.min) return false;
  if (options.max !== undefined && length > options.max) return false;
  return true;
}

/**
 * Assert string length and throw error if invalid
 */
export function assertStringLength(
  value: string,
  fieldName: string,
  options: { min?: number; max?: number },
): void {
  if (!validateStringLength(value, options)) {
    const constraints = [];
    if (options.min !== undefined) constraints.push(`minimum ${options.min} characters`);
    if (options.max !== undefined) constraints.push(`maximum ${options.max} characters`);
    throw new ValidationError(`${fieldName} must have ${constraints.join(' and ')}`);
  }
}

/**
 * Validate number is within range
 */
export function validateNumberRange(
  value: number,
  options: { min?: number; max?: number },
): boolean {
  if (options.min !== undefined && value < options.min) return false;
  if (options.max !== undefined && value > options.max) return false;
  return true;
}

/**
 * Assert number is within range and throw error if not
 */
export function assertNumberRange(
  value: number,
  fieldName: string,
  options: { min?: number; max?: number },
): void {
  if (!validateNumberRange(value, options)) {
    const constraints = [];
    if (options.min !== undefined) constraints.push(`minimum ${options.min}`);
    if (options.max !== undefined) constraints.push(`maximum ${options.max}`);
    throw new ValidationError(`${fieldName} must be ${constraints.join(' and ')}`);
  }
}

/**
 * Validate integer
 */
export function validateInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

/**
 * Assert value is an integer and throw error if not
 */
export function assertInteger(value: unknown, fieldName: string): asserts value is number {
  if (!validateInteger(value)) {
    throw new ValidationError(`${fieldName} must be an integer`);
  }
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0;
}

/**
 * Assert value is a positive number and throw error if not
 */
export function assertPositiveNumber(value: unknown, fieldName: string): asserts value is number {
  if (!validatePositiveNumber(value)) {
    throw new ValidationError(`${fieldName} must be a positive number`);
  }
}

/**
 * Validate date string (ISO 8601 format)
 */
export function validateISODateString(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Assert value is a valid ISO date string and throw error if not
 */
export function assertISODateString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== 'string' || !validateISODateString(value)) {
    throw new ValidationError(`${fieldName} must be a valid ISO 8601 date string`);
  }
}

/**
 * Validate array
 */
export function validateArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Assert value is an array and throw error if not
 */
export function assertArray<T>(value: unknown, fieldName: string): asserts value is T[] {
  if (!validateArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`);
  }
}

/**
 * Validate array length
 */
export function validateArrayLength<T>(
  value: T[],
  options: { min?: number; max?: number },
): boolean {
  const length = value.length;
  if (options.min !== undefined && length < options.min) return false;
  if (options.max !== undefined && length > options.max) return false;
  return true;
}

/**
 * Assert array length and throw error if invalid
 */
export function assertArrayLength<T>(
  value: T[],
  fieldName: string,
  options: { min?: number; max?: number },
): void {
  if (!validateArrayLength(value, options)) {
    const constraints = [];
    if (options.min !== undefined) constraints.push(`minimum ${options.min} items`);
    if (options.max !== undefined) constraints.push(`maximum ${options.max} items`);
    throw new ValidationError(`${fieldName} must have ${constraints.join(' and ')}`);
  }
}

/**
 * Validate boolean
 */
export function validateBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Assert value is a boolean and throw error if not
 */
export function assertBoolean(value: unknown, fieldName: string): asserts value is boolean {
  if (!validateBoolean(value)) {
    throw new ValidationError(`${fieldName} must be a boolean`);
  }
}

/**
 * Validate value is one of allowed values
 */
export function validateEnum<T>(value: unknown, allowedValues: T[]): value is T {
  return allowedValues.includes(value as T);
}

/**
 * Assert value is one of allowed values and throw error if not
 */
export function assertEnum<T>(value: unknown, fieldName: string, allowedValues: T[]): asserts value is T {
  if (!validateEnum(value, allowedValues)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.map((v) => JSON.stringify(v)).join(', ')}`,
    );
  }
}

/**
 * Sanitize HTML to prevent XSS
 * Basic sanitization - for production use a library like DOMPurify
 */
export function sanitizeHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Escape LIKE wildcards in SQL
 */
export function escapeLikeWildcards(input: string): string {
  return input.replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Validate UUID v4 format
 */
export function validateUUIDv4(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validate CUID format (used by this application)
 */
export function validateCUID(value: string): boolean {
  // CUID2 format: starts with lowercase letter, 24-32 characters
  const cuidRegex = /^[a-z][a-z0-9]{23,31}$/;
  return cuidRegex.test(value);
}

/**
 * Assert value is a valid CUID and throw error if not
 */
export function assertValidCUID(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== 'string' || !validateCUID(value)) {
    throw new ValidationError(`${fieldName} must be a valid CUID`);
  }
}
