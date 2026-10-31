import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

// Only allow paths on this site. Anything else (https://evil.example, //evil.example) becomes "/".
function safeNextPath(next) {
  if (!next || typeof next !== 'string') return '/';
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  if (/[\\\u0000-\u001f]/.test(next)) return '/';
  try {
    const url = new URL(next, window.location.origin);
    if (url.origin !== window.location.origin) return '/';
  } catch {
    return '/';
  }
  return next;
}

// One page for both "Log in" and "Sign up"; mode decides which.
export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const nextQuery = next === '/' ? '' : `?next=${encodeURIComponent(next)}`;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isSignup) await signup(username, password);
      else await login(username, password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card">
      <h1>{isSignup ? 'Create a team account' : 'Log in'}</h1>
      <p className="muted">You only need an account to submit code. Browsing problems is open to everyone.</p>
      <form onSubmit={handleSubmit}>
        <label>
          Team name
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait...' : isSignup ? 'Sign up' : 'Log in'}
        </button>
      </form>
      <p className="muted">
        {isSignup ? (
          <>
            Already have an account? <Link to={`/login${nextQuery}`}>Log in</Link>
          </>
        ) : (
          <>
            New here? <Link to={`/signup${nextQuery}`}>Create a team account</Link>
          </>
        )}
      </p>
    </section>
  );
}