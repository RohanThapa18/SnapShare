import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Simple browser-history-aware back button. Falls back to a given
 * route if there's no meaningful history to go back to (e.g. someone
 * landed directly on a deep link).
 */
export default function BackButton({ fallback = "/dashboard", label = "Back" }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition mb-4"
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}
