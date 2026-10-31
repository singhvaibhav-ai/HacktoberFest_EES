import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

// One page for both "Log in" and "Sign up"; mode decides which.
export default function AuthPage({ mode }) {
    const isSignup = mode === 'signup';
    const { login, signup } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            if (isSignup) await signup(username, password);
            else await login(username, password);
            navigate('/');
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
                <label className="password-field">
                    <span>Password</span>
                    <span className="password-input-row">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete={isSignup ? 'new-password' : 'current-password'}
                        />
                        <button
                            className="ghost password-toggle"
                            type="button"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowPassword((visible) => !visible)}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                {showPassword ? (
                                    <>
                                        <path d="M3 3l18 18" />
                                        <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                                        <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9 7 9 7a15.7 15.7 0 01-3.1 3.9" />
                                        <path d="M6.2 6.2C4.1 7.6 3 12 3 12s3.5 7 9 7a9.7 9.7 0 004-.9" />
                                    </>
                                ) : (
                                    <>
                                        <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" />
                                        <circle cx="12" cy="12" r="2.5" />
                                    </>
                                )}
                            </svg>
                        </button>
                    </span>
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
