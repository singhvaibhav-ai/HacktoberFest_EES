import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

// One page for both "Log in" and "Sign up"; mode decides which.
export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retryAfter, setRetryAfter] = useState(null);

  useEffect(() => {
    if (!retryAfter || retryAfter <= 0) return;
    const interval = setInterval(() => {
      setRetryAfter((prev) => {
        if (!prev || prev <= 1) {
          setError('');
          return null;
        }
        const next = prev - 1;
        const minutes = Math.max(1, Math.ceil(next / 60));
        setError(`Too many attempts, try again in ${minutes} minute${minutes === 1 ? '' : 's'}`);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [retryAfter]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isSignup) await signup(username, password);
      else await login(username, password);
      setRetryAfter(null);
      navigate('/');
    } catch (err) {
      setError(err.message);
      if (err.status === 429 && err.retryAfter) {
        setRetryAfter(err.retryAfter);
      }
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
            Already have an account? <Link to="/login">Log in</Link>
          </>
        ) : (
          <>
            New here? <Link to="/signup">Create a team account</Link>
          </>
        )}
      </p>
    </section>
  );
}
