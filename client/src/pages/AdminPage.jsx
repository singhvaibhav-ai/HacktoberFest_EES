import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import { api } from '../api.js';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState(
    () => sessionStorage.getItem('admin_password') || ''
  );
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [inputPassword, setInputPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [problems, setProblems] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState('__new__');

  // Problem form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [difficulty, setDifficulty] = useState('Easy');
  const [tags, setTags] = useState('');
  const [order, setOrder] = useState(1);
  const [timeLimitMs, setTimeLimitMs] = useState(2000);
  const [statement, setStatement] = useState('# Problem Title\n\nDescribe the problem here.\n\n### Input\nDescribe input format.\n\n### Output\nDescribe output format.\n\n### Example\n```\nInput:\n1 2\nOutput:\n3\n```');
  const [tests, setTests] = useState([
    { input: '', output: '' },
  ]);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [saveError, setSaveError] = useState('');

  // Check existing password on mount
  useEffect(() => {
    if (adminPassword) {
      api.verifyAdmin(adminPassword)
        .then(() => setAuthenticated(true))
        .catch(() => {
          sessionStorage.removeItem('admin_password');
          setAdminPassword('');
          setAuthenticated(false);
        })
        .finally(() => setAuthChecking(false));
    } else {
      setAuthChecking(false);
    }
  }, []);

  // Fetch problems list when authenticated
  useEffect(() => {
    if (authenticated) {
      loadProblems();
    }
  }, [authenticated]);

  function loadProblems() {
    api.problems()
      .then((data) => {
        setProblems(data);
        if (selectedSlug === '__new__') {
          setOrder(data.length + 1);
        }
      })
      .catch(() => {});
  }

  function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError('');
    api.verifyAdmin(inputPassword)
      .then(() => {
        sessionStorage.setItem('admin_password', inputPassword);
        setAdminPassword(inputPassword);
        setAuthenticated(true);
      })
      .catch((err) => {
        setAuthError(err.message || 'Incorrect admin password');
      });
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_password');
    setAdminPassword('');
    setAuthenticated(false);
  }

  function handleProblemSelect(slugValue) {
    setSelectedSlug(slugValue);
    setSaveSuccess(null);
    setSaveError('');

    if (slugValue === '__new__') {
      setTitle('');
      setSlug('');
      setSlugManuallyEdited(false);
      setDifficulty('Easy');
      setTags('');
      setOrder(problems.length + 1);
      setTimeLimitMs(2000);
      setStatement('# Problem Title\n\nDescribe the problem here.\n\n### Input\nDescribe input format.\n\n### Output\nDescribe output format.');
      setTests([{ input: '', output: '' }]);
      return;
    }

    api.problem(slugValue).then((p) => {
      if (!p) return;
      setTitle(p.title || '');
      setSlug(p.slug || slugValue);
      setSlugManuallyEdited(true);
      setDifficulty(p.difficulty || 'Easy');
      setTags(Array.isArray(p.tags) ? p.tags.join(', ') : '');
      setOrder(p.order ?? 1);
      setTimeLimitMs(p.timeLimitMs ?? p.timeLimit ?? 2000);
      setStatement(p.statement || '');
      setTests(p.tests?.length ? p.tests : [{ input: '', output: '' }]);
    });
  }

  function handleTitleChange(val) {
    setTitle(val);
    if (!slugManuallyEdited && selectedSlug === '__new__') {
      setSlug(slugify(val));
    }
  }

  function addTestCase() {
    setTests([...tests, { input: '', output: '' }]);
  }

  function removeTestCase(idx) {
    if (tests.length <= 1) return;
    setTests(tests.filter((_, i) => i !== idx));
  }

  function updateTestCase(idx, field, value) {
    const updated = [...tests];
    updated[idx] = { ...updated[idx], [field]: value };
    setTests(updated);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess(null);

    const cleanSlug = slug.trim().toLowerCase();
    if (!cleanSlug || !/^[a-z0-9-]+$/.test(cleanSlug)) {
      setSaveError('Slug must contain only lowercase letters, numbers, and hyphens (e.g. "two-sum")');
      return;
    }
    if (!title.trim()) {
      setSaveError('Title is required');
      return;
    }
    if (tests.length === 0) {
      setSaveError('Please add at least one test case');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        slug: cleanSlug,
        title: title.trim(),
        difficulty,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        order: Number(order) || 1,
        timeLimitMs: Number(timeLimitMs) || 2000,
        statement,
        tests,
      };
      await api.saveProblem(payload, adminPassword);
      setSaveSuccess(cleanSlug);
      loadProblems();
    } catch (err) {
      setSaveError(err.message || 'Failed to save problem');
    } finally {
      setSaving(false);
    }
  }

  if (authChecking) {
    return <p className="muted">Checking credentials...</p>;
  }

  if (!authenticated) {
    return (
      <div className="auth-card">
        <h1>Admin Login</h1>
        <p className="muted">Enter the admin password set in the server environment.</p>
        <form onSubmit={handleAuthSubmit}>
          <label>
            Password
            <input
              type="password"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              placeholder="Admin password..."
              required
              autoFocus
            />
          </label>
          {authError && <p className="error">{authError}</p>}
          <button type="submit">Unlock Admin</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Problem Management</h1>
          <p className="muted">Create and edit problems directly in the browser.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <div className="admin-selector">
        <label>
          <strong>Select Problem: </strong>
          <select value={selectedSlug} onChange={(e) => handleProblemSelect(e.target.value)}>
            <option value="__new__">➕ Create new problem</option>
            {problems.map((p) => (
              <option key={p.slug} value={p.slug}>
                ✏️ {p.title} ({p.slug})
              </option>
            ))}
          </select>
        </label>
      </div>

      {saveSuccess && (
        <div className="alert success" style={{ marginBottom: '16px' }}>
          ✅ Problem saved successfully!{' '}
          <Link to={`/problems/${saveSuccess}`}>View problem →</Link>
        </div>
      )}

      {saveError && (
        <div className="alert error-box" style={{ marginBottom: '16px' }}>
          ❌ {saveError}
        </div>
      )}

      <form onSubmit={handleSave} className="admin-form">
        <div className="form-grid">
          <label>
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Two Sum"
              required
            />
          </label>

          <label>
            Slug (folder name)
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManuallyEdited(true);
              }}
              placeholder="e.g. two-sum"
              required
            />
          </label>

          <label>
            Difficulty
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </label>

          <label>
            Tags (comma-separated)
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. arrays, hash-table"
            />
          </label>

          <label>
            Order
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              min="1"
            />
          </label>

          <label>
            Time Limit (ms)
            <input
              type="number"
              value={timeLimitMs}
              onChange={(e) => setTimeLimitMs(Number(e.target.value))}
              min="100"
              step="100"
            />
          </label>
        </div>

        <h3>Problem Statement (Markdown)</h3>
        <div className="statement-split">
          <div className="statement-editor">
            <label className="muted" style={{ display: 'block', marginBottom: '6px' }}>
              Markdown source
            </label>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              rows={16}
              style={{ width: '100%', fontFamily: 'monospace' }}
              placeholder="Write the problem statement in Markdown..."
              required
            />
          </div>
          <div className="statement-preview-container">
            <label className="muted" style={{ display: 'block', marginBottom: '6px' }}>
              Live Preview
            </label>
            <div
              className="statement-preview"
              dangerouslySetInnerHTML={{ __html: marked.parse(statement) }}
            />
          </div>
        </div>

        <div className="tests-header">
          <h3>Test Cases</h3>
          <button type="button" className="ghost" onClick={addTestCase}>
            ➕ Add test case
          </button>
        </div>

        <div className="test-cases-list">
          {tests.map((test, idx) => (
            <div key={idx} className="test-card">
              <div className="test-card-header">
                <strong>Test #{idx + 1}</strong>
                {tests.length > 1 && (
                  <button
                    type="button"
                    className="ghost danger-btn"
                    onClick={() => removeTestCase(idx)}
                    title="Remove test case"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="test-card-body">
                <label>
                  Input (stdin)
                  <textarea
                    value={test.input}
                    onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                    rows={4}
                    placeholder="Input data..."
                  />
                </label>
                <label>
                  Expected Output (stdout)
                  <textarea
                    value={test.output}
                    onChange={(e) => updateTestCase(idx, 'output', e.target.value)}
                    rows={4}
                    placeholder="Expected output data..."
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px' }}>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving files...' : selectedSlug === '__new__' ? 'Create Problem' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
