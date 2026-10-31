import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as paymentService from "../services/paymentService";
import BackButton from "../components/BackButton";
import EmptyState from "../components/EmptyState";
import RowsSkeleton from "../components/RowsSkeleton";
import { Wallet } from "lucide-react";

const rupees = (n) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminPayouts() {
  const [rows, setRows] = useState([]);
  const [refs, setRefs] = useState({});
  const [state, setState] = useState("loading"); // loading | ok | denied
  const [payingId, setPayingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await paymentService.getPendingPayouts();
      setRows(res.data.data.payouts);
      setState("ok");
    } catch (err) {
      if (err.response?.status === 403) return setState("denied");
      toast.error("Could not load payouts");
      setState("ok");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("UPI ID copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const markPaid = async (row) => {
    const reference = (refs[row.photographerId] || "").trim();
    if (reference.length < 3) return toast.error("Enter the UPI transaction id first");
    if (!window.confirm(`Mark ${rupees(row.amount)} as paid to ${row.name}? This can't be undone.`)) return;

    setPayingId(row.photographerId);
    try {
      await paymentService.markPayoutPaid(row.photographerId, reference);
      toast.success(`Recorded ${rupees(row.amount)} paid to ${row.name}`);
      setRefs((r) => ({ ...r, [row.photographerId]: "" }));
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not mark as paid");
    } finally {
      setPayingId(null);
    }
  };

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <BackButton />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-text">Pending payouts</h1>
          <p className="text-sm text-text-muted">Pay each photographer by UPI, then record the transaction here.</p>
        </div>
        {state === "ok" && rows.length > 0 && (
          <div className="rounded-xl border border-border bg-surface px-4 py-2 text-right shadow-card">
            <p className="text-xs text-text-muted">Total outstanding</p>
            <p className="font-display text-lg text-primary">{rupees(total)}</p>
          </div>
        )}
      </div>

      {state === "loading" && (
        <div className="rounded-2xl border border-border bg-surface px-4 shadow-card"><RowsSkeleton rows={3} /></div>
      )}

      {state === "denied" && (
        <div className="rounded-2xl border border-border bg-surface shadow-card">
          <EmptyState title="Admins only" description="Your account isn't allowed to view this page." />
        </div>
      )}

      {state === "ok" && rows.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface shadow-card">
          <EmptyState icon={Wallet} title="All caught up" description="Nobody is owed anything right now." />
        </div>
      )}

      <div className="space-y-3">
        {state === "ok" &&
          rows.map((r) => {
            const upiLink = r.upiId
              ? `upi://pay?pa=${encodeURIComponent(r.upiId)}&pn=${encodeURIComponent(r.name)}&am=${r.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent("SnapShare payout")}`
              : null;
            return (
              <div key={r.photographerId} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text">{r.name}</p>
                    <p className="truncate text-xs text-text-muted">{r.email} · {r.sales} sale{r.sales === 1 ? "" : "s"}</p>
                    <p className="mt-1 text-sm text-text">
                      UPI: <span className="font-medium">{r.upiId || "not set"}</span>
                      {r.upiId && (
                        <button onClick={() => copy(r.upiId)} className="ml-2 text-xs text-primary underline-offset-2 hover:underline">
                          Copy
                        </button>
                      )}
                    </p>
                  </div>
                  <p className="font-display text-xl text-primary">{rupees(r.amount)}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {upiLink && (
                    <a href={upiLink} className="rounded-xl border border-border px-3.5 py-2 text-sm text-text transition hover:bg-surface-sunken">
                      Pay in UPI app (phone)
                    </a>
                  )}
                  <input
                    placeholder="UPI transaction id"
                    value={refs[r.photographerId] || ""}
                    onChange={(e) => setRefs({ ...refs, [r.photographerId]: e.target.value })}
                    className="min-w-[200px] flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition focus:border-primary"
                  />
                  <button
                    onClick={() => markPaid(r)}
                    disabled={payingId === r.photographerId}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-60"
                  >
                    {payingId === r.photographerId ? "Saving…" : "Mark as paid"}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}