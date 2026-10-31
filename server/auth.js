// Team accounts: sign up, log in, log out.
// Sessions live in memory, so everyone has to log in again after the server restarts.
import crypto from 'node:crypto';
import { addUser, findUser } from './db.js';

const COOKIE = 'codearena_session';
const sessions = new Map(); // token -> username

// Rate limiting for login attempts (in-memory)
// Limit: 5 failed logins for the same team name or IP within 10 minutes
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const failedAttempts = new Map(); // key -> [timestamps]

export function getClientIp(req) {
  let ip = '';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    ip = String(forwarded).split(',')[0].trim();
  }
  if (!ip) {
    ip = req.ip || req.socket?.remoteAddress || '';
  }
  return ip.replace(/^::ffff:/, '');
}

function getActiveFailures(key, now) {
  const timestamps = failedAttempts.get(key);
  if (!timestamps) return [];
  const active = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (active.length === 0) {
    failedAttempts.delete(key);
  } else if (active.length !== timestamps.length) {
    failedAttempts.set(key, active);
  }
  return active;
}

export function recordFailedLogin(req) {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const ip = getClientIp(req);
  const now = Date.now();

  if (username) {
    const list = getActiveFailures(`user:${username}`, now);
    list.push(now);
    failedAttempts.set(`user:${username}`, list);
  }
  if (ip) {
    const list = getActiveFailures(`ip:${ip}`, now);
    list.push(now);
    failedAttempts.set(`ip:${ip}`, list);
  }
}

export function resetFailedLogin(req) {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const ip = getClientIp(req);
  if (username) failedAttempts.delete(`user:${username}`);
  if (ip) failedAttempts.delete(`ip:${ip}`);
}

export function limitLoginAttempts(req, res, next) {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const ip = getClientIp(req);
  const now = Date.now();

  let maxWaitSeconds = 0;
  for (const key of [username ? `user:${username}` : null, ip ? `ip:${ip}` : null]) {
    if (!key) continue;
    const failures = getActiveFailures(key, now);
    if (failures.length >= MAX_FAILED_ATTEMPTS) {
      const earliest = failures[failures.length - MAX_FAILED_ATTEMPTS];
      const waitMs = earliest + RATE_LIMIT_WINDOW_MS - now;
      const waitSec = Math.max(1, Math.ceil(waitMs / 1000));
      if (waitSec > maxWaitSeconds) {
        maxWaitSeconds = waitSec;
      }
    }
  }

  if (maxWaitSeconds > 0) {
    const minutes = Math.max(1, Math.ceil(maxWaitSeconds / 60));
    res.set('Retry-After', String(maxWaitSeconds));
    return res.status(429).json({
      error: `Too many attempts, try again in ${minutes} minute${minutes === 1 ? '' : 's'}`,
    });
  }

  next();
}

// For testing
export function _clearFailedAttempts() {
  failedAttempts.clear();
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

  app.post('/api/auth/login', limitLoginAttempts, (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!username || !password) {
      return res.status(400).json({ error: 'Team name and password are required' });
    }
    const user = findUser(username);
    if (!user) {
      recordFailedLogin(req);
      return res.status(401).json({ error: 'No team with that name' });
    }
    if (user.password !== password) {
      recordFailedLogin(req);
      return res.status(401).json({ error: 'Wrong password' });
    }
    resetFailedLogin(req);
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
