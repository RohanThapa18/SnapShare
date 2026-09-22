import { AlertTriangle, HelpCircle } from "lucide-react";
import Modal from "./Modal";

/**
 * App-styled replacement for window.confirm(). Renders on top of the
 * shared Modal (same backdrop blur, ESC-to-close, enter/exit animation)
 * with a clear title, message, and two actions. Use `danger` for
 * destructive/irreversible actions (delete, etc.) to color the confirm
 * button and icon red instead of the primary brand color.
 *
 * Usage: keep a single piece of state, e.g. `confirmState`, holding
 * { title, message, confirmLabel, danger, onConfirm } or null, and
 * render <ConfirmDialog {...confirmState} onCancel={() => setConfirmState(null)} />
 * only when confirmState is truthy.
 */
export default function ConfirmDialog({
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}) {
  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex gap-3">
        <div
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            danger ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon size={20} />
        </div>
        <p className="text-sm text-text-muted leading-relaxed pt-1.5">{message}</p>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={onCancel}
          className="text-sm px-4 py-2 rounded-control border border-border text-text-muted hover:bg-surface-hover transition"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => {
            onCancel();
            onConfirm();
          }}
          className={`text-sm px-4 py-2 rounded-control font-medium text-white transition shadow-sm ${
            danger ? "bg-error hover:bg-error-hover" : "bg-primary hover:bg-primary-hover"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}