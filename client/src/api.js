async function request(path, options) {
  let res;
  try {
    res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    // fetch itself failed: server down, network, CORS — there is no status
    throw new Error('Could not reach the server. Is it running?');
  }

  if (!res.ok) {
    let message = '';
    try {
      const body = await res.json();
      message = body?.error || body?.message || '';
    } catch {
      // body wasn't JSON (empty reply, proxy error page) — use the fallback
    }
    if (!message) {
      message =
        {
          400: 'Invalid request. Check what you entered and try again.',
          401: 'Not allowed — check your credentials.',
          404: 'Not found.',
          500: 'The server hit a problem. Try again in a moment.',
        }[res.status] || 'Something went wrong. Please try again.';
    }
    const err = new Error(message);
    err.status = res.status; // kept for callers that want to branch on it
    throw err;
  }

  return res.json();
}

export const api = {
  problems: () => request('/api/problems'),
  problem: (slug) => request(`/api/problems/${slug}`),
  submissions: (slug, username) =>
    request(`/api/submissions?slug=${encodeURIComponent(slug)}&username=${encodeURIComponent(username)}`),
  submit: (body) => request('/api/submissions', { method: 'POST', body: JSON.stringify(body) }),
  leaderboard: () => request('/api/leaderboard'),
  me: () => request('/api/auth/me'),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  signup: (body) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
};
