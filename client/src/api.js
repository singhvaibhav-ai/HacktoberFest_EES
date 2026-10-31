async function request(path, options) {
  let res;
  try {
    res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('Unable to connect to the server. Please try again.');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    if (!res.ok) throw new Error('Something went wrong. Please try again.');
    throw new Error('The server returned an invalid response. Please try again.');
  }
  if (!res.ok) throw new Error(data?.error || 'Something went wrong. Please try again.');
  return data;
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
