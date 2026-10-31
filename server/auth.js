// Team accounts: sign up, log in, log out.
// Sessions live in memory, so everyone has to log in again after the server restarts.
import crypto from 'node:crypto';
import { addUser, findUser } from './db.js';

const COOKIE = 'codearena_session';
const OAUTH_STATE_COOKIE = 'codearena_github_state';
const sessions = new Map(); // token -> username

function githubConfig() {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/api/auth/github/callback';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  return GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET
    ? { clientId: GITHUB_CLIENT_ID, clientSecret: GITHUB_CLIENT_SECRET, callbackUrl, clientUrl }
    : null;
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

function clearOAuthStateCookie(res) {
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/api/auth/github/callback' });
}

function equalState(expected, actual) {
  if (typeof expected !== 'string' || typeof actual !== 'string') return false;
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length && crypto.timingSafeEqual(expectedBytes, actualBytes);
}

function redirectWithOAuthError(res, clientUrl, reason) {
  const destination = new URL('/login', clientUrl);
  destination.searchParams.set('error', reason);
  res.redirect(destination.toString());
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
  app.get('/api/auth/github', (req, res) => {
    const config = githubConfig();
    if (!config) {
      return res.status(503).json({ error: 'GitHub sign-in is not configured on this server' });
    }

    const state = crypto.randomBytes(32).toString('hex');
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,
      path: '/api/auth/github/callback',
    });

    const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', config.clientId);
    authorizeUrl.searchParams.set('redirect_uri', config.callbackUrl);
    authorizeUrl.searchParams.set('state', state);
    res.redirect(authorizeUrl.toString());
  });

  app.get('/api/auth/github/callback', async (req, res) => {
    const config = githubConfig();
    const stateCookie = readCookie(req, OAUTH_STATE_COOKIE);
    clearOAuthStateCookie(res);

    if (!config) {
      return res.status(503).json({ error: 'GitHub sign-in is not configured on this server' });
    }
    if (!equalState(stateCookie, req.query.state)) {
      return redirectWithOAuthError(res, config.clientUrl, 'github_state');
    }
    if (req.query.error) {
      return redirectWithOAuthError(res, config.clientUrl, 'github_cancelled');
    }
    if (typeof req.query.code !== 'string') {
      return redirectWithOAuthError(res, config.clientUrl, 'github_failed');
    }

    try {
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code: req.query.code,
          redirect_uri: config.callbackUrl,
        }),
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.access_token) {
        throw new Error('GitHub did not return an access token');
      }

      const profileResponse = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${tokenData.access_token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      const profile = await profileResponse.json();
      if (!profileResponse.ok || typeof profile.login !== 'string' || !profile.login.trim()) {
        throw new Error('GitHub did not return a username');
      }

      const username = profile.login.trim();
      if (!findUser(username)) addUser({ username, password: null });
      startSession(res, username);
      return res.redirect(config.clientUrl);
    } catch {
      return redirectWithOAuthError(res, config.clientUrl, 'github_failed');
    }
  });

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
    if (typeof user.password !== 'string' || user.password !== password) {
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
