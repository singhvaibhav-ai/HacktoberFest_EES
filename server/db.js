// A tiny JSON-file "database". Good enough for one day of hacking,
// and it means nobody has to install a real database.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function load() {
  if (!fs.existsSync(DB_FILE)) return { users: [], submissions: [] };
  return { users: [], submissions: [], ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
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
  return load()
    .submissions.filter(
      (s) => (!slug || s.slug === slug) && (!username || s.username === username)
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b.id - a.id);
}

export function addUser({ username, password }) {
  const db = load();
  const user = { id: db.users.length + 1, createdAt: new Date().toISOString(), username, password };
  db.users.push(user);
  save(db);
  return user;
}

export function findUser(username) {
  return load().users.find((u) => u.username === username);
}
