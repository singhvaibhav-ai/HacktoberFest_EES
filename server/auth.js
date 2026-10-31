// Team accounts: sign up, log in, log out.
// Sessions live in memory, so everyone has to log in again after the server restarts.
import crypto from 'node:crypto';
import { addUser, findUser } from './db.js';

const COOKIE = 'codearena_session';
const sessions = new Map(); // token -> username
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;
const failedLogins = new Map(); // key -> timestamps of failed login attempts

function loginKeys(req, username) {
  return [`team:${username.toLowerCase()}`, `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`];
}

function pruneFailedLogins(now = Date.now()) {
  for (const [key, attempts] of failedLogins) {
    const recent = attempts.filter((time) => now - time < LOGIN_WINDOW_MS);
    if (recent.length) failedLogins.set(key, recent);
    else failedLogins.delete(key);
  }
}

function retryAfterSeconds(keys, now = Date.now()) {
  pruneFailedLogins(now);
  const latestBlockingAttempt = keys
    .map((key) => failedLogins.get(key) || [])
    .filter((attempts) => attempts.length >= MAX_FAILED_LOGINS)
    .map((attempts) => attempts[0])
    .reduce((latest, time) => Math.max(latest, time), 0);

  if (!latestBlockingAttempt) return 0;
  return Math.max(1, Math.ceil((latestBlockingAttempt + LOGIN_WINDOW_MS - now) / 1000));
}

function recordFailedLogin(keys, now = Date.now()) {
  pruneFailedLogins(now);
  for (const key of keys) {
    const attempts = failedLogins.get(key) || [];
    attempts.push(now);
    failedLogins.set(key, attempts);
  }
}

function clearFailedLogins(keys) {
  for (const key of keys) failedLogins.delete(key);
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
  app.post('/api/auth/signup', (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!username || !password) {
      return res.status(400).json({ error: 'Team name and password are required' });
    }
    if (findUser(username)) {
      return res.status(409).json({ error: 'That team name is taken' });
    }
    addUser({ username, password });
    startSession(res, username);
    res.status(201).json({ username });
  });

  app.post('/api/auth/login', (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const keys = loginKeys(req, username);
    const retryAfter = retryAfterSeconds(keys);
    if (retryAfter) {
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    }

    const user = findUser(username);
    if (!user) {
      recordFailedLogin(keys);
      return res.status(401).json({ error: 'No team with that name' });
    }
    if (user.password !== password) {
      recordFailedLogin(keys);
      return res.status(401).json({ error: 'Wrong password' });
    }
    clearFailedLogins(keys);
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
