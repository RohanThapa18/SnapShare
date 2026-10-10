import { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import * as eventService from "../services/eventService";

export default function PhotographersPanel({ eventId, isOrganizer, onChanged }) {
  const [photographers, setPhotographers] = useState([]);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const load = () =>
    eventService.listPhotographers(eventId).then((res) => setPhotographers(res.data.data.photographers));

  useEffect(() => {
    load();
  }, [eventId]);

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

  const handleTogglePermission = async (userId, current) => {
    const snapshot = photographers;
    setPhotographers((prev) =>
      prev.map((p) => (p.userId?._id === userId ? { ...p, canUpload: !current } : p))
    );
    try {
      await eventService.setPhotographerPermission(eventId, userId, !current);
    } catch (err) {
      setPhotographers(snapshot);
      toast.error(err.response?.data?.message || "Failed to update permission");
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="font-medium mb-4">Photographers ({photographers.length})</h2>

      {isOrganizer && (
        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            type="email"
            required
            placeholder="Photographer's registered email"
            className="flex-1 px-3 py-2 rounded-lg bg-surface-sunken border border-border text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            disabled={adding}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </form>
      )}

      <div className="divide-y divide-border">
        {photographers.map((p) => (
          <div key={p._id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm">{p.userId?.name}</p>
              {p.userId?.email && <p className="text-xs text-text-muted">{p.userId.email}</p>}
            </div>
            <div className="flex items-center gap-3">
              {isOrganizer ? (
                <>
                  <label className="flex items-center gap-1 text-xs text-text-muted">
                    <input
                      type="checkbox"
                      checked={p.canUpload}
                      onChange={() => handleTogglePermission(p.userId?._id, p.canUpload)}
                    />
                    Can upload
                  </label>
                  <button
                    onClick={() => handleRemove(p.userId?._id)}
                    className="text-text-muted hover:text-error"
                    aria-label="Remove photographer"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <span className="text-xs text-text-muted">{p.canUpload ? "Can upload" : "View only"}</span>
              )}
            </div>
          </div>
        ))}
        {photographers.length === 0 && (
          <p className="text-text-muted text-sm py-6 text-center">No photographers assigned yet.</p>
        )}
      </div>
    </div>
  );
}