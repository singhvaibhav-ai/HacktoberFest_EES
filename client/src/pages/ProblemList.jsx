import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function ProblemList() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [solvedSlugs, setSolvedSlugs] = useState(new Set());
  const [error, setError] = useState('');

  // Filter states
  const [difficulty, setDifficulty] = useState('All');
  const [selectedTag, setSelectedTag] = useState('All');
  const [search, setSearch] = useState('');
  const [hideSolved, setHideSolved] = useState(false);

  useEffect(() => {
    api.problems()
      .then(setProblems)
      .catch(() => setError('Could not reach the server. Is it running?'));
  }, []);

  useEffect(() => {
    if (!user?.username) {
      setSolvedSlugs(new Set());
      return;
    }
    api.userSubmissions(user.username)
      .then((submissions) => {
        const solved = new Set(
          submissions.filter((s) => s.verdict === 'AC').map((s) => s.slug)
        );
        setSolvedSlugs(solved);
      })
      .catch((err) => {
        console.error('Failed to load user submissions', err);
      });
  }, [user?.username]);

  // Dynamically compute unique tags from available problems
  const allTags = useMemo(() => {
    const tagSet = new Set();
    for (const p of problems) {
      if (Array.isArray(p.tags)) {
        for (const t of p.tags) {
          tagSet.add(t);
        }
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [problems]);

  // Derived filtered problems array (purely computed, never mutating original problems)
  const filteredProblems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return problems.filter((p) => {
      if (difficulty !== 'All' && p.difficulty !== difficulty) {
        return false;
      }
      if (selectedTag !== 'All' && (!Array.isArray(p.tags) || !p.tags.includes(selectedTag))) {
        return false;
      }
      if (normalizedSearch && !p.title.toLowerCase().includes(normalizedSearch)) {
        return false;
      }
      if (hideSolved && user && solvedSlugs.has(p.slug)) {
        return false;
      }
      return true;
    });
  }, [problems, difficulty, selectedTag, search, hideSolved, user, solvedSlugs]);

  return (
    <section>
      <h1>Problems</h1>
      {error && <p className="error">{error}</p>}

      <div className="filters">
        <input
          type="text"
          className="filter-search"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search problems by title"
        />

        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          aria-label="Filter by difficulty"
        >
          <option value="All">All difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>

        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          aria-label="Filter by tag"
        >
          <option value="All">All tags</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>

        <label
          className={`checkbox-label ${!user ? 'disabled' : ''}`}
          title={!user ? 'Log in to filter solved problems' : undefined}
        >
          <input
            type="checkbox"
            checked={Boolean(user && hideSolved)}
            onChange={(e) => setHideSolved(e.target.checked)}
            disabled={!user}
            aria-label="Hide solved problems"
          />
          Hide solved
          {!user && <span className="muted login-hint">(login required)</span>}
        </label>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Difficulty</th>
            <th>Tags</th>
          </tr>
        </thead>
        <tbody>
          {filteredProblems.length === 0 ? (
            <tr>
              <td colSpan={4} className="empty-message">
                No problems match the selected filters.
              </td>
            </tr>
          ) : (
            filteredProblems.map((p, i) => (
              <tr key={p.slug}>
                <td>{i + 1}</td>
                <td>
                  <Link to={`/problems/${p.slug}`}>{p.title}</Link>
                </td>
                <td>{p.difficulty}</td>
                <td>{p.tags?.join(', ')}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
