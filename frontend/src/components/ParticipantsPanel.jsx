import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import toast from "react-hot-toast";
import * as eventService from "../services/eventService";

export default function ParticipantsPanel({ eventId, isOrganizer, onChanged }) {
  const [participants, setParticipants] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const load = () =>
    eventService.getParticipants(eventId, { search }).then((res) => {
      setParticipants(res.data.data.participants);
      setTotal(res.data.data.total);
    });

  useEffect(() => {
    load();
  }, [eventId, search]);

  const handleRemove = async (userId) => {
    // remove instantly, restore if the request fails
    const snapshot = { participants, total };
    setParticipants((prev) => prev.filter((p) => p.userId?._id !== userId));
    setTotal((t) => Math.max(0, t - 1));
    try {
      await eventService.removeParticipant(eventId, userId);
      toast.success("Participant removed");
      onChanged?.();
    } catch (err) {
      setParticipants(snapshot.participants);
      setTotal(snapshot.total);
      toast.error(err.response?.data?.message || "Failed to remove participant");
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">Participants ({total})</h2>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 text-text-muted" size={14} />
          <input
            className="pl-7 pr-3 py-1.5 rounded-lg bg-surface-sunken border border-border text-sm"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="divide-y divide-border">
        {participants.map((p) => (
          <div key={p._id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm">{p.userId?.name}</p>
              {p.userId?.email && <p className="text-xs text-text-muted">{p.userId.email}</p>}
            </div>
            {isOrganizer && (
              <button
                onClick={() => handleRemove(p.userId?._id)}
                className="text-text-muted hover:text-error"
                aria-label="Remove participant"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        {participants.length === 0 && (
          <p className="text-text-muted text-sm py-6 text-center">No participants found.</p>
        )}
      </div>
    </div>
  );
}