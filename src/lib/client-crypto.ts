// Client-side crypto utilities for E2EE using Web Crypto API

// Helper function to safely decode base64 strings
export function safeBase64Decode(base64String: string | null): Uint8Array {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('Invalid base64 string: must be a non-empty string');
  }
  
  try {
    // Test if the string can be decoded as base64
    atob(base64String);
    return Uint8Array.from(atob(base64String), c => c.charCodeAt(0));
  } catch {
    throw new Error('Invalid base64 string: not a valid base64 encoding');
  }
}

// Derive a 256-bit key from password and salt using PBKDF2
export async function pbkdf2(password: string, salt: string): Promise<CryptoKey> {
  const saltBytes = safeBase64Decode(salt);
  
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// AES-GCM encrypt, returns base64 (IV + ciphertext)
export async function aesGcmEncrypt(plainText: string, key: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );
  // Concatenate IV + ciphertext
  const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.length);
  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

// AES-GCM decrypt, expects base64 (IV + ciphertext)
export async function aesGcmDecrypt(cipherText: string, key: CryptoKey): Promise<string> {
  const data = safeBase64Decode(cipherText);
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const plainBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plainBuffer);
}

// Generate random base64 string
export function generateRandomBase64(bytes: number): string {
  const arr = window.crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...arr));
}

// Unwrap DEK from Node.js format: [IV][TAG][ENCRYPTED_DEK] (all base64)
export async function unwrapDEK(wrappedDEK: string, key: CryptoKey): Promise<string> {
  const data = safeBase64Decode(wrappedDEK);
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const encrypted = data.slice(28);
  // WebCrypto expects ciphertext+tag
  const ciphertextWithTag = new Uint8Array(encrypted.length + tag.length);
  ciphertextWithTag.set(encrypted, 0);
  ciphertextWithTag.set(tag, encrypted.length);
  const plainBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertextWithTag
  );
  // Convert the raw bytes back to base64
  return btoa(String.fromCharCode(...new Uint8Array(plainBuffer)));
} 