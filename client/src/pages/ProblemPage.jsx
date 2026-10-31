import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { marked } from 'marked';
import { api } from '../api.js';
import { judge } from '../judge/runner.js';
import { VERDICT_LABELS } from '../judge/verdict.js';
import { LANGUAGES } from '../languages.js';
import { useAuth } from '../auth.jsx';
import CodeEditor from '../components/CodeEditor.jsx';

export default function ProblemPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [contest, setContest] = useState(null);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setProblem(null);
    setResult(null);
    setError('');
    setCode(language.template);
    api.contest().then(setContest).catch(() => {});
    api.problem(slug).then(setProblem).catch((err) => {
      if (err.status === 403) {
        setError('Contest has not started yet. This problem is currently hidden.');
      } else {
        setError('Problem not found');
      }
    });
  }, [slug]);

  useEffect(() => {
    loadSubmissions();
  }, [slug, user]);

  function loadSubmissions() {
    if (!user) return setSubmissions([]);
    api.submissions(slug, user.username).then(setSubmissions);
  }

  const isContestUpcoming = contest?.enabled && contest?.status === 'upcoming';
  const isContestEnded = contest?.enabled && contest?.status === 'ended';

  async function submit() {
    if (isContestEnded) return;
    if (!user) {
      navigate(`/login?next=/problems/${slug}`);
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await judge(code, problem, setStatus);
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

  if (isContestUpcoming || error) {
    return (
      <section className="contest-banner-card">
        <h1>Contest Mode</h1>
        <p className="muted">
          {error || 'This problem is locked until the contest starts.'}
        </p>
        {contest?.start && (
          <p>
            <strong>Starts:</strong> {new Date(contest.start).toLocaleString()}
          </p>
        )}
      </section>
    );
  }

  if (!problem) return <p className="muted">Loading...</p>;

  return (
    <div className="problem-layout">
      <section className="statement">
        <h1>{problem.title}</h1>
        <p className="muted">
          {problem.difficulty} · {problem.tags?.join(', ')}
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
          <button
            onClick={submit}
            disabled={busy || isContestEnded}
            title={isContestEnded ? 'Contest has ended. Submissions are closed.' : ''}
          >
            {busy
              ? 'Judging...'
              : isContestEnded
              ? 'Contest ended'
              : user
              ? 'Submit'
              : 'Log in to submit'}
          </button>
        </div>

        {isContestEnded && (
          <p className="muted" style={{ margin: '0 0 10px 0' }}>
            Contest has ended. Submissions are closed.
          </p>
        )}

        <CodeEditor language={language.monaco} value={code} onChange={setCode} />

        {status && <p className="muted">{status}</p>}
        {result && (
          <div className="verdict">
            <strong>{VERDICT_LABELS[result.verdict] || result.verdict}</strong>
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
                  <td>{s.verdict}</td>
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
