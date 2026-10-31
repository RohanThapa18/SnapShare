import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Clock, X } from "lucide-react";

const WARN_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Heads-up shown when an ACTIVE event is within 48 hours of closing. */
export default function ExpiryBanner({ event, onOpenSettings }) {
  const [dismissed, setDismissed] = useState(false);

  const expiry = new Date(event.expiryDate);
  const msLeft = expiry.getTime() - Date.now();
  if (dismissed || event.status !== "ACTIVE" || msLeft <= 0 || msLeft > WARN_WINDOW_MS) return null;

  return (
    <div className="mb-6 flex animate-fade-in flex-wrap items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/30 text-primary">
        <Clock size={17} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">
          This event closes {formatDistanceToNow(expiry, { addSuffix: true })}
        </p>
        <p className="text-xs text-text-muted">
          After that, nobody can join, upload or buy photos. Photos stay viewable and downloadable.
        </p>
      </div>

      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="rounded-xl bg-primary px-3.5 py-2 text-sm font-medium text-white transition hover:bg-primary-hover"
        >
          Extend or export
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="rounded-lg p-1.5 text-text-muted transition hover:bg-surface-sunken hover:text-text"
      >
        <X size={16} />
      </button>
    </div>
  );
}