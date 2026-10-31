// Team accounts: sign up, log in, log out.
// Sessions live in memory, so everyone has to log in again after the server restarts.
import crypto from 'node:crypto';
import { addUser, findUser } from './db.js';

const COOKIE = 'codearena_session';
const sessions = new Map(); // token -> username

// Rate limiting configuration for login attempts:
// Max 5 failed attempts in 15 minutes, followed by a 15-minute lockout.
export const FAIL_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

// Map: key (`${ip}|${normalizedUsername}`) -> { failures, lockedUntil, resetAt }
export const loginAttempts = new Map();

export function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function getAttemptKey(req, username) {
  const ip = getClientIp(req);
  const team = String(username || '').toLowerCase().trim();
  return `${ip}|${team}`;
}

export function cleanupAttempt(key, now = Date.now()) {
  const record = loginAttempts.get(key);
  if (!record) return null;

  // If lockout expired
  if (record.lockedUntil && now >= record.lockedUntil) {
    loginAttempts.delete(key);
    return null;
  }

  // If attempt window expired without hitting lockout
  if (!record.lockedUntil && record.resetAt && now > record.resetAt) {
    loginAttempts.delete(key);
    return null;
  }

  return record;
}

export function recordLoginFailure(req, username, now = Date.now()) {
  const key = getAttemptKey(req, username);
  const existing = cleanupAttempt(key, now);
  const record = existing || { failures: 0, lockedUntil: null, resetAt: now + FAIL_WINDOW_MS };

  record.failures += 1;
  if (record.failures >= MAX_FAILURES) {
    record.lockedUntil = now + LOCKOUT_MS;
  }
  loginAttempts.set(key, record);
}

export function recordLoginSuccess(req, username) {
  const key = getAttemptKey(req, username);
  loginAttempts.delete(key);
}

export function loginRateLimit(req, res, next) {
  const now = Date.now();
  const username = String(req.body?.username || '').trim();
  const key = getAttemptKey(req, username);
  const record = cleanupAttempt(key, now);

  if (record && record.lockedUntil && now < record.lockedUntil) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: `Too many failed login attempts. Please try again in ${Math.ceil(retryAfter / 60)} minute(s).`,
    });
  }

  next();
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

  app.post('/api/auth/login', loginRateLimit, (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!username || !password) {
      return res.status(400).json({ error: 'Team name and password are required' });
    }
    const user = findUser(username);
    if (!user || user.password !== password) {
      recordLoginFailure(req, username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    recordLoginSuccess(req, user.username);
    startSession(res, user.username);
    res.json({ username: user.username });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = readCookie(req, COOKIE);
    if (token) sessions.delete(token);
    res.clearCookie(COOKIE);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    res.json(req.user);
  });
}
