import express from 'express';
import cors from 'cors';
import { listProblems, getProblem } from './problems.js';
import { addSubmission, listSubmissions } from './db.js';
import { authRoutes, currentUser, requireLogin } from './auth.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(currentUser);

app.get('/api/health', (req, res) => res.json({ ok: true }));

authRoutes(app);

app.get('/api/problems', (req, res) => {
  res.json(listProblems());
});

app.get('/api/problems/:slug', (req, res) => {
  const problem = getProblem(req.params.slug);
  if (!problem) return res.status(404).json({ error: 'Problem not found' });
  res.json(problem);
});

// Derive identity ONLY from the server-side session
export function requireAuth(req, res, next) {
  const team =
    req.user?.username ||
    req.user?.team ||
    req.session?.team ||
    req.session?.teamName ||
    req.session?.username ||
    req.session?.user?.team ||
    req.session?.user?.username;

  if (!team) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.authenticatedTeam = String(team);
  next();
}

// Forbid sending identity fields from the client at all
export function rejectIdentityFields(req, res, next) {
  const forbidden = ['username', 'team', 'teamName', 'userId', 'author', 'submitter'];
  const present = forbidden.filter((k) =>
    Object.prototype.hasOwnProperty.call(req.body || {}, k)
  );
  if (present.length) {
    return res.status(400).json({
      error: 'Identity fields must not be supplied by the client',
      fields: present,
    });
  }
  next();
}

// The browser runs the code and works out the verdict, then reports it here.
// You must be logged in to submit. Identity is derived exclusively from the session.
app.post('/api/submissions', requireAuth, rejectIdentityFields, (req, res) => {
  const { slug, language, code, verdict, passed, total } = req.body || {};
  if (!slug || !verdict) {
    return res.status(400).json({ error: 'slug and verdict are required' });
  }
  const row = addSubmission({
    username: req.authenticatedTeam,
    slug,
    language,
    code,
    verdict,
    passed,
    total,
  });
  res.status(201).json(row);
});

app.get('/api/submissions', (req, res) => {
  const { slug, username } = req.query;
  res.json(listSubmissions({ slug, username }));
});

app.get('/api/leaderboard', (req, res) => {
  const scores = {};
  for (const s of listSubmissions()) {
    if (s.verdict !== 'AC') continue;
    scores[s.username] = (scores[s.username] || 0) + 1;
  }
  const board = Object.entries(scores)
    .map(([username, solved]) => ({ username, solved }))
    .sort((a, b) => b.solved - a.solved);
  res.json(board);
});

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`CodeArena API running on http://localhost:${PORT}`);
  });
}

export { app };

