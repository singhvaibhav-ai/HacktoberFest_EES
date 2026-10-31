import { Link } from 'react-router-dom';

export default function NotFound({ message = "We couldn't find the page you were looking for." }) {
  return (
    <section className="not-found">
      <p className="not-found-code">404</p>
      <h1>Not found</h1>
      <p className="muted">{message}</p>
      <Link className="button" to="/">
        Back to the problem list
      </Link>
    </section>
  );
}
