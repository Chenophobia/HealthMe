/*
 * Bearer tokens for the Apple Shortcut.
 *
 * Kept apart from sessions on purpose: a session is a browser that expires,
 * this is a long-lived credential held by a phone automation, and the two
 * should never be interchangeable. Only the digest is stored — a leaked
 * database then can't be replayed against the endpoint.
 *
 * SHA-256 rather than argon2 (which passwords use): these are 256 bits of
 * CSPRNG output, so there is nothing to brute-force and no reason to pay a
 * slow KDF on every request.
 */
import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/connect';
import { apiTokens } from '../db/schema';

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Mints a token, stores only its digest, and returns the one plaintext copy. */
export function createApiToken(
  db: Db,
  userId: number,
  name: string,
  now: Date = new Date()
): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Token needs a name');

  const token = randomBytes(32).toString('base64url');
  db.insert(apiTokens)
    .values({
      userId,
      name: trimmed,
      tokenHash: hashToken(token),
      createdAt: now.toISOString()
    })
    .run();
  return token;
}

export function verifyApiToken(
  db: Db,
  token: string | null,
  now: Date = new Date()
): { userId: number; name: string } | null {
  if (!token) return null;

  const [row] = db
    .select({ id: apiTokens.id, userId: apiTokens.userId, name: apiTokens.name })
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, hashToken(token)))
    .limit(1)
    .all();
  if (!row) return null;

  db.update(apiTokens).set({ lastUsedAt: now.toISOString() }).where(eq(apiTokens.id, row.id)).run();
  return { userId: row.userId, name: row.name };
}

/** Pulls the token out of an `Authorization: Bearer …` header. */
export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer[ \t]+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}
