import { Link } from 'react-router-dom';

// Friendly dead-end for bad URLs and missing problems.
export default function NotFound({ title = 'Page not found', message }) {
    return (
        <section className="not-found">
            <h1>404</h1>
            <h2>{title}</h2>
            {message && <p className="muted">{message}</p>}
            <p>
                <Link to="/" className="button">Back to problems</Link>
            </p>
        </section>
    );
}