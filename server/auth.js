// Team accounts: sign up, log in, log out.
// Sessions live in memory, so everyone has to log in again after the server restarts.
import crypto from 'node:crypto';
import { addUser, findUser } from './db.js';

const COOKIE = 'codearena_session';
const sessions = new Map(); // token -> username

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password, storedHash) {
  return new Promise((resolve) => {
    if (!storedHash || !storedHash.includes(':')) return resolve(false);
    const [salt, keyHex] = storedHash.split(':');
    const keyBuffer = Buffer.from(keyHex, 'hex');
    crypto.scrypt(password, salt, keyBuffer.length, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
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
    try {
      const passwordHash = await hashPassword(password);
      addUser({ username, password: passwordHash });
      startSession(res, username);
      res.status(201).json({ username });
    } catch {
      res.status(500).json({ error: 'Failed to process signup' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const user = findUser(username);
    if (!user) {
      return res.status(401).json({ error: 'No team with that name' });
    }
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
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
