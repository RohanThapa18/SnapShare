import { useState } from "react";
import toast from "react-hot-toast";
import { Copy, Check, Hash } from "lucide-react";
import { formatEventCode } from "../utils/eventCode";

export default function EventIdCard({ eventCode }) {
  const [copied, setCopied] = useState(false);
  const display = formatEventCode(eventCode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Unable to copy.");
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-card">
      <h3 className="font-medium mb-1 flex items-center gap-1.5">
        <Hash size={16} />
        Event ID
      </h3>
      <p className="text-xs text-text-muted mb-4">
        A short code people type together with a passcode when they choose Join Event or Join as Photographer.
      </p>
      {!display ? (
        <div className="skeleton h-11 w-full rounded-lg" />
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 bg-surface-sunken border border-border rounded-lg px-4 py-2.5 font-mono text-lg tracking-[0.25em] text-primary select-all">
            {display}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-border hover:bg-surface-hover transition shrink-0"
            aria-label="Copy event ID"
          >
            {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
          </button>
        </div>
      )}
    </div>
  );
}