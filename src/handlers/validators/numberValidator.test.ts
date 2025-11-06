import {
  validateNonNegativeNumber,
  validateNumber,
  validatePositiveNumber,
  Validators,
} from './numberValidator';

describe('validateNumber', () => {
  test('returns error for required field when value is undefined or null', () => {
    const result1 = validateNumber(undefined, 'count');
    expect(result1.valid).toBe(false);
    expect(result1.error).toBe('count is required');

    const result2 = validateNumber(null, 'count');
    expect(result2.valid).toBe(false);
    expect(result2.error).toBe('count is required');
  });

  test('returns valid for null/undefined when allowNull is true', () => {
    expect(validateNumber(undefined, 'count', { allowNull: true }).valid).toBe(true);
    expect(validateNumber(null, 'count', { allowNull: true }).valid).toBe(true);
  });

  test('returns error for non-number values', () => {
    const result1 = validateNumber('123', 'count');
    expect(result1.valid).toBe(false);
    expect(result1.error).toBe('count must be a number');

    const result2 = validateNumber(NaN, 'count');
    expect(result2.valid).toBe(false);
    expect(result2.error).toBe('count must be a number');
  });

  test('validates integer constraint', () => {
    const result = validateNumber(3.14, 'count', { integer: true });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('count must be an integer');

    expect(validateNumber(5, 'count', { integer: true }).valid).toBe(true);
  });

  test('validates minimum constraint', () => {
    const result = validateNumber(5, 'age', { minimum: 18 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('age must be at least 18');
  });

  test('validates minimum 0 with special message', () => {
    const result = validateNumber(-5, 'balance', { minimum: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('balance must be non-negative');
  });

  test('validates maximum constraint', () => {
    const result = validateNumber(150, 'score', { maximum: 100 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('score must not exceed 100');
  });

  test('returns valid for number meeting all constraints', () => {
    const result = validateNumber(50, 'age', { minimum: 18, maximum: 100, integer: true });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('validatePositiveNumber', () => {
  test('returns error for zero', () => {
    const result = validatePositiveNumber(0, 'amount');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('amount must be at least 0.01');
  });

  test('returns error for negative numbers', () => {
    const result = validatePositiveNumber(-10, 'amount');
    expect(result.valid).toBe(false);
  });

  test('returns valid for positive numbers', () => {
    expect(validatePositiveNumber(0.01, 'amount').valid).toBe(true);
    expect(validatePositiveNumber(100, 'amount').valid).toBe(true);
  });
});

describe('validateNonNegativeNumber', () => {
  test('returns valid for zero', () => {
    expect(validateNonNegativeNumber(0, 'balance').valid).toBe(true);
  });

  test('returns error for negative numbers', () => {
    const result = validateNonNegativeNumber(-10, 'balance');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('balance must be non-negative');
  });

  test('returns valid for positive numbers', () => {
    expect(validateNonNegativeNumber(100, 'balance').valid).toBe(true);
  });
});

describe('Validators presets', () => {
  test('amount requires positive number', () => {
    expect(Validators.amount(10).valid).toBe(true);
    expect(Validators.amount(0).valid).toBe(false);
    expect(Validators.amount(-5).valid).toBe(false);
  });

  test('entryFee allows zero', () => {
    expect(Validators.entryFee(0).valid).toBe(true);
    expect(Validators.entryFee(10).valid).toBe(true);
    expect(Validators.entryFee(-5).valid).toBe(false);
  });

  test('maxParticipants requires integer >= 2', () => {
    expect(Validators.maxParticipants(2).valid).toBe(true);
    expect(Validators.maxParticipants(10).valid).toBe(true);
    expect(Validators.maxParticipants(1).valid).toBe(false);
    expect(Validators.maxParticipants(3.5).valid).toBe(false);
  });
});
