import { useState } from "react";
import toast from "react-hot-toast";
import Modal from "./Modal";
import * as reportService from "../services/reportService";
import { REPORT_REASON_LABELS } from "../utils/reportReasons";

/** Lets a participant flag a photo for the organizers. Render when `photo` is set. */
export default function ReportPhotoModal({ photo, onClose }) {
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (close) => {
    if (!reason) return toast.error("Pick a reason first");
    setSending(true);
    try {
      const res = await reportService.reportPhoto(photo._id, { reason, note: note.trim() || undefined });
      toast.success(res.data.message);
      close();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't send your report");
      setSending(false);
    }
  };

  return (
    <Modal title="Report this photo" onClose={onClose}>
      {(close) => (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img src={photo.thumbnailUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
            <p className="text-sm text-text-muted">
              The event organizers will review it. The uploader isn't told who reported it.
            </p>
          </div>

          <fieldset className="space-y-1.5">
            {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition ${
                  reason === value
                    ? "border-primary bg-primary/5 text-text"
                    : "border-border text-text-muted hover:bg-surface-sunken"
                }`}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  className="accent-[#26345f]"
                />
                {label}
              </label>
            ))}
          </fieldset>

          <div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Anything else the organizer should know? (optional)"
              className="w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            />
            <p className="mt-1 text-right text-[11px] text-text-muted">{note.length}/500</p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={close}
              className="rounded-xl border border-border px-4 py-2 text-sm text-text transition hover:bg-surface-sunken"
            >
              Cancel
            </button>
            <button
              onClick={() => submit(close)}
              disabled={sending || !reason}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send report"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}