import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import DifficultyBadge from '../components/DifficultyBadge.jsx';

export default function ProblemList() {
  const [problems, setProblems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.problems().then(setProblems).catch(() => setError('Could not reach the server. Is it running?'));
  }, []);

  return (
    <section>
      <h1>Problems</h1>
      {error && <p className="error">{error}</p>}
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
          {problems.map((p, i) => (
            <tr key={p.slug}>
              <td>{i + 1}</td>
              <td>
                <Link to={`/problems/${p.slug}`}>{p.title}</Link>
              </td>
              <td><DifficultyBadge difficulty={p.difficulty} /></td>
              <td>{p.tags?.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
