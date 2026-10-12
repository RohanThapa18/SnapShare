import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  KeyRound,
  Camera,
  CalendarDays,
  FolderOpen,
  MapPin,
  Search,
  Crown,
  Users,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  LayoutGrid,
  Rows3,
  List,
  Clock,
} from "lucide-react";

import * as eventService from "../services/eventService";
import { useAuth } from "../context/AuthContext";
import JoinEventModal from "../components/JoinEventModal";
import JoinAsPhotographerModal from "../components/JoinAsPhotographerModal";
import EmptyState from "../components/EmptyState";

const ROLE_META = {
  organizing: {
    label: "Organizer",
    icon: Crown,
    chip: "bg-amber-50/95 text-amber-700 ring-amber-200",
  },
  photographing: {
    label: "Photographer",
    icon: Camera,
    chip: "bg-indigo-50/95 text-indigo-700 ring-indigo-200",
  },
  joined: {
    label: "Participant",
    icon: Users,
    chip: "bg-emerald-50/95 text-emerald-700 ring-emerald-200",
  },
};

const VIEWS = [
  { key: "grid", label: "Grid", icon: LayoutGrid },
  { key: "compact", label: "Compact", icon: Rows3 },
  { key: "list", label: "List", icon: List },
];

const SORTS = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "az", label: "A – Z" },
];

const formatDate = (date) =>
  new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const daysUntil = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
};

const readSavedView = () => {
  try {
    const v = localStorage.getItem("snapshare:dashboardView");
    return VIEWS.some((x) => x.key === v) ? v : "grid";
  } catch {
    return "grid";
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [events, setEvents] = useState({
    organized: [],
    photographing: [],
    joined: [],
  });

  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showPhotographerModal, setShowPhotographerModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState(readSavedView);

  const changeView = (key) => {
    setView(key);
    try {
      localStorage.setItem("snapshare:dashboardView", key);
    } catch {
      /* ignore */
    }
  };

  const loadEverything = () => {
    setLoading(true);

    eventService
      .listMyEvents()
      .then((res) => {
        setEvents(res.data.data);
      })
      .catch((error) => {
        console.error("Unable to load events:", error);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEverything();
  }, []);

  const handleJoined = (eventId) => {
    setShowJoinModal(false);
    setShowPhotographerModal(false);
    navigate(`/events/${eventId}`);
    const allEvents = [
      ...events.organized,
      ...events.photographing,
      ...events.joined,
    ];

    const joinedEvent = allEvents.find((event) => event._id === eventId);

    if (joinedEvent?.slug) {
      navigate(`/events/${joinedEvent.slug}`);
    } else {
      loadEverything();
    }
  };

  const counts = {
    all:
      events.organized.length +
      events.photographing.length +
      events.joined.length,
    organizing: events.organized.length,
    photographing: events.photographing.length,
    joined: events.joined.length,
  };

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (e) =>
      !q ||
      e.title?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q);

    const sorter = (a, b) => {
      if (sort === "az") return (a.title || "").localeCompare(b.title || "");
      if (sort === "oldest") return new Date(a.date) - new Date(b.date);
      return new Date(b.date) - new Date(a.date);
    };

    const all = [
      { key: "organizing", title: "Organizing", items: events.organized },
      { key: "photographing", title: "Photographing", items: events.photographing },
      { key: "joined", title: "Joined", items: events.joined },
    ];

    return all
      .filter((s) => filter === "all" || filter === s.key)
      .map((s) => ({ ...s, items: s.items.filter(match).sort(sorter) }))
      .filter((s) => s.items.length);
  }, [events, filter, query, sort]);

  const StatusPill = ({ status, solid = true }) => {
    const active = status === "ACTIVE";

    // Frosted glass, for use on top of cover images
    const glass = active
      ? "bg-emerald-400/25 text-white ring-1 ring-white/50"
      : "bg-slate-900/25 text-white ring-1 ring-white/30";

    // Tinted glass, for use on white backgrounds (list view)
    const tinted = active
      ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/30"
      : "bg-slate-500/10 text-slate-600 ring-1 ring-slate-400/30";

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md backdrop-saturate-150 ${solid
            ? `${glass} shadow-[0_4px_16px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.45)] [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]`
            : `${tinted} shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]`
          }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${active
              ? solid
                ? "animate-pulse bg-emerald-300 shadow-[0_0_8px_2px_rgba(110,231,183,0.9)]"
                : "animate-pulse bg-emerald-500 shadow-[0_0_6px_1px_rgba(16,185,129,0.6)]"
              : "bg-slate-300"
            }`}
        />
        {status}
      </span>
    );
  };

  const RoleChip = ({ roleKey }) => {
    const role = ROLE_META[roleKey];
    const Icon = role.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 backdrop-blur ${role.chip}`}
      >
        <Icon size={12} />
        {role.label}
      </span>
    );
  };

  const Cover = ({ event, iconSize = 34 }) =>
    event.coverImageUrl ? (
      <img
        src={event.coverImageUrl}
        alt=""
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-100 to-rose-50">
        <FolderOpen
          size={iconSize}
          strokeWidth={1.5}
          className="text-slate-400 transition-colors duration-300 group-hover:text-indigo-500"
        />
      </div>
    );

  const cardShell =
    "group relative flex overflow-hidden border border-white/80 bg-white ring-1 ring-slate-200/70 transition-all duration-300 ease-out hover:ring-indigo-300/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30";

  /* ---------------- GRID card ---------------- */
  const renderGridCard = (event, roleKey) => (
    <Link
      key={`${roleKey}-${event._id}`}
      to={`/events/${event.slug}`}
      className={`${cardShell} flex-col rounded-2xl shadow-[0_2px_8px_rgba(30,41,59,0.05)] hover:-translate-y-1.5 hover:shadow-[0_18px_40px_rgba(38,52,95,0.16)]`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <Cover event={event} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 to-transparent" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between">
          <RoleChip roleKey={roleKey} />
          <StatusPill status={event.status} />
        </div>
        <span className="absolute bottom-3 right-3 flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-white/95 text-[#26345f] opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight size={18} />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="truncate text-[17px] font-semibold leading-tight text-slate-900 transition-colors group-hover:text-indigo-700">
          {event.title}
        </h3>
        <div className="mt-auto flex items-center justify-between gap-3 text-xs font-medium text-slate-500">
          <span className="flex shrink-0 items-center gap-1.5">
            <CalendarDays size={14} className="text-indigo-400" />
            {formatDate(event.date)}
          </span>
          {event.location && (
            <span className="flex min-w-0 items-center gap-1" title={event.location}>
              <MapPin size={14} className="shrink-0 text-rose-400" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );

  /* ---------------- COMPACT card ---------------- */
  const renderCompactCard = (event, roleKey) => {
    const Icon = ROLE_META[roleKey].icon;
    return (
      <Link
        key={`${roleKey}-${event._id}`}
        to={`/events/${event.slug}`}
        className={`${cardShell} flex-col rounded-xl shadow-sm hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(38,52,95,0.14)]`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <Cover event={event} iconSize={26} />
          <span
            title={ROLE_META[roleKey].label}
            className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[#26345f] shadow"
          >
            <Icon size={14} />
          </span>
          <span
            className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-white ${event.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"
              }`}
            title={event.status}
          />
        </div>
        <div className="p-3">
          <h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
            {event.title}
          </h3>
          <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
            {formatDate(event.date)}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
      </Link>
    );
  };

  /* ---------------- LIST row ---------------- */
  const renderListRow = (event, roleKey) => (
    <Link
      key={`${roleKey}-${event._id}`}
      to={`/events/${event.slug}`}
      className={`${cardShell} items-center gap-4 rounded-2xl p-3 shadow-sm hover:translate-x-1 hover:shadow-[0_10px_26px_rgba(38,52,95,0.12)] sm:p-3.5`}
    >
      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-[72px] sm:w-32">
        <Cover event={event} iconSize={22} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-indigo-700">
            {event.title}
          </h3>
          <span className="hidden sm:inline-flex">
            <RoleChip roleKey={roleKey} />
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={13} className="text-indigo-400" />
            {formatDate(event.date)}
          </span>
          {event.location && (
            <span className="flex min-w-0 items-center gap-1">
              <MapPin size={13} className="shrink-0 text-rose-400" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
        </div>
      </div>

      <div className="hidden shrink-0 sm:block">
        <StatusPill status={event.status} solid={false} />
      </div>
      <ArrowRight
        size={18}
        className="shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-indigo-500"
      />
    </Link>
  );

  const renderItem = (event, roleKey) =>
    view === "list"
      ? renderListRow(event, roleKey)
      : view === "compact"
        ? renderCompactCard(event, roleKey)
        : renderGridCard(event, roleKey);

  const gridClass =
    view === "list"
      ? "flex flex-col gap-3"
      : view === "compact"
        ? "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
        : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3";

  /* ---------------- Background ---------------- */
  const Background = () => (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#eef0fb] via-[#f6f7fc] to-[#fbf7f5]" />
      <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-300/30 blur-3xl" />
      <div className="absolute -right-24 top-24 h-[24rem] w-[24rem] rounded-full bg-rose-200/40 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-[26rem] w-[26rem] rounded-full bg-sky-200/30 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(rgba(38,52,95,0.13) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 55%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 55%)",
        }}
      />
    </div>
  );

  /* ---------------- Loading ---------------- */
  if (loading) {
    return (
      <div className="relative min-h-screen">
        <Background />
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
          <div className="mb-3 h-9 w-72 animate-pulse rounded-lg bg-slate-200/80" />
          <div className="mb-8 h-4 w-56 animate-pulse rounded bg-slate-200/70" />
          <div className="mb-10 h-56 animate-pulse rounded-3xl bg-slate-200/70" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-white bg-white shadow-sm">
                <div className="aspect-[16/10] animate-pulse bg-slate-100" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasNoEvents = counts.all === 0;
  const firstName = user?.name?.split(" ")[0];

  const tabs = [
    { key: "all", label: "All" },
    { key: "organizing", label: "Organizing" },
    { key: "photographing", label: "Photographing" },
    { key: "joined", label: "Joined" },
  ];

  const stats = [
    { label: "Organizing", value: counts.organizing, icon: Crown, tone: "text-amber-600 bg-amber-50" },
    { label: "Photographing", value: counts.photographing, icon: Camera, tone: "text-indigo-600 bg-indigo-50" },
    { label: "Joined", value: counts.joined, icon: Users, tone: "text-emerald-600 bg-emerald-50" },
  ];

  const ghostBtn =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-white hover:text-indigo-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 active:scale-[0.98]";

  return (
    <div className="relative min-h-screen">
      <Background />

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        {/* ============ HERO ============ */}
        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {greeting()}
              {firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              {hasNoEvents
                ? "Create an event or join one to get started."
                : `You have ${counts.all} event${counts.all === 1 ? "" : "s"} across all your roles.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/events/create"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#2f3f73] to-[#1d284a] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(38,52,95,0.30)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(38,52,95,0.38)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 active:scale-[0.98]"
            >
              <Plus size={18} />
              Create Event
            </Link>
            <button type="button" onClick={() => setShowJoinModal(true)} className={ghostBtn}>
              <KeyRound size={16} />
              Join Event
            </button>
            <button type="button" onClick={() => setShowPhotographerModal(true)} className={ghostBtn}>
              <Camera size={16} />
              Join as Photographer
            </button>
          </div>
        </header>

        {!hasNoEvents && (
          <>
            {/* ============ STATS ============ */}
            <div className="mb-8 grid grid-cols-3 gap-3 sm:gap-4">
              {stats.map(({ label, value, icon: Icon, tone }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 p-3 shadow-sm ring-1 ring-slate-200/60 backdrop-blur sm:p-4"
                >
                  <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${tone}`}>
                    <Icon size={19} />
                  </span>
                  <div>
                    <p className="text-2xl font-semibold leading-none text-slate-900">{value}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ============ TOOLBAR ============ */}
            <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div
                role="tablist"
                className="flex w-full gap-1 overflow-x-auto rounded-xl bg-white/80 p-1 shadow-sm ring-1 ring-slate-200/70 backdrop-blur lg:w-auto"
              >
                {tabs.map((t) => {
                  const selected = filter === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setFilter(t.key)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${selected
                          ? "bg-[#26345f] text-white shadow"
                          : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                        }`}
                    >
                      {t.label}
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${selected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                          }`}
                      >
                        {counts[t.key]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-64">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search events or locations"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white/90 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    aria-label="Sort events"
                    className="h-11 flex-1 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 sm:flex-none"
                  >
                    {SORTS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>

                  {/* View switcher */}
                  <div className="flex gap-1 rounded-xl bg-white/80 p-1 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
                    {VIEWS.map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        title={`${label} view`}
                        aria-label={`${label} view`}
                        aria-pressed={view === key}
                        onClick={() => changeView(key)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${view === key
                            ? "bg-[#26345f] text-white shadow"
                            : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                          }`}
                      >
                        <Icon size={17} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============ SECTIONS ============ */}
        {sections.map((section) => {
          const Icon = ROLE_META[section.key].icon;
          return (
            <section key={section.key} className="mb-12">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#26345f] shadow-sm ring-1 ring-slate-200">
                  <Icon size={16} />
                </span>
                <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                  {section.items.length}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-300/70 to-transparent" />
              </div>

              <div className={gridClass}>
                {section.items.map((event) => renderItem(event, section.key))}
              </div>
            </section>
          );
        })}

        {!hasNoEvents && sections.length === 0 && (
          <EmptyState
            icon={Search}
            title="No matching events"
            description="Try a different search or switch the filter."
            action={
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
                className={ghostBtn}
              >
                Clear filters
              </button>
            }
          />
        )}

        {hasNoEvents && (
          <EmptyState
            icon={FolderOpen}
            title="No events yet"
            description="Create your own event, or use a code/QR from someone else's to join one."
            action={
              <Link
                to="/events/create"
                className="inline-flex items-center gap-2 rounded-xl bg-[#26345f] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1d284a] hover:shadow-md active:scale-[0.98]"
              >
                <Plus size={16} />
                Create Event
              </Link>
            }
          />
        )}

        {showJoinModal && (
          <JoinEventModal onClose={() => setShowJoinModal(false)} onJoined={handleJoined} />
        )}

        {showPhotographerModal && (
          <JoinAsPhotographerModal onClose={() => setShowPhotographerModal(false)} onJoined={handleJoined} />
        )}
      </div>
    </div>
  );
}