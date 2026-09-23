import { useEffect, useState } from "react";
import * as paymentService from "../services/paymentService";
import * as photoService from "../services/photoService";
import toast from "react-hot-toast";
import BackButton from "../components/BackButton";
import { triggerBlobDownload, filenameFromContentDisposition } from "../utils/download";

export default function PurchaseHistory() {
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    paymentService.listMyPurchases().then((res) => setPurchases(res.data.data.purchases));
  }, []);

  const handleDownload = async (photoId) => {
    try {
      const res = await photoService.downloadPhoto(photoId);
      const filename = filenameFromContentDisposition(res.headers["content-disposition"], `photo_${photoId}.jpg`);
      triggerBlobDownload(res.data, filename);
      toast.success("Download started");
    } catch (err) {
      toast.error(err.response?.data?.message || "Download failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <BackButton />
      <h1 className="text-2xl font-semibold mb-6">Purchase History</h1>

      <div className="divide-y divide-border bg-surface/30 rounded-xl border border-border">
        {purchases.map((p) => (
          <div key={p._id} className="flex items-center gap-4 p-4">
            {p.photoId?.thumbnailUrl && (
              <img src={p.photoId.thumbnailUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
            )}
            <div className="flex-1 text-sm">
              <p>{p.eventId?.title}</p>
              <p className="text-xs text-text-muted">
                Purchased {new Date(p.purchasedAt).toLocaleDateString()} · ₹{(p.amountPaid / 100).toFixed(2)}
              </p>
            </div>
            {p.photoId && (
              <button
                onClick={() => handleDownload(p.photoId._id)}
                className="text-xs bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg transition"
              >
                Download Again
              </button>
            )}
          </div>
        ))}
        {purchases.length === 0 && (
          <p className="text-text-muted text-sm p-8 text-center">No purchases yet.</p>
        )}
      </div>
    </div>
  );
}
