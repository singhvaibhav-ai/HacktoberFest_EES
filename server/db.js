// A tiny JSON-file "database". Good enough for one day of hacking,
// and it means nobody has to install a real database.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export function isHashedPassword(str) {
  if (typeof str !== 'string') return false;
  const parts = str.split(':');
  if (parts.length === 2) {
    return /^[0-9a-f]{32}$/i.test(parts[0]) && /^[0-9a-f]{128}$/i.test(parts[1]);
  }
  if (parts.length === 3 && parts[0] === 'scrypt') {
    return /^[0-9a-f]{32}$/i.test(parts[1]) && /^[0-9a-f]{128}$/i.test(parts[2]);
  }
  return false;
}

export function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function load() {
  if (!fs.existsSync(DB_FILE)) return { users: [], submissions: [] };
  const db = { users: [], submissions: [], ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
  let migrated = false;
  for (const user of db.users) {
    if (user && user.password && !isHashedPassword(user.password)) {
      user.password = hashPasswordSync(user.password);
      migrated = true;
    }
  }
  if (migrated) {
    save(db);
  }
  return db;
}

function save(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
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

export function addUser({ username, password }) {
  const db = load();
  const storedPassword = isHashedPassword(password)
    ? password
    : hashPasswordSync(String(password || ''));
  const user = { id: db.users.length + 1, createdAt: new Date().toISOString(), username, password: storedPassword };
  db.users.push(user);
  save(db);
  return user;
}

export function findUser(username) {
  return load().users.find((u) => u.username === username);
}
