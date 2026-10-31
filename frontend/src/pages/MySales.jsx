import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Camera, Users, Wallet, Clock, Check } from "lucide-react";
import toast from "react-hot-toast";
import * as paymentService from "../services/paymentService";
import BackButton from "../components/BackButton";
import EmptyState from "../components/EmptyState";
import RowsSkeleton from "../components/RowsSkeleton";

const rupees = (n) => `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function StatCard({ icon: Icon, label, value, tone = "primary" }) {
  const tones = { primary: "bg-secondary text-primary", success: "bg-success/10 text-success", accent: "bg-accent/20 text-primary" };
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon size={17} />
      </div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="font-display text-xl text-text">{value}</p>
    </div>
  );
}

function Avatar({ name, url }) {
  if (url) return <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />;
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-primary">
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

export default function MySales() {
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState([]);
  const [hasUpi, setHasUpi] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (page = 1) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await paymentService.getMySales({ page, limit: 20 });
      const d = res.data.data;
      setSummary(d.summary);
      setHasUpi(d.hasUpi);
      setPagination(d.pagination);
      setSales((prev) => (page === 1 ? d.sales : [...prev, ...d.sales]));
    } catch {
      toast.error("Couldn't load your sales");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <BackButton />

      <div className="mb-6">
        <h1 className="font-display text-2xl text-text">Sales</h1>
        <p className="text-sm text-text-muted">See who bought your photos and what you're owed.</p>
      </div>

      {!loading && !hasUpi && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4">
          <p className="text-sm text-text">
            Add your UPI ID so buyers can purchase your photos and you can get paid.
          </p>
          <Link to="/profile" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover">
            Add UPI ID
          </Link>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Wallet} label="Total earned" value={loading ? "—" : rupees(summary?.earned)} />
        <StatCard icon={Check} tone="success" label="Paid out" value={loading ? "—" : rupees(summary?.paidOut)} />
        <StatCard icon={Clock} tone="accent" label="Awaiting payout" value={loading ? "—" : rupees(summary?.pending)} />
        <StatCard icon={Users} label="Buyers" value={loading ? "—" : `${summary?.buyers ?? 0}`} />
      </div>

      <div className="rounded-2xl border border-border bg-surface shadow-card">
        {loading ? (
          <div className="px-4"><RowsSkeleton rows={5} /></div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="No sales yet"
            description="Set a price on your photos in an event. When someone buys one, you'll see who here."
          />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {sales.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 p-4">
                  <Avatar name={s.buyer.name} url={s.buyer.avatarUrl} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text">
                      <span className="font-medium">{s.buyer.name}</span> bought a photo
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {s.eventTitle} · {formatDistanceToNow(new Date(s.purchasedAt), { addSuffix: true })}
                    </p>
                  </div>

                  {s.photoThumbnail && (
                    <img src={s.photoThumbnail} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  )}

                  <div className="text-right">
                    <p className="text-sm font-medium text-text">{rupees(s.amount)}</p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        s.paidOut ? "bg-success/10 text-success" : "bg-accent/20 text-primary"
                      }`}
                    >
                      {s.paidOut ? "Paid out" : "Pending"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {pagination.page < pagination.pages && (
              <div className="border-t border-border p-3 text-center">
                <button
                  onClick={() => load(pagination.page + 1)}
                  disabled={loadingMore}
                  className="rounded-xl border border-border px-4 py-2 text-sm text-text transition hover:bg-surface-sunken disabled:opacity-60"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}