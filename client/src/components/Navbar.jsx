import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const THEME_KEY = 'theme';

function getInitialDark() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
  } catch {
    // localStorage can be unavailable (e.g. private mode); fall through.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export default function Navbar() {
  const [dark, setDark] = useState(getInitialDark);
  const { user, checking, logout } = useAuth();

  // Put the class on <html> so the theme variables apply to the whole page.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      // Ignore storage failures; the theme still applies for this session.
    }
  }, [dark]);

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        Code<span>Arena</span>
      </Link>
      <NavLink to="/">Problems</NavLink>
      <NavLink to="/leaderboard">Leaderboard</NavLink>
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
      <button
        className="ghost"
        onClick={() => setDark((value) => !value)}
        title="Toggle dark mode"
        aria-label="Toggle dark mode"
        aria-pressed={dark}
      >
        {dark ? '☀️' : '🌙'}
      </button>
    </nav>
  );
}
