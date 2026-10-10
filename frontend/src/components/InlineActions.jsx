import { useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Small pill bar that appears beside a person's name.
 * actions: [{ key, label, icon?, danger?, confirm?: "Short question?", onRun }]
 * Actions with `confirm` swap the bar for "Question? [No] [Yes]" before running.
 */
export default function InlineActions({ actions, onDone }) {
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (action) => {
    setBusy(true);
    try {
      await action.onRun();
    } finally {
      setBusy(false);
      onDone?.();
    }
  };

  if (pending) {
    return (
      <div className="inline-flex animate-fade-in items-center gap-1 rounded-full border border-border bg-surface p-1 pl-3 shadow-sm">
        <span className="mr-1 text-xs font-medium text-text">{pending.confirm}</span>
        <button
          onClick={() => setPending(null)}
          disabled={busy}
          className="rounded-full px-3 py-1 text-xs font-medium text-text-muted transition hover:bg-surface-sunken disabled:opacity-50"
        >
          No
        </button>
        <button
          onClick={() => run(pending)}
          disabled={busy}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white transition disabled:opacity-60 ${
            pending.danger ? "bg-error hover:opacity-90" : "bg-primary hover:bg-primary-hover"
          }`}
        >
          {busy && <Loader2 size={11} className="animate-spin" />}
          Yes
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex animate-fade-in flex-wrap items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-sm">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.key}
            onClick={() => (a.confirm ? setPending(a) : run(a))}
            disabled={busy}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
              a.danger
                ? "text-error hover:bg-error/10"
                : "text-text hover:bg-primary/10 hover:text-primary"
            }`}
          >
            {Icon && <Icon size={13} />}
            {a.label}
          </button>
        );
      })}
    </div>
  );
}