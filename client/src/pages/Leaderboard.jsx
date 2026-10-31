import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Leaderboard() {
  const { user } = useAuth();
  const [board, setBoard] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .leaderboard()
      .then(setBoard)
      .catch(() => setError('Could not reach the server. Is it running?'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Loading...</p>;

  return (
    <section>
      <h1>Leaderboard</h1>
      {error && <p className="error">{error}</p>}
      {!error && board.length === 0 ? (
        <p className="muted">No accepted submissions yet. Be the first!</p>
      ) : (
        !error && (
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Problems solved</th>
              </tr>
            </thead>
            <tbody>
              {board.map((entry, i) => {
                const isCurrentTeam = user?.username === entry.username;
                return (
                  <tr key={entry.username} className={isCurrentTeam ? 'highlight' : undefined}>
                    <td>{i + 1}</td>
                    <td>
                      {entry.username}
                      {isCurrentTeam && <span className="muted"> (you)</span>}
                    </td>
                    <td>{entry.solved}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )
      )}
    </section>
  );
}
