// Team accounts: sign up, log in, log out.
// Sessions live in memory, so everyone has to log in again after the server restarts.
import crypto from 'node:crypto';
import { addUser, findUser, updateUser } from './db.js';

const COOKIE = 'codearena_session';
const sessions = new Map(); // token -> username

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

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored || '').split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected); // lengths are equal by construction
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
  app.post('/api/auth/signup', (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!username || !password) {
      return res.status(400).json({ error: 'Team name and password are required' });
    }
    if (findUser(username)) {
      return res.status(409).json({ error: 'That team name is taken' });
    }
    addUser({ username, passwordHash: hashPassword(password) });
    startSession(res, username);
    res.status(201).json({ username });
  });

  app.post('/api/auth/login', (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const user = findUser(username);
    if (!user) {
      return res.status(401).json({ error: 'No team with that name' });
    }

    // Legacy account migration: if the user has a plain-text password but no
    // passwordHash, verify the plain-text password once, then upgrade to a
    // hashed password and remove the plain-text field from db.json.
    if (!user.passwordHash && user.password) {
      if (user.password !== password) {
        return res.status(401).json({ error: 'Wrong password' });
      }
      const passwordHash = hashPassword(password);
      updateUser(username, { passwordHash, password: null });
      startSession(res, user.username);
      return res.json({ username: user.username });
    }

    // Normal login path: verify against the stored hash.
    if (!verifyPassword(password, user.passwordHash)) {
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
