// Team accounts: sign up, log in, log out.
// Sessions live in memory, so everyone has to log in again after the server restarts.
import crypto from 'node:crypto';
import { addUser, findUser, findUserByGithubId } from './db.js';

const COOKIE = 'codearena_session';
const OAUTH_COOKIE = 'codearena_oauth_state';
const sessions = new Map(); // token -> username

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

// Server-side CSRF OAuth state map (state -> expiry)
export const oauthStates = new Map();

function requiredEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return process.env[name];
}

export async function fetchGitHubProfile(accessToken) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'HacktoberFest-EES',
  };

  const userRes = await fetch(GITHUB_USER_URL, { headers });
  if (!userRes.ok) {
    throw new Error(`GitHub user lookup failed: ${userRes.status}`);
  }
  const profile = await userRes.json();

  let email = profile.email;
  if (!email) {
    const emailsRes = await fetch(GITHUB_EMAILS_URL, { headers });
    if (emailsRes.ok) {
      const emails = await emailsRes.json();
      const verifiedPrimary = emails.find((e) => e.primary && e.verified);
      const verified = verifiedPrimary || emails.find((e) => e.verified);
      email = verified?.email || null;
    }
  }

  return {
    login: profile.login,
    id: profile.id,
    email,
  };
}

export async function createOrFindGitHubTeam(profile) {
  // 1. Look up existing team by githubId
  let user = findUserByGithubId(profile.id);
  if (user) return user.username;

  // 2. Look up existing team by username
  user = findUser(profile.login);
  if (user) return user.username;

  // 3. Create a new team account linked to GitHub profile
  user = addUser({
    username: profile.login,
    githubId: profile.id,
    email: profile.email,
    authProvider: 'github',
  });
  return user.username;
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function startSession(res, username) {
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
    const token = readCookie(req, COOKIE);
    if (token) sessions.delete(token);
    res.clearCookie(COOKIE);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    res.json(req.user);
  });

  // 1) Start GitHub OAuth flow
  app.get('/api/auth/github', (req, res) => {
    try {
      requiredEnv('GITHUB_CLIENT_ID');
      requiredEnv('GITHUB_CALLBACK_URL');
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }

    // CSRF protection: store a random, unpredictable server-side state
    const state = crypto.randomBytes(24).toString('hex');
    oauthStates.set(state, Date.now() + 10 * 60 * 1000);
    res.cookie(OAUTH_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });

    const query = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: process.env.GITHUB_CALLBACK_URL,
      scope: 'read:user user:email',
      state,
      allow_signup: 'true',
    });

    return res.redirect(`${GITHUB_AUTH_URL}?${query.toString()}`);
  });

  // 2) GitHub callback
  app.get('/api/auth/github/callback', async (req, res) => {
    const { code, state } = req.query;
    const cookieState = readCookie(req, OAUTH_COOKIE);
    const isValidState =
      state &&
      typeof state === 'string' &&
      ((cookieState && state === cookieState) || (oauthStates.has(state) && oauthStates.get(state) > Date.now()));

    // OAuth state check stops CSRF
    if (!isValidState) {
      return res.status(403).send('Invalid or missing OAuth state parameter');
    }

    // Clear state
    if (state) oauthStates.delete(state);
    res.clearCookie(OAUTH_COOKIE);

    if (!code || typeof code !== 'string') {
      return res.status(400).send('Missing authorization code');
    }

    try {
      requiredEnv('GITHUB_CLIENT_ID');
      requiredEnv('GITHUB_CLIENT_SECRET');
      requiredEnv('GITHUB_CALLBACK_URL');
    } catch (err) {
      return res.status(500).send(err.message);
    }

    try {
      // Exchange code for token — client secret stays on the server
      const tokenRes = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: process.env.GITHUB_CALLBACK_URL,
          state,
        }).toString(),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.access_token || tokenData.error) {
        return res.status(401).send(
          `GitHub token exchange failed: ${tokenData.error_description || tokenData.error || 'unknown error'}`
        );
      }

      const profile = await fetchGitHubProfile(tokenData.access_token);
      const teamName = await createOrFindGitHubTeam(profile);

      if (!teamName) {
        throw new Error('Failed to create or find GitHub account');
      }

      startSession(res, teamName);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(frontendUrl);
    } catch (err) {
      console.error('GitHub OAuth callback failed:', err);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}?auth_error=github`);
    }
  });
}
