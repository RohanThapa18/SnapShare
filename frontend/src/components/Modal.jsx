import { useEffect, useCallback, useState, useRef } from "react";
import { X } from "lucide-react";

// Shared across every open Modal so stacked dialogs (e.g. a confirm on top
// of Settings) behave: ESC closes only the top one, and page scroll stays
// locked until the last one closes.
const modalStack = [];
let scrollLocks = 0;
let savedOverflow = "";

/**
 * Standard app modal: centered card, darkened backdrop, ESC and
 * backdrop-click to close, smooth scale/fade enter + exit.
 *
 * - size:  "sm" (default) or "lg" (wide, for Settings-style content)
 * - layer: "base" (default) or "top" — use "top" for dialogs that open
 *          on top of another modal (ConfirmDialog does this)
 * - children may be a function: children(close) receives the animated
 *   close handler so inner buttons can fade the modal out too.
 */
export default function Modal({ title, onClose, children, size = "sm", layer = "base" }) {
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef(null);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setTimeout(() => onCloseRef.current?.(), 140);
  }, []);

  useEffect(() => {
    const id = Symbol("modal");
    modalStack.push(id);
    if (scrollLocks++ === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    const handleKey = (e) => {
      if (e.key === "Escape" && modalStack[modalStack.length - 1] === id) requestClose();
    };
    window.addEventListener("keydown", handleKey);
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", handleKey);
      modalStack.splice(modalStack.indexOf(id), 1);
      if (--scrollLocks === 0) document.body.style.overflow = savedOverflow;
    };
  }, [requestClose]);

  const layerClasses = layer === "top" ? "z-[60] bg-primary/30" : "z-50 bg-primary/50 backdrop-blur-sm";

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center px-4 ${layerClasses} ${
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
        className={`w-full ${size === "lg" ? "max-w-2xl" : "max-w-sm"} max-h-[85vh] overflow-y-auto bg-surface border border-border rounded-2xl p-6 relative shadow-elevated outline-none ${
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
        {typeof children === "function" ? children(requestClose) : children}
      </div>
    </div>
  );
}