import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const THEME_KEY = 'codearena-theme';

function initialDark() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
  } catch {
    // storage unavailable (private mode) — fall through
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function Navbar() {
  const [dark, setDark] = useState(initialDark);
  const { user, checking, logout } = useAuth();

  useEffect(() => {
    // Dark class on <html>: the .dark variable overrides in styles.css
    // then cascade over the whole page, not just the navbar.
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      // persistence is best-effort
    }
  }, [dark]);

  return (
    // <nav> keeps NO dark class — the html element owns the theme now
    <nav className="navbar">
      <button className="ghost" onClick={() => setDark(!dark)} title="Toggle dark mode">
        {dark ? '☀️' : '🌙'}
      </button>
    </nav>
  );
}