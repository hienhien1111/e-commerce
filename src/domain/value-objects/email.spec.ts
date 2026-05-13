import { Email } from './email';

describe('Email value object', () => {
  describe('create()', () => {
    it.each([
      'user@example.com',
      'first.last@example.co.uk',
      'name+tag@sub.example.com',
      'a@b.io',
    ])('accepts valid email %s', (raw) => {
      expect(() => Email.create(raw)).not.toThrow();
    });

    it('normalizes to lowercase and trims whitespace', () => {
      const email = Email.create('  USER@Example.COM  ');
      expect(email.value).toBe('user@example.com');
    });

    it.each([
      '',
      '   ',
      'no-at-sign.com',
      '@no-local-part.com',
      'no-domain@',
      'spaces in@email.com',
      'double@@at.com',
    ])('rejects invalid email %s', (raw) => {
      expect(() => Email.create(raw)).toThrow();
    });

    it('rejects emails longer than 254 chars (RFC 5321)', () => {
      const longLocal = 'a'.repeat(250);
      expect(() => Email.create(`${longLocal}@example.com`)).toThrow(
        /254 characters/,
      );
    });

    it('rejects non-string input', () => {
      // @ts-expect-error testing runtime guard
      expect(() => Email.create(123)).toThrow(/must be a string/);
    });
  });

  describe('accessors', () => {
    const email = Email.create('alice@acme.io');

    it('exposes localPart', () => {
      expect(email.localPart).toBe('alice');
    });

    it('exposes domain', () => {
      expect(email.domain).toBe('acme.io');
    });

    it('toString returns normalized value', () => {
      expect(email.toString()).toBe('alice@acme.io');
    });
  });

  describe('equals()', () => {
    it('returns true for same normalized value', () => {
      expect(
        Email.create('User@Example.com').equals(
          Email.create('USER@EXAMPLE.COM'),
        ),
      ).toBe(true);
    });

    it('returns false for different values', () => {
      expect(Email.create('a@b.com').equals(Email.create('c@d.com'))).toBe(
        false,
      );
    });

    it('returns false for null/undefined', () => {
      const email = Email.create('a@b.com');
      expect(email.equals(null)).toBe(false);
      expect(email.equals(undefined)).toBe(false);
    });
  });
});
