import { useState } from "react";
import toast from "react-hot-toast";
import { Download } from "lucide-react";
import * as eventService from "../services/eventService";
import { triggerBlobDownload, filenameFromContentDisposition } from "../utils/download";

// With responseType "blob", error bodies arrive as a Blob too, so unwrap the message.
const errorMessage = async (err) => {
  const data = err.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message || "Export failed";
    } catch {
      return "Export failed";
    }
  }
  return data?.message || "Export failed";
};

/** Settings card: download every photo in the event as one ZIP (organizers only). */
export default function ExportCard({ eventId }) {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const res = await eventService.exportEvent(eventId);
      const filename = filenameFromContentDisposition(
        res.headers["content-disposition"],
        "SnapShare_event_photos.zip"
      );
      triggerBlobDownload(res.data, filename);
      toast.success(`Export ready${res.headers["x-photo-count"] ? ` — ${res.headers["x-photo-count"]} photos` : ""}`);
    } catch (err) {
      toast.error(await errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
      <h3 className="mb-1 flex items-center gap-1.5 font-medium">
        <Download size={16} />
        Export all photos
      </h3>
      <p className="mb-4 text-xs text-text-muted">
        Download every photo in this event (Official and Community albums) as a single ZIP, a handy
        backup before the event closes. Large events can take a minute or two to prepare.
      </p>
      <button
        onClick={handleExport}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-white transition hover:bg-primary/90 disabled:opacity-50"
      >
        <Download size={14} className={busy ? "animate-pulse" : ""} />
        {busy ? "Preparing ZIP…" : "Download ZIP"}
      </button>
    </div>
  );
}