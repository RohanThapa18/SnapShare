import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <p className="text-text-muted mb-6">Page not found</p>
      <Link to="/" className="text-primary hover:underline">
        Back to home
      </Link>
    </div>
  );
}
