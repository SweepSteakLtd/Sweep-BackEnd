import { assertValidPhoneNumber, validatePhoneNumber } from './phoneValidator';

describe('validatePhoneNumber', () => {
  test('returns valid for empty values', () => {
    expect(validatePhoneNumber(undefined).valid).toBe(true);
    expect(validatePhoneNumber(null).valid).toBe(true);
    expect(validatePhoneNumber('').valid).toBe(true);
  });

  test('returns error for non-string values', () => {
    const result = validatePhoneNumber(12345);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('phone_number must be a string');
  });

  test('returns error for invalid E.164 format', () => {
    const invalidNumbers = [
      '1234567890', // Missing +
      '+0123456789', // Starts with 0
      '+123', // Too short
      '+12345678901234567', // Too long
      '+1 234 567 890', // Contains spaces
      '+1-234-567-890', // Contains dashes
    ];

    invalidNumbers.forEach(phone => {
      const result = validatePhoneNumber(phone);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('phone_number must be in E.164 format (e.g., +12345678901)');
    });
  });

  test('returns valid for correct E.164 format', () => {
    const validNumbers = ['+12345678901', '+491234567890', '+447911123456', '+861234567890'];

    validNumbers.forEach(phone => {
      const result = validatePhoneNumber(phone);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  test('uses custom field name in error messages', () => {
    const result = validatePhoneNumber(12345, 'contact_number');
    expect(result.error).toBe('contact_number must be a string');
  });
});

describe('assertValidPhoneNumber', () => {
  test('does not throw for valid phone numbers', () => {
    expect(() => assertValidPhoneNumber('+12345678901')).not.toThrow();
    expect(() => assertValidPhoneNumber(undefined)).not.toThrow();
  });

  test('throws for invalid phone numbers', () => {
    expect(() => assertValidPhoneNumber('1234567890')).toThrow(
      'phone_number must be in E.164 format (e.g., +12345678901)',
    );
    expect(() => assertValidPhoneNumber(12345)).toThrow('phone_number must be a string');
  });

  test('uses custom field name in error messages', () => {
    expect(() => assertValidPhoneNumber(12345, 'mobile')).toThrow('mobile must be a string');
  });
});
