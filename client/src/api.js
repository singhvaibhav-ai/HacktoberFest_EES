async function request(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      const seconds = retryAfter ? parseInt(retryAfter, 10) : 600;
      const minutes = Math.max(1, Math.ceil(seconds / 60));
      const message =
        data.error ||
        `Too many attempts, try again in ${minutes} minute${minutes === 1 ? '' : 's'}`;
      const err = new Error(message);
      err.status = 429;
      err.retryAfter = seconds;
      throw err;
    }
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.status = res.status;
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
