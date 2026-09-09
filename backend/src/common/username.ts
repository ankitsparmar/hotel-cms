// Shared normalization for the username column: lowercase, and restricted to
// a safe, URL/typing-friendly character set. Used both to validate a
// user-chosen username and to derive a default one from an email address
// when the field is left blank at signup / staff creation.
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function usernameFromEmail(email: string): string {
  const base = (email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return base || 'user';
}

// Appends a numeric suffix until `exists` reports the candidate is free.
// `exists` is scoped by the caller (per-property, or per-super-admin) to
// match the (propertyId, username) unique index.
export async function ensureUniqueUsername(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  let candidate = base;
  let n = 1;
  while (await exists(candidate)) {
    n += 1;
    candidate = `${base}${n}`;
  }
  return candidate;
}
