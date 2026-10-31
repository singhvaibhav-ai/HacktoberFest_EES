import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { marked } from 'marked';
import { api } from '../api.js';
import { judge } from '../judge/runner.js';
import { VERDICT_LABELS, VERDICT_CLASSES } from '../judge/verdict.js';
import { LANGUAGES } from '../languages.js';
import { useAuth } from '../auth.jsx';
import CodeEditor from '../components/CodeEditor.jsx';
import DifficultyBadge from '../components/DifficultyBadge.jsx';

export default function ProblemPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setProblem(null);
    setResult(null);
    setCode(language.template);
    api.problem(slug).then(setProblem);
  }, [slug]);

  useEffect(() => {
    loadSubmissions();
  }, [slug, user]);

  function loadSubmissions() {
    if (!user) return setSubmissions([]);
    api.submissions(slug, user.username).then(setSubmissions);
  }

  async function submit() {
    // Like LeetCode: anyone can read and write code, but submitting needs an account.
    if (!user) {
      navigate(`/login?next=/problems/${slug}`);
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await judge(code, language.id, problem, setStatus);
      setResult(res);
      await api.submit({ username: user.username, slug, language: language.id, code, ...res });
      loadSubmissions();
    } catch (err) {
      setResult({ verdict: 'RE', message: String(err) });
    } finally {
      setStatus('');
      setBusy(false);
    }
  }

  if (!problem) return <p className="muted">Loading...</p>;

  return (
    <div className="problem-layout">
      <section className="statement">
        <h1>{problem.title}</h1>
        <p className="muted">
          <DifficultyBadge difficulty={problem.difficulty} /> · {problem.tags?.join(', ')}
        </p>
        <div dangerouslySetInnerHTML={{ __html: marked.parse(problem.statement) }} />
      </section>

      <section className="workspace">
        <div className="toolbar">
          <select
            value={language.id}
            onChange={(e) => setLanguage(LANGUAGES.find((l) => l.id === e.target.value))}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id} disabled={!l.enabled}>
                {l.label}
              </option>
            ))}
          </select>
          <div className="spacer" />
          <button className="ghost" disabled title="Not implemented yet">
            Run
          </button>
          <button onClick={submit} disabled={busy}>
            {busy ? 'Judging...' : user ? 'Submit' : 'Log in to submit'}
          </button>
        </div>

        <CodeEditor language={language.monaco} value={code} onChange={setCode} />

        {busy && (
          <p className="status-line">
            <span className="spinner" aria-hidden="true" />
            {status || 'Judging…'}
          </p>
        )}
        {result && (
          <div className="verdict">
            <strong className={VERDICT_CLASSES[result.verdict] || 'verdict-ce'}>
              {VERDICT_LABELS[result.verdict] || result.verdict}
            </strong>
            {result.total ? (
              <span className="muted">
                {' '}
                · {result.passed}/{result.total} tests passed
              </span>
            ) : null}
            {result.message && <pre>{result.message}</pre>}
          </div>
        )}

        <h3>Your submissions</h3>
        {!user ? (
          <p className="muted">
            <Link to={`/login?next=/problems/${slug}`}>Log in</Link> to submit and see your submissions.
          </p>
        ) : submissions.length === 0 ? (
          <p className="muted">No submissions yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Language</th>
                <th>Verdict</th>
                <th>Tests</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.createdAt).toLocaleTimeString()}</td>
                  <td>{s.language}</td>
                  <td>
                    <span className={VERDICT_CLASSES[s.verdict] || 'verdict-ce'}>
                      {VERDICT_LABELS[s.verdict] || s.verdict}
                    </span>
                  </td>
                  <td>
                    {s.passed}/{s.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
