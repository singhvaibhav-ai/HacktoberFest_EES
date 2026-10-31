import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

const REFRESH_MS = 15000;

export default function Leaderboard() {
  const { user } = useAuth();
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    function load() {
      api
        .leaderboard()
        .then((rows) => alive && setBoard(rows))
        .catch(() => alive && setError('Could not load the leaderboard. Is the server running?'));
    }
    load();
    const timer = setInterval(load, REFRESH_MS); // standings move during the event
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <section>
      <h1>Leaderboard</h1>
      {error ? (
        <p className="muted">{error}</p>
      ) : !board ? (
        <p className="muted">Loading...</p>
      ) : board.length === 0 ? (
        <p className="muted">No Accepted submissions yet. Be the first!</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Solved</th>
            </tr>
          </thead>
          <tbody>
            {board.map((row, i) => {
              const mine = user && row.username === user.username;
              return (
                <tr key={row.username} className={mine ? 'leaderboard-me' : undefined}>
                  <td>{i + 1}</td>
                  <td>
                    {row.username}
                    {mine ? ' (you)' : ''}
                  </td>
                  <td>{row.solved}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}