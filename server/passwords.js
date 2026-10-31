import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const SALT_BYTES = 16;
const KEY_BYTES = 64;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const derivedKey = await scrypt(password, salt, KEY_BYTES);
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password, encodedHash) {
  if (typeof encodedHash !== 'string') return false;
  const [algorithm, saltHex, keyHex, extra] = encodedHash.split('$');
  if (
    algorithm !== 'scrypt' ||
    extra !== undefined ||
    !/^[\da-f]{32}$/i.test(saltHex || '') ||
    !/^[\da-f]{128}$/i.test(keyHex || '')
  ) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const expectedKey = Buffer.from(keyHex, 'hex');
  const actualKey = await scrypt(password, salt, expectedKey.length);
  return crypto.timingSafeEqual(actualKey, expectedKey);
}
