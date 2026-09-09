import { randomBytes, createHash } from 'crypto';

// Shared helper for one-time links (email verification, password reset):
// the raw token goes out in the emailed URL and is never persisted; only its
// SHA-256 hash is stored, so a leaked database never exposes usable tokens.
export function generateRawToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
