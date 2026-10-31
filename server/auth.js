// Team accounts: sign up, log in, log out.
// Sessions live in memory, so everyone has to log in again after the server restarts.
import crypto from 'node:crypto';
import { addUser, findUser } from './db.js';

const COOKIE = 'codearena_session';
const sessions = new Map(); // token -> username

// In-memory rate limiting for login attempts
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_FAILED_ATTEMPTS = 5;
const failedAttempts = new Map(); // key -> array of failure timestamps

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
    if (ip) return ip;
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function getRecentFailures(key, now) {
  const list = failedAttempts.get(key);
  if (!list) return [];
  const valid = list.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (valid.length === 0) {
    failedAttempts.delete(key);
    return [];
  }
  failedAttempts.set(key, valid);
  return valid;
}

export function recordLoginFailure(req, username) {
  const now = Date.now();
  const clientIp = getClientIp(req);
  const ipKey = `ip:${clientIp}`;
  const ipList = getRecentFailures(ipKey, now);
  ipList.push(now);
  failedAttempts.set(ipKey, ipList);

  const team = String(username || '').trim().toLowerCase();
  if (team) {
    const teamKey = `team:${team}`;
    const teamList = getRecentFailures(teamKey, now);
    teamList.push(now);
    failedAttempts.set(teamKey, teamList);
  }
}

export function resetLoginRateLimit(req, username) {
  const clientIp = getClientIp(req);
  failedAttempts.delete(`ip:${clientIp}`);

  const team = String(username || req?.body?.username || '').trim().toLowerCase();
  if (team) {
    failedAttempts.delete(`team:${team}`);
  }
}

export function _clearRateLimits() {
  failedAttempts.clear();
}

export function loginRateLimit(req, res, next) {
  const now = Date.now();
  const clientIp = getClientIp(req);
  const username = String(req.body?.username || '').trim().toLowerCase();

  const ipKey = `ip:${clientIp}`;
  const teamKey = username ? `team:${username}` : null;

  const ipFailures = getRecentFailures(ipKey, now);
  const teamFailures = teamKey ? getRecentFailures(teamKey, now) : [];

  const ipBlocked = ipFailures.length >= MAX_FAILED_ATTEMPTS;
  const teamBlocked = teamFailures.length >= MAX_FAILED_ATTEMPTS;

  if (ipBlocked || teamBlocked) {
    let retryMs = 0;
    if (ipBlocked && ipFailures.length >= MAX_FAILED_ATTEMPTS) {
      const oldestRelevant = ipFailures[ipFailures.length - MAX_FAILED_ATTEMPTS];
      retryMs = Math.max(retryMs, (oldestRelevant + RATE_LIMIT_WINDOW_MS) - now);
    }
    if (teamBlocked && teamFailures.length >= MAX_FAILED_ATTEMPTS) {
      const oldestRelevant = teamFailures[teamFailures.length - MAX_FAILED_ATTEMPTS];
      retryMs = Math.max(retryMs, (oldestRelevant + RATE_LIMIT_WINDOW_MS) - now);
    }

    const retryAfterSeconds = Math.max(1, Math.ceil(retryMs / 1000));
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));

    res.set('Retry-After', String(retryAfterSeconds));
    res.set('Access-Control-Expose-Headers', 'Retry-After');
    return res.status(429).json({
      error: `Too many attempts, try again in ${minutes} minute${minutes === 1 ? '' : 's'}`,
      retryAfter: retryAfterSeconds,
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
    const user = findUser(username);
    if (!user) {
      recordLoginFailure(req, username);
      return res.status(401).json({ error: 'No team with that name' });
    }
    if (user.password !== password) {
      recordLoginFailure(req, username);
      return res.status(401).json({ error: 'Wrong password' });
    }
    resetLoginRateLimit(req, user.username);
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
