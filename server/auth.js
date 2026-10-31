// Team accounts: sign up, log in, log out.
// Sessions live in memory, so everyone has to log in again after the server restarts.
import crypto from 'node:crypto';
import { addUser, findUser } from './db.js';

const COOKIE = 'codearena_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const sessions = new Map(); // token -> { username, expiresAt }
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;
const failedLogins = new Map(); // key -> timestamps of recent failures

function loginKey(type, value) {
  return `${type}:${value}`;
}

function recentFailures(key, now = Date.now()) {
  const failures = failedLogins.get(key) || [];
  const recent = failures.filter((timestamp) => now - timestamp < LOGIN_WINDOW_MS);
  if (recent.length) failedLogins.set(key, recent);
  else failedLogins.delete(key);
  return recent;
}

function loginKeys(req, username) {
  return [loginKey('team', username), loginKey('ip', req.ip)];
}

function isLoginLimited(keys) {
  return keys.some((key) => recentFailures(key).length >= MAX_FAILED_LOGINS);
}

function recordFailedLogin(keys) {
  const now = Date.now();
  for (const key of keys) {
    const failures = recentFailures(key, now);
    failedLogins.set(key, [...failures, now]);
  }
}

function clearFailedLogins(keys) {
  for (const key of keys) failedLogins.delete(key);
}

function rejectLimitedLogin(res, keys) {
  const retryAt = Math.min(...keys.map((key) => {
    const failures = recentFailures(key);
    return failures.length >= MAX_FAILED_LOGINS ? failures[0] + LOGIN_WINDOW_MS : Infinity;
  }));
  const retryAfter = Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));
  res.set('Retry-After', String(retryAfter));
  return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
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
  sessions.set(token, { username, expiresAt: Date.now() + SESSION_TTL_MS });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', maxAge: SESSION_TTL_MS });
}

// Puts the logged-in team (if any) on req.user.
export function currentUser(req, res, next) {
  const token = readCookie(req, COOKIE);
  const session = token && sessions.get(token);
  if (session && session.expiresAt <= Date.now()) {
    sessions.delete(token);
    req.user = null;
  } else {
    req.user = session ? { username: session.username } : null;
  }
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
    if (isLoginLimited(keys)) return rejectLimitedLogin(res, keys);

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
    const token = readCookie(req, COOKIE);
    if (token) sessions.delete(token);
    res.clearCookie(COOKIE);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    res.json(req.user);
  });
}
