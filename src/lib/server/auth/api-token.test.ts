import { describe, it, expect } from 'vitest';
import { createTestDb } from '../db/test-db';
import { users, apiTokens } from '../db/schema';
import { createApiToken, verifyApiToken, bearerToken, hashToken } from './api-token';

function setup() {
  const db = createTestDb();
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
    .returning()
    .all();
  return { db, user };
}

describe('createApiToken', () => {
  it('returns a token that verifies back to its user', () => {
    const { db, user } = setup();
    const token = createApiToken(db, user.id, 'iphone-shortcut');
    expect(verifyApiToken(db, token)).toEqual({ userId: user.id, name: 'iphone-shortcut' });
  });

  it('never stores the token itself', () => {
    const { db, user } = setup();
    const token = createApiToken(db, user.id, 'iphone-shortcut');
    const [row] = db.select().from(apiTokens).all();
    expect(row.tokenHash).not.toBe(token);
    expect(row.tokenHash).toBe(hashToken(token));
  });

  it('mints a distinct token each time', () => {
    const { db, user } = setup();
    const a = createApiToken(db, user.id, 'one');
    const b = createApiToken(db, user.id, 'two');
    expect(a).not.toBe(b);
    expect(verifyApiToken(db, a)?.name).toBe('one');
    expect(verifyApiToken(db, b)?.name).toBe('two');
  });

  it('refuses a nameless token', () => {
    const { db, user } = setup();
    expect(() => createApiToken(db, user.id, '  ')).toThrow();
  });
});

describe('verifyApiToken', () => {
  it('rejects an unknown, empty, or altered token', () => {
    const { db, user } = setup();
    const token = createApiToken(db, user.id, 'iphone-shortcut');
    expect(verifyApiToken(db, 'nope')).toBeNull();
    expect(verifyApiToken(db, '')).toBeNull();
    expect(verifyApiToken(db, null)).toBeNull();
    expect(verifyApiToken(db, `${token}x`)).toBeNull();
  });

  it('records when the token was last used', () => {
    const { db, user } = setup();
    const token = createApiToken(db, user.id, 'iphone-shortcut');
    expect(db.select().from(apiTokens).all()[0].lastUsedAt).toBeNull();
    verifyApiToken(db, token, new Date('2026-08-03T06:00:00Z'));
    expect(db.select().from(apiTokens).all()[0].lastUsedAt).toBe('2026-08-03T06:00:00.000Z');
  });
});

describe('bearerToken', () => {
  it('pulls the token out of the header, however it is cased or spaced', () => {
    expect(bearerToken('Bearer abc123')).toBe('abc123');
    expect(bearerToken('bearer   abc123')).toBe('abc123');
    expect(bearerToken('  Bearer abc123  ')).toBe('abc123');
  });

  it('is null for anything that is not a bearer header', () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken('')).toBeNull();
    expect(bearerToken('abc123')).toBeNull();
    expect(bearerToken('Basic abc123')).toBeNull();
    expect(bearerToken('Bearer')).toBeNull();
    expect(bearerToken('Bearer a b')).toBeNull();
  });
});
