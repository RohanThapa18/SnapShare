import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as paymentService from "../services/paymentService";

const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const mask = (id) => id.replace(/^(.{2}).*(@.*)$/, "$1•••$2");

export default function PayoutSettings() {
  const [saved, setSaved] = useState(null);
  const [upiId, setUpiId] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    paymentService
      .getMyUpi()
      .then((r) => {
        const id = r.data.data.upiId;
        setSaved(id);
        setUpiId(id || "");
        setEditing(!id);
      })
      .catch(() => setEditing(true))
      .finally(() => setLoading(false));
  }, []);

  const valid = UPI_RE.test(upiId.trim());

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return toast.error("That doesn't look like a valid UPI ID (e.g. name@okaxis)");
    setSaving(true);
    try {
      const res = await paymentService.saveMyUpi(upiId.trim());
      setSaved(res.data.data.upiId);
      setEditing(false);
      toast.success("UPI ID saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save UPI ID");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-28 animate-pulse rounded-2xl border border-border bg-surface-sunken" />;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="mb-3">
        <h2 className="font-display text-lg text-text">Get paid for your photos</h2>
        <p className="text-sm text-text-muted">
          Buyers pay SnapShare, and we send your earnings to this UPI ID.
        </p>
      </div>

      {!editing && saved ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-sunken px-4 py-3">
          <div>
            <p className="text-xs text-text-muted">Payouts go to</p>
            <p className="text-sm font-medium text-text">{mask(saved)}</p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-text transition hover:bg-surface"
          >
            Change
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <div className="flex gap-2">
            <input
              required
              name="payout_upi"
              type="text"
              placeholder="yourname@okaxis"
              value={upiId}
              autoComplete="off"
              onChange={(e) => setUpiId(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary"
            />
            <button
              disabled={saving || !valid}
              className="rounded-xl bg-primary px-5 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {saved && (
              <button
                type="button"
                onClick={() => { setUpiId(saved); setEditing(false); }}
                className="rounded-xl border border-border px-4 text-sm text-text transition hover:bg-surface-sunken"
              >
                Cancel
              </button>
            )}
          </div>
          {!saved && (
            <p className="text-xs text-text-muted">
              Buyers can't purchase your paid photos until you add a UPI ID.
            </p>
          )}
        </form>
      )}
    </div>
  );
}