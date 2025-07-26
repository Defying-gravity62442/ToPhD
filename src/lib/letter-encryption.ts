import crypto from 'crypto';

// AES-256-GCM params
const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits

// --- E2EE utilities ---

// Generate a random 32-byte DEK (base64)
export function generateDEK(): string {
  return crypto.randomBytes(32).toString('base64');
}

// Generate a random 16-byte salt (base64)
export function generateSalt(): string {
  return crypto.randomBytes(16).toString('base64');
}

// Derive a 32-byte key from password and salt using PBKDF2 (100k iterations, SHA-256)
export async function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, Buffer.from(salt, 'base64'), 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// Encrypt (wrap) the DEK with a derived key, return base64
export function wrapDEK(dek: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(dek, 'base64')),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

// Decrypt (unwrap) the DEK with a derived key, return base64 DEK
export function unwrapDEK(wrappedDEK: string, key: Buffer): string {
  const data = Buffer.from(wrappedDEK, 'base64');
  const iv = data.slice(0, IV_LENGTH);
  const tag = data.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = data.slice(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  return decrypted.toString('base64');
} 