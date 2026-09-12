import { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import * as eventService from "../services/eventService";

export default function PhotographersPanel({ eventId }) {
  const [photographers, setPhotographers] = useState([]);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const load = () => eventService.listPhotographers(eventId).then((res) => setPhotographers(res.data.data.photographers));

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
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add photographer");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId) => {
    await eventService.removePhotographer(eventId, userId);
    load();
  };

  const handleTogglePermission = async (userId, current) => {
    await eventService.setPhotographerPermission(eventId, userId, !current);
    load();
  };

  return (
    <div className="max-w-2xl">
      <h2 className="font-medium mb-4">Photographers</h2>

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
          Add
        </button>
      </form>

      <div className="divide-y divide-border">
        {photographers.map((p) => (
          <div key={p._id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm">{p.userId?.name}</p>
              <p className="text-xs text-text-muted">{p.userId?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-xs text-text-muted">
                <input
                  type="checkbox"
                  checked={p.canUpload}
                  onChange={() => handleTogglePermission(p.userId?._id, p.canUpload)}
                />
                Can upload
              </label>
              <button onClick={() => handleRemove(p.userId?._id)} className="text-text-muted hover:text-error">
                <X size={16} />
              </button>
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
