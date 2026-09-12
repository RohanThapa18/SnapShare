import { useEffect, useCallback, useState, useRef } from "react";
import { X } from "lucide-react";

/**
 * Standard app modal: centered card, darkened/blurred backdrop, ESC and
 * backdrop-click to close, smooth scale/fade enter+exit. Used for join
 * flows and other short forms throughout the app.
 */
export default function Modal({ title, onClose, children }) {
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef(null);

  const requestClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 140);
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", handleKey);
    dialogRef.current?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [requestClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-primary/50 backdrop-blur-sm px-4 ${
        closing ? "animate-fade-out" : "animate-fade-in"
      }`}
      onClick={requestClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm bg-surface border border-border rounded-2xl p-6 relative shadow-elevated outline-none ${
          closing ? "animate-scale-out" : "animate-scale-in"
        }`}
      >
        <button
          onClick={requestClose}
          className="absolute top-4 right-4 text-text-muted hover:text-primary transition"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h2 className="font-display text-lg font-medium mb-4 text-primary">{title}</h2>
        {children}
      </div>
    </div>
  );
}
