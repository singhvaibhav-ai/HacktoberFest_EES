import { Link } from 'react-router-dom';

export default function NotFound({ title = '404 · Page Not Found', message = 'The page you are looking for does not exist.' }) {
  return (
    <section className="not-found" style={{ textAlign: 'center', padding: '60px 20px' }}>
      <h1>{title}</h1>
      <p className="muted" style={{ marginBottom: '24px' }}>{message}</p>
      <Link to="/" className="button">
        Back to problems
      </Link>
    </section>
  );
}
