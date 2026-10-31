process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
process.env.GITHUB_CALLBACK_URL = 'http://localhost:4000/api/auth/github/callback';
process.env.FRONTEND_URL = 'http://localhost:5173';

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { authRoutes, oauthStates, createOrFindGitHubTeam, currentUser } from './auth.js';
import { findUser, findUserByGithubId } from './db.js';

describe('GitHub OAuth Authentication Tests (Issue #35)', () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use(currentUser);
    authRoutes(app);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    oauthStates.clear();
  });

  it('GET /api/auth/github redirects to GitHub OAuth authorize URL with state and sets cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/github`, {
      redirect: 'manual',
    });

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location.startsWith('https://github.com/login/oauth/authorize'));

    const url = new URL(location);
    assert.equal(url.searchParams.get('client_id'), 'test-client-id');
    assert.equal(url.searchParams.get('redirect_uri'), 'http://localhost:4000/api/auth/github/callback');
    assert.equal(url.searchParams.get('scope'), 'read:user user:email');
    const state = url.searchParams.get('state');
    assert.ok(state, 'state query param must be present');
    assert.ok(oauthStates.has(state), 'server-side oauthStates must record the state');

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie.includes('codearena_oauth_state='), 'Must set codearena_oauth_state cookie');
  });

  it('GET /api/auth/github/callback rejects missing or mismatched state with 403', async () => {
    // Missing state
    const res1 = await fetch(`${baseUrl}/api/auth/github/callback?code=somecode`);
    assert.equal(res1.status, 403);
    const text1 = await res1.text();
    assert.equal(text1, 'Invalid or missing OAuth state parameter');

    // Mismatched state
    const res2 = await fetch(`${baseUrl}/api/auth/github/callback?code=somecode&state=forged-state`, {
      headers: {
        Cookie: 'codearena_oauth_state=real-state',
      },
    });
    assert.equal(res2.status, 403);
    const text2 = await res2.text();
    assert.equal(text2, 'Invalid or missing OAuth state parameter');
  });

  it('GET /api/auth/github/callback rejects missing authorization code with 400', async () => {
    const validState = 'test-valid-state-123';
    oauthStates.set(validState, Date.now() + 60000);

    const res = await fetch(`${baseUrl}/api/auth/github/callback?state=${validState}`, {
      headers: {
        Cookie: `codearena_oauth_state=${validState}`,
      },
    });

    assert.equal(res.status, 400);
    const text = await res.text();
    assert.equal(text, 'Missing authorization code');
  });

  it('createOrFindGitHubTeam creates a new team linked to GitHub profile', async () => {
    const githubProfile = {
      id: 987654,
      login: 'GitHubHacker',
      email: 'hacker@example.com',
    };

    const teamName = await createOrFindGitHubTeam(githubProfile);
    assert.equal(teamName, 'GitHubHacker');

    const user = findUserByGithubId(987654);
    assert.ok(user, 'User must exist in db with githubId');
    assert.equal(user.username, 'GitHubHacker');
    assert.equal(user.email, 'hacker@example.com');
    assert.equal(user.authProvider, 'github');
  });

  it('existing password signup and login still works independently', async () => {
    const username = `ClassicTeam_${Date.now()}`;
    const password = 'classicpassword';

    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    assert.equal(signupRes.status, 201);

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    assert.equal(loginRes.status, 200);
    const body = await loginRes.json();
    assert.equal(body.username, username);
  });
});
