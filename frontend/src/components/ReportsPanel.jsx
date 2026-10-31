import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Flag } from "lucide-react";
import * as reportService from "../services/reportService";
import { REPORT_REASON_LABELS } from "../utils/reportReasons";
import EmptyState from "./EmptyState";
import RowsSkeleton from "./RowsSkeleton";

/**
 * Organizer-only tab: photos participants have flagged, one card per photo.
 * onRequestConfirm = the page's setConfirmState (opens the app's ConfirmDialog);
 * onCountChange(n) keeps the tab badge in sync after each decision.
 */
export default function ReportsPanel({ eventId, onRequestConfirm, onCountChange }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await reportService.listReports(eventId);
      setReports(res.data.data.reports);
      onCountChange?.(res.data.data.reports.length);
    } catch {
      toast.error("Couldn't load reports");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (report, action) => {
    setBusyId(report.photoId);
    try {
      await reportService.resolveReports(eventId, report.photoId, action);
      const next = reports.filter((r) => r.photoId !== report.photoId);
      setReports(next);
      onCountChange?.(next.length);
      toast.success(action === "remove" ? "Photo removed" : "Reports dismissed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't update this report");
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemove = (report) =>
    onRequestConfirm({
      title: "Remove this photo?",
      message: "It's deleted for everyone and can't be restored.",
      confirmLabel: "Remove photo",
      danger: true,
      onConfirm: () => resolve(report, "remove"),
    });

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-4 shadow-card">
        <RowsSkeleton rows={3} />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface shadow-card">
        <EmptyState
          icon={Flag}
          title="Nothing reported"
          description="If a participant flags a photo, it shows up here for you to review."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {reports.map((r) => (
        <div key={r.photoId} className="flex flex-wrap gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card">
          <img src={r.thumbnailUrl} alt="" className="h-28 w-28 shrink-0 rounded-xl object-cover" />

          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-sm font-medium text-text">
                Reported {r.count} time{r.count === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-text-muted">
                {r.album === "OFFICIAL" ? "Official" : "Community"} album
                {r.uploaderName ? ` · uploaded by ${r.uploaderName}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {r.reasons.map((reason) => (
                <span key={reason} className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                  {REPORT_REASON_LABELS[reason] || reason}
                </span>
              ))}
            </div>

            {r.notes.length > 0 && (
              <ul className="space-y-1">
                {r.notes.slice(0, 3).map((n, i) => (
                  <li key={i} className="border-l-2 border-border pl-2.5 text-xs italic text-text-muted">
                    “{n}”
                  </li>
                ))}
                {r.notes.length > 3 && <li className="text-xs text-text-muted">+{r.notes.length - 3} more notes</li>}
              </ul>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => confirmRemove(r)}
                disabled={busyId === r.photoId}
                className="rounded-xl bg-error px-3.5 py-2 text-sm font-medium text-white transition hover:bg-error/90 disabled:opacity-50"
              >
                Remove photo
              </button>
              <button
                onClick={() => resolve(r, "dismiss")}
                disabled={busyId === r.photoId}
                className="rounded-xl border border-border px-3.5 py-2 text-sm text-text transition hover:bg-surface-sunken disabled:opacity-50"
              >
                Keep photo
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}