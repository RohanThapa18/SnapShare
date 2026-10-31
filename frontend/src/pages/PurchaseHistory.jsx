import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import * as paymentService from "../services/paymentService";
import * as photoService from "../services/photoService";
import BackButton from "../components/BackButton";
import EmptyState from "../components/EmptyState";
import RowsSkeleton from "../components/RowsSkeleton";
import { triggerBlobDownload, filenameFromContentDisposition } from "../utils/download";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function PurchaseHistory() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    paymentService
      .listMyPurchases()
      .then((res) => setPurchases(res.data.data.purchases))
      .catch(() => toast.error("Couldn't load your purchases"))
      .finally(() => setLoading(false));
  }, []);

  const totalSpent = useMemo(
    () => purchases.reduce((sum, p) => sum + (p.amountPaid || 0), 0) / 100,
    [purchases]
  );

  const handleDownload = async (photoId) => {
    setDownloadingId(photoId);
    try {
      const res = await photoService.downloadPhoto(photoId);
      const filename = filenameFromContentDisposition(res.headers["content-disposition"], `photo_${photoId}.jpg`);
      triggerBlobDownload(res.data, filename);
      toast.success("Download started");
    } catch (err) {
      toast.error(err.response?.data?.message || "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <BackButton />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-text">Purchases</h1>
          <p className="text-sm text-text-muted">Photos you've bought. Yours to download any time.</p>
        </div>
        {purchases.length > 0 && (
          <div className="rounded-xl border border-border bg-surface px-4 py-2 text-right shadow-card">
            <p className="text-xs text-text-muted">{purchases.length} photo{purchases.length === 1 ? "" : "s"} · total spent</p>
            <p className="font-display text-lg text-primary">₹{totalSpent.toFixed(2)}</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface shadow-card">
        {loading ? (
          <div className="px-4"><RowsSkeleton rows={4} /></div>
        ) : purchases.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No purchases yet"
            description="When you buy a photo from an event, it shows up here."
            action={
              <Link to="/dashboard" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover">
                Browse your events
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {purchases.map((p) => (
              <li key={p._id} className="flex flex-wrap items-center gap-4 p-4">
                {p.photoId?.thumbnailUrl ? (
                  <img src={p.photoId.thumbnailUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-surface-sunken" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{p.eventId?.title || "Event"}</p>
                  <p className="text-xs text-text-muted">
                    {p.photographerId?.name ? `by ${p.photographerId.name} · ` : ""}
                    {fmtDate(p.purchasedAt)}
                  </p>
                </div>

                <p className="text-sm font-medium text-text">₹{(p.amountPaid / 100).toFixed(2)}</p>

                {p.photoId && (
                  <button
                    onClick={() => handleDownload(p.photoId._id)}
                    disabled={downloadingId === p.photoId._id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-medium text-white transition hover:bg-primary-hover disabled:opacity-60"
                  >
                    <Download size={14} />
                    {downloadingId === p.photoId._id ? "Preparing…" : "Download"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}