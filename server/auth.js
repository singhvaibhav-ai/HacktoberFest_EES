// Team accounts: sign up, log in, log out, GitHub OAuth.
// Sessions live in memory, so everyone has to log in again after the server restarts.
import crypto from 'node:crypto';
import { addUser, findUser } from './db.js';

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
    res.clearCookie(COOKIE);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    res.json(req.user);
  });

  // Start GitHub OAuth flow
  app.get('/api/auth/github', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const next = req.query.next || '/';

    if (!clientId || !clientSecret) {
      return res.redirect(
        `${clientOrigin}/login?error=${encodeURIComponent(
          'GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env'
        )}`
      );
    }

    const state = crypto.randomBytes(16).toString('hex');
    res.cookie('github_oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });
    res.cookie('github_oauth_next', String(next), { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });

    const params = new URLSearchParams({
      client_id: clientId,
      state,
      scope: 'read:user',
    });
    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  });

  // GitHub OAuth callback
  app.get('/api/auth/github/callback', async (req, res) => {
    const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const { code, state, error, error_description } = req.query;

    if (error) {
      return res.redirect(
        `${clientOrigin}/login?error=${encodeURIComponent(error_description || error || 'GitHub authorization was denied')}`
      );
    }

    const storedState = readCookie(req, 'github_oauth_state');
    const returnTo = readCookie(req, 'github_oauth_next') || '/';
    res.clearCookie('github_oauth_state');
    res.clearCookie('github_oauth_next');

    // State check to stop CSRF
    if (!state || !storedState || state !== storedState) {
      return res.redirect(
        `${clientOrigin}/login?error=${encodeURIComponent('Invalid OAuth state. Potential CSRF attack.')}`
      );
    }

    if (!code) {
      return res.redirect(
        `${clientOrigin}/login?error=${encodeURIComponent('No authorization code received from GitHub')}`
      );
    }

    try {
      // Swap code for access token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
        return res.redirect(
          `${clientOrigin}/login?error=${encodeURIComponent(
            tokenData.error_description || tokenData.error || 'Failed to exchange GitHub authorization code'
          )}`
        );
      }

      // Fetch user profile from GitHub API
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'CodeArena-OAuth',
          'Accept': 'application/json',
        },
      });

      if (!userRes.ok) {
        return res.redirect(
          `${clientOrigin}/login?error=${encodeURIComponent('Failed to fetch user profile from GitHub')}`
        );
      }

      const userData = await userRes.json();
      const githubUsername = userData.login;
      if (!githubUsername) {
        return res.redirect(
          `${clientOrigin}/login?error=${encodeURIComponent('GitHub account does not have a username')}`
        );
      }

      // Find or create account
      let user = findUser(githubUsername);
      if (!user) {
        user = addUser({
          username: githubUsername,
          password: '',
          githubId: userData.id,
        });
      }

      // Start session cookie
      startSession(res, user.username);

      const target = returnTo.startsWith('/') ? returnTo : '/';
      res.redirect(`${clientOrigin}${target}`);
    } catch (err) {
      res.redirect(
        `${clientOrigin}/login?error=${encodeURIComponent(`GitHub login failed: ${err.message}`)}`
      );
    }
  });
}
