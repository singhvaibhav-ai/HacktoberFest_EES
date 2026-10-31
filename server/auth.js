// Team accounts: sign up, log in, log out.
// Sessions live in memory, so everyone has to log in again after the server restarts.
import crypto from 'node:crypto';
import { addUser, findUser } from './db.js';

const COOKIE = 'codearena_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const sessions = new Map(); // token -> { username, expiresAt }

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

// Returns the session if it exists and has not expired on the server.
function findSession(token) {
  const session = token && sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

// Remove expired sessions every hour so the map does not grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
}, 60 * 60 * 1000).unref();

// Puts the logged-in team (if any) on req.user.
export function currentUser(req, res, next) {
  const session = findSession(readCookie(req, COOKIE));
  req.user = session ? { username: session.username } : null;
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
    const user = findUser(username);
    if (!user) {
      return res.status(401).json({ error: 'No team with that name' });
    }
    if (user.password !== password) {
      return res.status(401).json({ error: 'Wrong password' });
    }
    startSession(res, user.username);
    res.json({ username: user.username });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = readCookie(req, COOKIE);
    if (token) sessions.delete(token); // kill the session on the server
    res.clearCookie(COOKIE);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    res.json(req.user);
  });
}
