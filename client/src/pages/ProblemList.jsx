import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function ProblemList() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [solvedSlugs, setSolvedSlugs] = useState(new Set());
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('All');
  const [tag, setTag] = useState('All');
  const [hideSolved, setHideSolved] = useState(false);

  useEffect(() => {
    api.problems()
      .then(setProblems)
      .catch(() => setError('Could not reach the server. Is it running?'));
  }, []);

  useEffect(() => {
    if (user) {
      api.submissions('', user.username)
        .then((subs) => {
          const solved = new Set(subs.filter((s) => s.verdict === 'AC').map((s) => s.slug));
          setSolvedSlugs(solved);
        })
        .catch(() => {});
    } else {
      setSolvedSlugs(new Set());
    }
  }, [user]);

  const allTags = useMemo(() => {
    const set = new Set();
    for (const p of problems) {
      for (const t of p.tags || []) {
        set.add(t);
      }
    }
    return Array.from(set).sort();
  }, [problems]);

  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      if (difficulty !== 'All' && p.difficulty !== difficulty) return false;
      if (tag !== 'All' && !(p.tags || []).includes(tag)) return false;
      if (search.trim() && !p.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (hideSolved && solvedSlugs.has(p.slug)) return false;
      return true;
    });
  }, [problems, difficulty, tag, search, hideSolved, solvedSlugs]);

  return (
    <section>
      <h1>Problems</h1>
      {error && <p className="error">{error}</p>}

      <div
        className="filters-bar"
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <input
          type="text"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '6px 10px', minWidth: '180px' }}
        />
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="All">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <select value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="All">All Tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {user && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hideSolved}
              onChange={(e) => setHideSolved(e.target.checked)}
            />
            Hide solved
          </label>
        )}
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
                  <Link to={`/problems/${p.slug}`}>{p.title}</Link>
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
