import crypto from 'crypto';
import 'dotenv/config';

const algorithm = 'aes-256-ctr';
const keyString = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
// Ensure key is exactly 32 bytes
const secretKey = Buffer.from(keyString.padEnd(32, '0').slice(0, 32), 'utf8');

export function getEncryptStream(ivHex) {
  const ivBuffer = Buffer.from(ivHex, 'hex');
  return crypto.createCipheriv(algorithm, secretKey, ivBuffer);
}

export function getDecryptStream(ivHex) {
  const ivBuffer = Buffer.from(ivHex, 'hex');
  return crypto.createDecipheriv(algorithm, secretKey, ivBuffer);
}
