import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Symmetric encryption for OTA channel credentials at rest (spec §14: "OTA
// credentials ... stored encrypted at rest, never logged"). Not a KMS —
// adequate for a single app-managed secret; swap for a managed KMS key
// before handling real partner credentials in production.
const ALGO = 'aes-256-gcm';

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, 'hotel-cms-ota-credentials', 32);
}

export function encryptJson(payload: unknown, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptJson<T = unknown>(blob: string, secret: string): T {
  const key = deriveKey(secret);
  const raw = Buffer.from(blob, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}
