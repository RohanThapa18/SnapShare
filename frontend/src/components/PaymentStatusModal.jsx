import { useEffect } from "react";
import { Check, X } from "lucide-react";

const STEPS = [
  { key: "creating", label: "Preparing your order" },
  { key: "paying", label: "Complete the payment in the Razorpay window" },
  { key: "confirming", label: "Confirming and unlocking your photo" },
];
const RANK = { creating: 0, paying: 1, confirming: 2 };
const BUSY = ["creating", "paying", "confirming"];

const Spinner = () => (
  <span className="block h-4 w-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
);

function Badge({ tone, children }) {
  const tones = {
    success: "bg-success/10 text-success",
    error: "bg-error/10 text-error",
    neutral: "bg-secondary text-primary",
    accent: "bg-accent/20 text-primary",
  };
  return (
    <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${tones[tone]}`}>
      {children}
    </div>
  );
}

/**
 * Shows every stage of a purchase in one place so the buyer is never left
 * guessing. flow = { photo, stage, error }, stage is one of:
 * creating | paying | confirming | done | pending | cancelled | error
 */
export default function PaymentStatusModal({ flow, onClose, onRetry, onDownload }) {
  const { photo, stage, error } = flow;
  const busy = BUSY.includes(stage);

  useEffect(() => {
    if (busy) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const price = photo?.price != null ? `₹${Number(photo.price).toFixed(2)}` : "";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Payment status"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-elevated animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {!busy && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-text-muted transition hover:bg-surface-sunken hover:text-text"
          >
            <X size={16} />
          </button>
        )}

        {/* What is being bought */}
        <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
          {photo?.thumbnailUrl ? (
            <img src={photo.thumbnailUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-surface-sunken" />
          )}
          <div>
            <p className="text-sm font-medium text-text">Unlock this photo</p>
            <p className="font-display text-lg text-primary">{price}</p>
          </div>
        </div>

        {busy && (
          <ul className="space-y-3">
            {STEPS.map((s) => {
              const state = RANK[s.key] < RANK[stage] ? "done" : RANK[s.key] === RANK[stage] ? "active" : "todo";
              return (
                <li key={s.key} className="flex items-center gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {state === "done" && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-white">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                    {state === "active" && <Spinner />}
                    {state === "todo" && <span className="h-2 w-2 rounded-full bg-border" />}
                  </span>
                  <span className={state === "todo" ? "text-text-muted" : "text-text"}>{s.label}</span>
                </li>
              );
            })}
          </ul>
        )}

        {stage === "done" && (
          <div className="text-center animate-pop">
            <Badge tone="success"><Check size={26} strokeWidth={3} /></Badge>
            <h3 className="font-display text-lg text-text">Photo unlocked</h3>
            <p className="mt-1 text-sm text-text-muted">It's yours to download any time from Purchases.</p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={onDownload}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover"
              >
                Download now
              </button>
              <button
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-text transition hover:bg-surface-sunken"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {stage === "pending" && (
          <div className="text-center">
            <Badge tone="accent"><Spinner /></Badge>
            <h3 className="font-display text-lg text-text">Still confirming</h3>
            <p className="mt-1 text-sm text-text-muted">{error}</p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover"
            >
              Got it
            </button>
          </div>
        )}

        {stage === "cancelled" && (
          <div className="text-center">
            <Badge tone="neutral"><X size={24} /></Badge>
            <h3 className="font-display text-lg text-text">Payment cancelled</h3>
            <p className="mt-1 text-sm text-text-muted">You closed the payment window before paying.</p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={onRetry}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover"
              >
                Try again
              </button>
              <button
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-text transition hover:bg-surface-sunken"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {stage === "error" && (
          <div className="text-center">
            <Badge tone="error"><X size={26} strokeWidth={3} /></Badge>
            <h3 className="font-display text-lg text-text">Something went wrong</h3>
            <p className="mt-1 text-sm text-text-muted">{error}</p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={onRetry}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover"
              >
                Try again
              </button>
              <button
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-text transition hover:bg-surface-sunken"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}