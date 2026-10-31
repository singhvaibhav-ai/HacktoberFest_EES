import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';

function formatDuration(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  const pad = (n) => String(n).padStart(2, '0');
  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function Navbar() {
  const [dark, setDark] = useState(false);
  const { user, checking, logout } = useAuth();
  const [contest, setContest] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    function loadContest() {
      api.contest().then(setContest).catch(() => {});
    }
    loadContest();
    const pollInterval = setInterval(loadContest, 15000);
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    if (!contest?.enabled) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [contest?.enabled]);

  let countdownText = null;
  let countdownClass = '';

  if (contest?.enabled) {
    const startTime = new Date(contest.start).getTime();
    const endTime = new Date(contest.end).getTime();
    const freezeTime = contest.freezeAt
      ? new Date(contest.freezeAt).getTime()
      : endTime - (contest.freezeMinutes ?? 30) * 60 * 1000;

    if (now < startTime) {
      countdownText = `⏳ Starts in ${formatDuration(startTime - now)}`;
      countdownClass = 'contest-upcoming';
    } else if (now > endTime) {
      countdownText = '🏁 Contest ended';
      countdownClass = 'contest-ended';
    } else {
      const isFrozen = now >= freezeTime;
      const remaining = formatDuration(endTime - now);
      countdownText = isFrozen ? `❄️ Frozen · ${remaining}` : `⏱ ${remaining}`;
      countdownClass = isFrozen ? 'contest-frozen' : 'contest-running';
    }
  }

  return (
    <nav className={`navbar ${dark ? 'dark' : ''}`}>
      <Link to="/" className="brand">
        Code<span>Arena</span>
      </Link>
      <NavLink to="/">Problems</NavLink>
      <NavLink to="/leaderboard">Leaderboard</NavLink>
      {countdownText && (
        <div className={`contest-timer ${countdownClass}`}>
          {countdownText}
        </div>
      )}
      <div className="spacer" />
      {checking ? null : user ? (
        <>
          <span className="team-name">👥 {user.username}</span>
          <button className="ghost" onClick={logout}>
            Log out
          </button>
        </>
      ) : (
        <>
          <NavLink to="/login">Log in</NavLink>
          <Link to="/signup" className="button">
            Sign up
          </Link>
        </>
      )}
      <button className="ghost" onClick={() => setDark(!dark)} title="Toggle dark mode">
        {dark ? '☀️' : '🌙'}
      </button>
    </nav>
  );
}
