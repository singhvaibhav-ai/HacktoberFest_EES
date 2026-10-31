import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Leaderboard() {
  const { user } = useAuth();
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .leaderboard()
      .then(setBoard)
      .catch(() => setError('Could not load the leaderboard. Is the server running?'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <h1>Leaderboard</h1>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Loading...</p>
      ) : board.length === 0 ? (
        <p className="muted">No problems solved yet. Be the first team on the board!</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Problems solved</th>
            </tr>
          </thead>
          <tbody>
            {board.map((row, i) => (
              <tr key={row.username} className={user?.username === row.username ? 'highlight' : undefined}>
                <td>{i + 1}</td>
                <td>{row.username}</td>
                <td>{row.solved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
