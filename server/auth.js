// Team B124-B125 (Leader: Sashank, Members: Harshek, Pratham) - Wrong password rate limiter
import crypto from 'node:crypto';
import { addUser, findUser } from './db.js';

const COOKIE = 'codearena_session';
const sessions = new Map(); // token -> username
const loginAttempts = new Map(); // key (username or IP) -> { count, lockoutUntil }

const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(key, res) {
  const record = loginAttempts.get(key);
  if (!record) return false;

  const now = Date.now();
  if (record.lockoutUntil && now < record.lockoutUntil) {
    const retrySecs = Math.ceil((record.lockoutUntil - now) / 1000);
    const retryMins = Math.ceil(retrySecs / 60);
    res.setHeader('Retry-After', String(retrySecs));
    res.status(429).json({ 
      error: \Too many attempts, try again in \ minute\.\,
      retryAfter: retrySecs 
    });
    return true;
  }

  // Window expired, reset
  if (now - record.firstAttemptTime > LOCKOUT_WINDOW_MS) {
    loginAttempts.delete(key);
  }
  return false;
}

function recordFailedAttempt(key) {
  const now = Date.now();
  let record = loginAttempts.get(key);

  if (!record || (now - record.firstAttemptTime > LOCKOUT_WINDOW_MS)) {
    record = { count: 1, firstAttemptTime: now, lockoutUntil: null };
  } else {
    record.count++;
  }

  if (record.count >= MAX_ATTEMPTS) {
    record.lockoutUntil = now + LOCKOUT_WINDOW_MS;
  }
  loginAttempts.set(key, record);
}

function clearRateLimit(key) {
  loginAttempts.delete(key);
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
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    // Check rate limit for both username and IP address
    if (checkRateLimit(username, res) || checkRateLimit(ip, res)) {
      return;
    }

    const user = findUser(username);
    if (!user) {
      recordFailedAttempt(username);
      recordFailedAttempt(ip);
      return res.status(401).json({ error: 'No team with that name' });
    }
    if (user.password !== password) {
      recordFailedAttempt(username);
      recordFailedAttempt(ip);
      return res.status(401).json({ error: 'Wrong password' });
    }

    // Successful login clears rate limit counters
    clearRateLimit(username);
    clearRateLimit(ip);

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
