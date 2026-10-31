import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Navbar() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const { user, checking, logout } = useAuth();

  useEffect(() => {
    document.body.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
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
      <button className="ghost" onClick={() => setDark((prev) => !prev)} title="Toggle dark mode">
        {dark ? '☀️' : '🌙'}
      </button>
    </nav>
  );
}
