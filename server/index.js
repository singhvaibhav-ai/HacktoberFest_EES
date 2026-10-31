import express from 'express';
import cors from 'cors';
import { listProblems, getProblem } from './problems.js';
import { addSubmission, listSubmissions } from './db.js';
import { authRoutes, currentUser, requireLogin } from './auth.js';
import { getContestState } from './contest.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(currentUser);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/contest', (req, res) => {
  res.json(getContestState());
});

authRoutes(app);

app.get('/api/problems', (req, res) => {
  const contest = getContestState();
  if (contest.enabled && contest.status === 'upcoming') {
    return res.status(403).json({ error: 'Contest has not started yet', start: contest.start });
  }
  res.json(listProblems());
});

app.get('/api/problems/:slug', (req, res) => {
  const contest = getContestState();
  if (contest.enabled && contest.status === 'upcoming') {
    return res.status(403).json({ error: 'Contest has not started yet', start: contest.start });
  }
  const problem = getProblem(req.params.slug);
  if (!problem) return res.status(404).json({ error: 'Problem not found' });
  res.json(problem);
});

// The browser runs the code and works out the verdict, then reports it here.
// You must be logged in to submit.
app.post('/api/submissions', requireLogin, (req, res) => {
  const contest = getContestState();
  if (contest.enabled && contest.status === 'upcoming') {
    return res.status(403).json({ error: 'Contest has not started yet' });
  }
  if (contest.enabled && contest.status === 'ended') {
    return res.status(403).json({ error: 'Contest has ended. Submissions are closed.' });
  }

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
  const contest = getContestState();
  const isFrozen = contest.enabled && contest.isFrozen;
  const cutoffTime = isFrozen ? new Date(contest.freezeAt).getTime() : Infinity;

  const scores = {};
  for (const s of listSubmissions()) {
    if (s.verdict !== 'AC') continue;
    const subTime = new Date(s.createdAt).getTime();
    if (subTime > cutoffTime) continue;
    scores[s.username] = (scores[s.username] || 0) + 1;
  }
  const board = Object.entries(scores)
    .map(([username, solved]) => ({ username, solved }))
    .sort((a, b) => b.solved - a.solved);

  res.json({
    frozen: isFrozen,
    freezeAt: contest.enabled ? contest.freezeAt : null,
    board,
  });
});

app.listen(PORT, () => {
  console.log(`CodeArena API running on http://localhost:${PORT}`);
});
