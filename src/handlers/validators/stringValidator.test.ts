import { validateEmail, validateString, validateURL, Validators } from './stringValidator';

describe('validateString', () => {
  test('returns error for required field when value is undefined or null', () => {
    const result1 = validateString(undefined, 'name');
    expect(result1.valid).toBe(false);
    expect(result1.error).toBe('name is required');

    const result2 = validateString(null, 'name');
    expect(result2.valid).toBe(false);
    expect(result2.error).toBe('name is required');
  });

  test('returns valid for null/undefined when allowEmpty is true', () => {
    expect(validateString(undefined, 'name', { allowEmpty: true }).valid).toBe(true);
    expect(validateString(null, 'name', { allowEmpty: true }).valid).toBe(true);
  });

  test('returns error for non-string values', () => {
    const result = validateString(123, 'name');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('name must be a string');
  });

  test('returns error for empty string when allowEmpty is false', () => {
    const result = validateString('   ', 'name');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('name must be a non-empty string');
  });

  test('returns valid for empty string when allowEmpty is true', () => {
    expect(validateString('', 'bio', { allowEmpty: true }).valid).toBe(true);
    expect(validateString('   ', 'bio', { allowEmpty: true }).valid).toBe(true);
  });

  test('validates minLength', () => {
    const result = validateString('abc', 'password', { minLength: 5 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('password must be at least 5 characters');
  });

  test('validates maxLength', () => {
    const result = validateString('a'.repeat(101), 'first_name', { maxLength: 100 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('first_name must not exceed 100 characters');
  });

  test('validates pattern', () => {
    const pattern = /^[A-Z]/;
    const result = validateString('abc', 'code', {
      pattern,
      customMessage: 'Must start with capital letter',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Must start with capital letter');
  });

  test('returns valid for string meeting all constraints', () => {
    const result = validateString('John', 'first_name', { maxLength: 100 });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('validateEmail', () => {
  test('returns error for invalid email formats', () => {
    const invalidEmails = ['notanemail', 'missing@domain', '@nodomain.com', 'spaces in@email.com'];

    invalidEmails.forEach(email => {
      const result = validateEmail(email);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('email must be a valid email address');
    });
  });

  test('returns valid for correct email formats', () => {
    const validEmails = ['test@example.com', 'user.name@domain.co.uk', 'email+tag@gmail.com'];

    validEmails.forEach(email => {
      const result = validateEmail(email);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  test('uses custom field name', () => {
    const result = validateEmail('invalid', 'contact_email');
    expect(result.error).toBe('contact_email must be a valid email address');
  });
});

describe('validateURL', () => {
  test('returns valid for empty values', () => {
    expect(validateURL(undefined).valid).toBe(true);
    expect(validateURL(null).valid).toBe(true);
    expect(validateURL('').valid).toBe(true);
  });

  test('returns error for non-string values', () => {
    const result = validateURL(123);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('url must be a string');
  });

  test('returns error for invalid URLs', () => {
    const invalidUrls = ['not-a-url', 'ht!tp://invalid', 'just text', '://noscheme.com'];

    invalidUrls.forEach(url => {
      const result = validateURL(url);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('url must be a valid URL');
    });
  });

  test('returns valid for correct URLs', () => {
    const validUrls = [
      'https://example.com',
      'http://localhost:3000',
      'https://sub.domain.com/path?query=value',
    ];

    validUrls.forEach(url => {
      const result = validateURL(url);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});

describe('Validators presets', () => {
  test('firstName validates correctly', () => {
    expect(Validators.firstName('John').valid).toBe(true);
    expect(Validators.firstName('a'.repeat(101)).valid).toBe(false);
  });

  test('nickname allows empty', () => {
    expect(Validators.nickname('').valid).toBe(true);
    expect(Validators.nickname(null).valid).toBe(true);
  });

  test('email validates format', () => {
    expect(Validators.email('test@example.com').valid).toBe(true);
    expect(Validators.email('invalid').valid).toBe(false);
  });
});
