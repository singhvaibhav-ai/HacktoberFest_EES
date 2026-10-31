import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Navbar() {
  const [dark, setDark] = useState(false);
  const { user, checking, logout } = useAuth();

  return (
    <nav className={`navbar ${dark ? 'dark' : ''}`}>
      <Link to="/" className="brand">
        Code<span>Arena</span>
      </Link>
      <NavLink to="/">Problems</NavLink>
      <NavLink to="/leaderboard">Leaderboard</NavLink>
      <NavLink to="/admin">Admin</NavLink>
      <div className="spacer" />
      {checking ? null : user ? (
        <>
          <span className="team-name">ðŸ‘¥ {user.username}</span>
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
        {dark ? 'â˜€ï¸' : 'ðŸŒ™'}
      </button>
    </nav>
  );
}
