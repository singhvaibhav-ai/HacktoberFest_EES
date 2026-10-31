async function request(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let data;
    try {
      data = await res.json();
    } catch {
      // not JSON
    }
    let message = data && data.error;
    if (!message) {
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const minutes = retryAfter ? Math.max(1, Math.ceil(Number(retryAfter) / 60)) : 10;
        message = `Too many attempts, try again in ${minutes} minute${minutes === 1 ? '' : 's'}`;
      } else {
        message = `Request failed: ${res.status}`;
      }
    }
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    err.response = res;
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
