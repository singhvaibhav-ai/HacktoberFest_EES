// Team accounts: sign up, log in, log out.
// Sessions live in memory, so everyone has to log in again after the server restarts.
import crypto from 'node:crypto';
import util from 'node:util';
import { addUser, findUser } from './db.js';

const scrypt = util.promisify(crypto.scrypt);

const COOKIE = 'codearena_session';
const sessions = new Map(); // token -> username

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password, storedPassword) {
  try {
    if (!storedPassword || typeof storedPassword !== 'string') return false;
    const parts = storedPassword.split(':');
    let salt;
    let hashHex;
    if (parts.length === 2) {
      [salt, hashHex] = parts;
    } else if (parts.length === 3 && parts[0] === 'scrypt') {
      [, salt, hashHex] = parts;
    } else {
      return false;
    }

    const expectedKey = Buffer.from(hashHex, 'hex');
    if (expectedKey.length === 0) return false;

    const actualKey = await scrypt(password, salt, expectedKey.length);
    if (expectedKey.length !== actualKey.length) return false;

    return crypto.timingSafeEqual(expectedKey, actualKey);
  } catch {
    return false;
  }
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function startSession(res, username) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, username);
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 });
}

// Puts the logged-in team (if any) on req.user.
export function currentUser(req, res, next) {
  const token = readCookie(req, COOKIE);
  const username = token && sessions.get(token);
  req.user = username ? { username } : null;
  next();
}

export function requireLogin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please log in to submit' });
  next();
}

export function authRoutes(app) {
  app.post('/api/auth/signup', async (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!username || !password) {
      return res.status(400).json({ error: 'Team name and password are required' });
    }
    if (findUser(username)) {
      return res.status(409).json({ error: 'That team name is taken' });
    }
    const hashedPassword = await hashPassword(password);
    addUser({ username, password: hashedPassword });
    startSession(res, username);
    res.status(201).json({ username });
  });

  app.post('/api/auth/login', async (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const user = findUser(username);
    if (!user) {
      return res.status(401).json({ error: 'No team with that name' });
    }
    const match = await verifyPassword(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Wrong password' });
    }
    startSession(res, user.username);
    res.json({ username: user.username });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie(COOKIE);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    res.json(req.user);
  });
}
