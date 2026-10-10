import { useEffect, useState } from "react";
import { Ban, ChevronRight, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import * as eventService from "../services/eventService";
import InlineActions from "./InlineActions";
import RowsSkeleton from "./RowsSkeleton";

export default function PhotographersPanel({ eventId, isOrganizer, onChanged, active = true }) {
  const [photographers, setPhotographers] = useState([]);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = () =>
    eventService
      .listPhotographers(eventId)
      .then((res) => setPhotographers(res.data.data.photographers))
      .catch(() => { })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [eventId, active]);
  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await eventService.addPhotographer(eventId, email);
      toast.success("Photographer added");
      setEmail("");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add photographer");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId) => {
    const snapshot = photographers;
    setPhotographers((prev) => prev.filter((p) => p.userId?._id !== userId));
    try {
      await eventService.removePhotographer(eventId, userId);
      toast.success("Photographer removed");
      onChanged?.();
    } catch (err) {
      setPhotographers(snapshot);
      toast.error(err.response?.data?.message || "Failed to remove photographer");
    }
  };

  const handleSetUpload = async (userId, canUpload) => {
    const snapshot = photographers;
    setPhotographers((prev) => prev.map((p) => (p.userId?._id === userId ? { ...p, canUpload } : p)));
    try {
      await eventService.setPhotographerPermission(eventId, userId, canUpload);
      toast.success(canUpload ? "Uploads allowed" : "Uploads paused");
    } catch (err) {
      setPhotographers(snapshot);
      toast.error(err.response?.data?.message || "Failed to update permission");
    }
  };

  const actionsFor = (p) => {
    const uid = p.userId?._id;
    return [
      p.canUpload
        ? {
          key: "pause",
          label: "Pause uploads",
          icon: Ban,
          confirm: "Pause uploads?",
          onRun: () => handleSetUpload(uid, false),
        }
        : {
          key: "allow",
          label: "Allow uploads",
          icon: Upload,
          onRun: () => handleSetUpload(uid, true),
        },
      {
        key: "remove",
        label: "Remove",
        icon: Trash2,
        danger: true,
        confirm: "Remove photographer?",
        onRun: () => handleRemove(uid),
      },
    ];
  };

  const statusChip = (p) => (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${p.canUpload ? "bg-emerald-50 text-emerald-700" : "bg-surface-sunken text-text-muted"
        }`}
    >
      {p.canUpload ? "Can upload" : "View only"}
    </span>
  );

  return (
    <div className="max-w-2xl">
      <h2 className="mb-4 font-medium">Photographers ({photographers.length})</h2>

      {isOrganizer && (
        <form onSubmit={handleAdd} className="mb-6 flex gap-2">
          <input
            type="email"
            required
            placeholder="Photographer's registered email"
            className="flex-1 rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </form>
      )}
      {loading && <RowsSkeleton />}
      <div className="divide-y divide-border">
        {photographers.map((p) => {
          const uid = p.userId?._id;
          const isOpen = openId === uid;

          const info = (
            <>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {p.userId?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm">
                  <span className="truncate">{p.userId?.name}</span>
                  {statusChip(p)}
                </p>
                {p.userId?.email && <p className="truncate text-xs text-text-muted">{p.userId.email}</p>}
              </div>
              {isOrganizer && (
                <ChevronRight
                  size={16}
                  className={`shrink-0 text-text-muted transition-transform ${isOpen ? "rotate-90" : ""}`}
                />
              )}
            </>
          );

          return (
            <div key={p._id} className="flex animate-fade-in flex-wrap items-center gap-x-3 gap-y-2 py-3">
              {isOrganizer ? (
                <button
                  onClick={() => setOpenId(isOpen ? null : uid)}
                  aria-expanded={isOpen}
                  className={`-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1 text-left transition hover:bg-surface-sunken ${isOpen ? "sm:flex-none" : ""
                    }`}
                >
                  {info}
                </button>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-3">{info}</div>
              )}

              {isOpen && (
                <div className="w-full sm:ml-auto sm:w-auto">
                  <InlineActions actions={actionsFor(p)} onDone={() => setOpenId(null)} />
                </div>
              )}
            </div>
          );
        })}
        {!loading && photographers.length === 0 && (
          <p className="py-6 text-center text-sm text-text-muted">No photographers assigned yet.</p>
        )}
      </div>
    </div>
  );
}