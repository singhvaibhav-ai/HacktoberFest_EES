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

// The browser runs the code and works out the verdict, then reports it here.
// You must be logged in to submit.
app.post('/api/submissions', requireLogin, (req, res) => {
  const { slug, language, code, verdict, passed, total } = req.body;
  const username = req.body.username || req.user.username;
  if (!slug || !verdict) {
    return res.status(400).json({ error: 'slug and verdict are required' });
  }
  const row = addSubmission({ username, slug, language, code, verdict, passed, total });
  res.status(201).json(row);
});

app.get('/api/submissions', (req, res) => {
  const { slug, username } = req.query;
  res.json(listSubmissions({ slug, username }));
});

app.get('/api/leaderboard', (req, res) => {
  const solvedByTeam = new Map();
  for (const s of listSubmissions()) {
    if (s.verdict !== 'AC' || !s.username || !s.slug) continue;
    if (!solvedByTeam.has(s.username)) solvedByTeam.set(s.username, new Set());
    solvedByTeam.get(s.username).add(s.slug);
  }
  const board = Array.from(solvedByTeam.entries())
    .map(([username, slugs]) => ({ username, solved: slugs.size }))
    .sort((a, b) => b.solved - a.solved);
  res.json(board);
});

app.listen(PORT, () => {
  console.log(`CodeArena API running on http://localhost:${PORT}`);
});
