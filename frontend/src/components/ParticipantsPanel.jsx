import { useEffect, useState } from "react";
import { ChevronRight, Crown, Search, UserMinus, ShieldMinus } from "lucide-react";
import toast from "react-hot-toast";
import * as eventService from "../services/eventService";
import InlineActions from "./InlineActions";
import RowsSkeleton from "./RowsSkeleton";

export default function ParticipantsPanel({ eventId, isOrganizer, isPrimaryOrganizer, onChanged, active = true }) {
  const [participants, setParticipants] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = () =>
    eventService
      .getParticipants(eventId, { search })
      .then((res) => {
        setParticipants(res.data.data.participants);
        setTotal(res.data.data.total);
      })
      .catch(() => { })
      .finally(() => setLoading(false));

  // re-runs silently when the tab becomes visible again, so data is never stale
  useEffect(() => {
    load();
  }, [eventId, search, active]);

  const patchParticipant = (userId, patch) =>
    setParticipants((prev) => prev.map((p) => (p.userId?._id === userId ? { ...p, ...patch } : p)));

  const handleMakeOrganizer = async (userId) => {
    patchParticipant(userId, { isOrganizer: true });
    try {
      await eventService.addCoOrganizer(eventId, userId);
      toast.success("They're now an organizer of this event");
      onChanged?.();
    } catch (err) {
      patchParticipant(userId, { isOrganizer: false });
      toast.error(err.response?.data?.message || "Couldn't make organizer");
    }
  };

  const handleRemoveOrganizerRole = async (userId) => {
    patchParticipant(userId, { isOrganizer: false });
    try {
      await eventService.removeCoOrganizer(eventId, userId);
      toast.success("Organizer role removed");
      onChanged?.();
    } catch (err) {
      patchParticipant(userId, { isOrganizer: true });
      toast.error(err.response?.data?.message || "Couldn't remove organizer role");
    }
  };

  const handleRemove = async (userId) => {
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

  const actionsFor = (p) => {
    const uid = p.userId?._id;
    const list = [];

    if (isOrganizer && !p.isOrganizer) {
      list.push({
        key: "promote",
        label: "Make organizer",
        icon: Crown,
        confirm: "Make organizer?",
        onRun: () => handleMakeOrganizer(uid),
      });
    }
    if (isPrimaryOrganizer && p.isOrganizer && !p.isPrimaryOrganizer) {
      list.push({
        key: "demote",
        label: "Remove organizer role",
        icon: ShieldMinus,
        confirm: "Remove organizer role?",
        onRun: () => handleRemoveOrganizerRole(uid),
      });
    }
    if (isOrganizer && !p.isPrimaryOrganizer && (!p.isOrganizer || isPrimaryOrganizer)) {
      list.push({
        key: "remove",
        label: "Remove",
        icon: UserMinus,
        danger: true,
        confirm: "Remove from event?",
        onRun: () => handleRemove(uid),
      });
    }
    return list;
  };

  const roleBadge = (p) =>
    p.isOrganizer && (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
        <Crown size={10} />
        {p.isPrimaryOrganizer ? "Owner" : "Organizer"}
      </span>
    );

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-medium">Participants ({total})</h2>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 text-text-muted" size={14} />
          <input
            className="rounded-lg border border-border bg-surface-sunken py-1.5 pl-7 pr-3 text-sm"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {loading && <RowsSkeleton />}
      <div className="divide-y divide-border">
        {participants.map((p) => {
          const uid = p.userId?._id;
          const actions = actionsFor(p);
          const interactive = actions.length > 0;
          const isOpen = openId === uid;

          const info = (
            <>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {p.userId?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm">
                  <span className="truncate">{p.userId?.name}</span>
                  {roleBadge(p)}
                </p>
                {p.userId?.email && <p className="truncate text-xs text-text-muted">{p.userId.email}</p>}
              </div>
              {interactive && (
                <ChevronRight
                  size={16}
                  className={`shrink-0 text-text-muted transition-transform ${isOpen ? "rotate-90" : ""}`}
                />
              )}
            </>
          );

          return (
                       <div key={p._id} className="flex animate-fade-in flex-wrap items-center gap-x-3 gap-y-2 py-3">
              {interactive ? (
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
                  <InlineActions actions={actions} onDone={() => setOpenId(null)} />
                </div>
              )}
            </div>
          );
        })}
        {!loading && participants.length === 0 && (
          <p className="py-6 text-center text-sm text-text-muted">No participants found.</p>
        )}
      </div>
    </div>
  );
}