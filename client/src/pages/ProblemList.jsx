import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function ProblemList() {
  const [problems, setProblems] = useState([]);
  const [contest, setContest] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.contest().then(setContest).catch(() => {});
    api.problems()
      .then(setProblems)
      .catch((err) => {
        if (err.status !== 403) {
          setError('Could not reach the server. Is it running?');
        }
      });
  }, []);

  const isUpcoming = contest?.enabled && contest?.status === 'upcoming';

  if (isUpcoming) {
    return (
      <section className="contest-banner-card">
        <h1>Contest Mode</h1>
        <p className="muted">
          The contest has not started yet. All problem statements and test cases are hidden until the contest begins.
        </p>
        <div className="contest-meta-box">
          <strong>Contest Starts:</strong> {new Date(contest.start).toLocaleString()}
        </div>
      </section>
    );
  }

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
              <td>{p.difficulty}</td>
              <td>{p.tags?.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
