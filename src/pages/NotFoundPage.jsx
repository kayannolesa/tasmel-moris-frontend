import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="state-page">
      <h1>Page not found</h1>
      <Link className="secondary-link" to="/">
        Return to workspace
      </Link>
    </section>
  );
}
