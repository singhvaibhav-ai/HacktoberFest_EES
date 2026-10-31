async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(path, {
    ...options,
    headers,
  });
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
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
  verifyAdmin: (password) =>
    request('/api/admin/verify', { method: 'POST', body: JSON.stringify({ password }) }),
  saveProblem: (problem, adminPassword) =>
    request('/api/admin/problems', {
      method: 'POST',
      headers: { 'x-admin-password': adminPassword },
      body: JSON.stringify(problem),
    }),
};
