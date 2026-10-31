import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

function safeRedirectPath(target) {
  // Only paths on this site are allowed (e.g. /problems/two-sum).
  // Block protocol-relative (//evil.example) and external URLs (https://evil.example).
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }
  return '/';
}

// One page for both "Log in" and "Sign up"; mode decides which.
export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const switchAuthUrl = isSignup
    ? next
      ? `/login?next=${encodeURIComponent(next)}`
      : '/login'
    : next
      ? `/signup?next=${encodeURIComponent(next)}`
      : '/signup';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isSignup) await signup(username, password);
      else await login(username, password);
      navigate(safeRedirectPath(next));
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
          <div className="password-input-row">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              className="ghost toggle-password"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait...' : isSignup ? 'Sign up' : 'Log in'}
        </button>
      </form>
      <p className="muted">
        {isSignup ? (
          <>
            Already have an account? <Link to={switchAuthUrl}>Log in</Link>
          </>
        ) : (
          <>
            New here? <Link to={switchAuthUrl}>Create a team account</Link>
          </>
        )}
      </p>
    </section>
  );
}
