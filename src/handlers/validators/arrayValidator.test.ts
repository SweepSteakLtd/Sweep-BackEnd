import { validateArray, validateStringArray, Validators } from './arrayValidator';

describe('validateArray', () => {
  test('returns error for required field when value is undefined or null', () => {
    const result1 = validateArray(undefined, 'items');
    expect(result1.valid).toBe(false);
    expect(result1.error).toBe('items is required');

    const result2 = validateArray(null, 'items');
    expect(result2.valid).toBe(false);
    expect(result2.error).toBe('items is required');
  });

  test('returns valid for null/undefined when allowNull is true', () => {
    expect(validateArray(undefined, 'items', { allowNull: true }).valid).toBe(true);
    expect(validateArray(null, 'items', { allowNull: true }).valid).toBe(true);
  });

  test('returns error for non-array values', () => {
    const result = validateArray('not-array', 'items');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('items must be an array');
  });

  test('validates minItems constraint', () => {
    const result = validateArray([], 'items', { minItems: 1 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('items must contain at least one item');

    const result2 = validateArray(['a'], 'items', { minItems: 3 });
    expect(result2.valid).toBe(false);
    expect(result2.error).toBe('items must contain at least 3 items');
  });

  test('validates maxItems constraint', () => {
    const result = validateArray([1, 2, 3, 4], 'items', { maxItems: 3 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('items must not exceed 3 items');
  });

  test('validates string item type', () => {
    const result = validateArray(['a', 123, 'c'], 'names', { itemType: 'string' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('All names must be non-empty strings');

    const result2 = validateArray(['a', '  ', 'c'], 'names', { itemType: 'string' });
    expect(result2.valid).toBe(false);
    expect(result2.error).toBe('All names must be non-empty strings');
  });

  test('validates number item type', () => {
    const result = validateArray([1, '2', 3], 'counts', { itemType: 'number' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('All counts must be numbers');

    const result2 = validateArray([1, NaN, 3], 'counts', { itemType: 'number' });
    expect(result2.valid).toBe(false);
  });

  test('validates object item type', () => {
    const result = validateArray([{}, 'not-object'], 'records', { itemType: 'object' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('All records must be objects');

    const result2 = validateArray([{}, null], 'records', { itemType: 'object' });
    expect(result2.valid).toBe(false);

    const result3 = validateArray([{}, []], 'records', { itemType: 'object' });
    expect(result3.valid).toBe(false);
  });

  test('validates uniqueness constraint', () => {
    const result = validateArray([1, 2, 2, 3], 'ids', { unique: true });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('ids must contain unique values (no duplicates)');

    expect(validateArray([1, 2, 3], 'ids', { unique: true }).valid).toBe(true);
  });

  test('returns valid for array meeting all constraints', () => {
    const result = validateArray(['a', 'b', 'c'], 'items', {
      minItems: 1,
      maxItems: 5,
      itemType: 'string',
      unique: true,
    });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('validateStringArray', () => {
  test('validates string arrays correctly', () => {
    expect(validateStringArray(['a', 'b'], 'names').valid).toBe(true);
    expect(validateStringArray(['a', 123], 'names').valid).toBe(false);
  });

  test('applies additional options', () => {
    const result = validateStringArray(['a'], 'names', { minItems: 2 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('names must contain at least 2 items');
  });
});

describe('Validators presets', () => {
  test('playerIds validates correctly', () => {
    expect(Validators.playerIds(['p1', 'p2']).valid).toBe(true);
    expect(Validators.playerIds([]).valid).toBe(false); // minItems: 1
    expect(Validators.playerIds(['p1', 'p2', 'p1']).valid).toBe(false); // unique
    expect(Validators.playerIds(Array(11).fill('p')).valid).toBe(false); // maxItems: 10
  });

  test('userIdList allows null', () => {
    expect(Validators.userIdList(null).valid).toBe(true);
    expect(Validators.userIdList(['u1', 'u2']).valid).toBe(true);
  });

  test('rewards validates object arrays', () => {
    expect(Validators.rewards([{ type: 'coin' }]).valid).toBe(true);
    expect(Validators.rewards(['not-object']).valid).toBe(false);
    expect(Validators.rewards(null).valid).toBe(true);
  });
});
