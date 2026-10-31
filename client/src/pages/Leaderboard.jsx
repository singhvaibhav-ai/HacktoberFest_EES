import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Leaderboard() {
  const [data, setData] = useState({ board: [], frozen: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadLeaderboard() {
    try {
      const res = await api.leaderboard();
      const board = Array.isArray(res) ? res : (res.board || []);
      const frozen = Boolean(res.frozen);
      setData({ board, frozen });
      setError('');
    } catch {
      setError('Could not load leaderboard.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="leaderboard-header">
        <h1>Leaderboard</h1>
        <button className="ghost" onClick={loadLeaderboard} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {data.frozen && (
        <div className="freeze-banner">
          ❄️ <strong>Leaderboard Frozen:</strong> Submissions in the final 30 minutes are hidden until the contest ends.
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {loading && data.board.length === 0 ? (
        <p className="muted">Loading leaderboard...</p>
      ) : data.board.length === 0 ? (
        <p className="muted">No accepted submissions yet. Solve a problem to take the lead!</p>
      ) : (
        <table className="table leaderboard-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Rank</th>
              <th>Team</th>
              <th style={{ width: '150px' }}>Solved</th>
            </tr>
          </thead>
          <tbody>
            {data.board.map((row, idx) => {
              const rank = idx + 1;
              const medal = rank === 1 ? '🥇 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : '';
              return (
                <tr key={row.username}>
                  <td>
                    <strong>
                      {medal}#{rank}
                    </strong>
                  </td>
                  <td>
                    <span className="team-name">{row.username}</span>
                  </td>
                  <td>
                    <span className="badge-solved">
                      {row.solved} {row.solved === 1 ? 'problem' : 'problems'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
