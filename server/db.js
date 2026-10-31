// A tiny JSON-file "database". Good enough for one day of hacking,
// and it means nobody has to install a real database.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const scrypt = promisify(crypto.scrypt);

function load() {
  if (!fs.existsSync(DB_FILE)) return { users: [], submissions: [] };
  return { users: [], submissions: [], ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
}

function save(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return { passwordSalt: salt.toString('hex'), passwordHash: hash.toString('hex') };
}

export async function verifyPassword(password, user) {
  const salt = Buffer.from(user.passwordSalt || '', 'hex');
  const expectedHash = Buffer.from(user.passwordHash || '', 'hex');
  if (salt.length !== 16 || expectedHash.length !== 64) {
    throw new Error('Stored password hash is invalid');
  }

  const actualHash = await scrypt(password, salt, expectedHash.length);
  return crypto.timingSafeEqual(actualHash, expectedHash);
}

export async function migratePlaintextPasswords() {
  const db = load();
  let migrated = false;

  for (const user of db.users) {
    if (typeof user.password !== 'string') continue;
    Object.assign(user, await hashPassword(user.password));
    delete user.password;
    migrated = true;
  }

  if (migrated) save(db);
}

export function addSubmission(submission) {
  const db = load();
  const row = { id: db.submissions.length + 1, createdAt: new Date().toISOString(), ...submission };
  db.submissions.push(row);
  save(db);
  return row;
}

export function listSubmissions({ slug, username } = {}) {
  return load().submissions.filter(
    (s) => (!slug || s.slug === slug) && (!username || s.username === username)
  );
}

export function addUser({ username, passwordSalt, passwordHash }) {
  const db = load();
  const user = { id: db.users.length + 1, createdAt: new Date().toISOString(), username, passwordSalt, passwordHash };
  db.users.push(user);
  save(db);
  return user;
}

export function findUser(username) {
  return load().users.find((u) => u.username === username);
}
