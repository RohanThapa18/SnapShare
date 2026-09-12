import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Guards a route behind authentication. There's no role restriction
 * anymore — permissions are per-event (organizer/photographer/
 * participant), resolved on each event's own page, not globally here.
 * Preserves the originally-requested path so QR join links work even
 * if the person has to log in first.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-muted">
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return children;
}
