import { randomInt } from 'crypto';

// Unambiguous uppercase alphabet — no 0/O or 1/I — so codes are easy to read
// and type back in correctly.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateReferralCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
    if (i === 3) code += '-';
  }
  return code;
}
