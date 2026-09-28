import { useRef } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import Modal from "./Modal";

/**
 * App-styled replacement for window.confirm(). Opens on the "top" modal
 * layer, so it always appears above other modals (like Settings) and
 * fades in/out smoothly. Use `danger` for destructive actions.
 *
 * Keep one piece of state, e.g. `confirmState`, holding
 * { title, message, confirmLabel, danger, onConfirm } or null, and render
 * <ConfirmDialog {...confirmState} onCancel={() => setConfirmState(null)} />
 * when it's truthy.
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
  const clicked = useRef(false);

  const handleConfirm = (close) => {
    if (clicked.current) return; // ignore double-clicks
    clicked.current = true;
    onConfirm();
    close();
  };

  return (
    <Modal title={title} onClose={onCancel} layer="top">
      {(close) => (
        <>
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
              onClick={close}
              className="text-sm px-4 py-2 rounded-control border border-border text-text-muted hover:bg-surface-hover transition"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => handleConfirm(close)}
              className={`text-sm px-4 py-2 rounded-control font-medium text-white transition shadow-sm ${
                danger ? "bg-error hover:bg-error-hover" : "bg-primary hover:bg-primary-hover"
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}