import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function ProblemList() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [solvedSlugs, setSolvedSlugs] = useState(new Set());
  const [difficulty, setDifficulty] = useState('All');
  const [tag, setTag] = useState('All');
  const [search, setSearch] = useState('');
  const [hideSolved, setHideSolved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.problems().then(setProblems).catch(() => setError('Could not reach the server. Is it running?'));
  }, []);

  useEffect(() => {
    if (user) {
      api
        .solved()
        .then((slugs) => setSolvedSlugs(new Set(slugs)))
        .catch(() => setSolvedSlugs(new Set()));
    } else {
      setSolvedSlugs(new Set());
    }
  }, [user]);

  const allTags = useMemo(() => {
    const tags = new Set();
    for (const p of problems) {
      if (Array.isArray(p.tags)) {
        for (const t of p.tags) {
          if (t) tags.add(t);
        }
      }
    }
    return Array.from(tags).sort();
  }, [problems]);

  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      if (difficulty !== 'All' && p.difficulty?.toLowerCase() !== difficulty.toLowerCase()) {
        return false;
      }
      if (tag !== 'All' && !p.tags?.includes(tag)) {
        return false;
      }
      if (search.trim() && !p.title.toLowerCase().includes(search.trim().toLowerCase())) {
        return false;
      }
      if (hideSolved && solvedSlugs.has(p.slug)) {
        return false;
      }
      return true;
    });
  }, [problems, difficulty, tag, search, hideSolved, solvedSlugs]);

  return (
    <section>
      <h1>Problems</h1>
      {error && <p className="error">{error}</p>}

      <div className="filters-bar">
        <input
          type="search"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />

        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="All">All difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>

        <select value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="All">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={hideSolved}
            onChange={(e) => setHideSolved(e.target.checked)}
          />
          Hide solved
        </label>
      </div>

      {filteredProblems.length === 0 ? (
        <p className="muted">No problems match your filters.</p>
      ) : (
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
            {filteredProblems.map((p, i) => (
              <tr key={p.slug}>
                <td>{i + 1}</td>
                <td>
                  <Link to={`/problems/${p.slug}`}>
                    {p.title}
                  </Link>
                  {solvedSlugs.has(p.slug) && (
                    <span className="solved-badge" title="Solved"> ✓</span>
                  )}
                </td>
                <td>{p.difficulty}</td>
                <td>{p.tags?.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
