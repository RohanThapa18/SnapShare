
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  KeyRound,
  Camera,
  CalendarDays,
  FolderOpen,
  ArrowUpRight,
} from "lucide-react";

import * as eventService from "../services/eventService";
import JoinEventModal from "../components/JoinEventModal";
import JoinAsPhotographerModal from "../components/JoinAsPhotographerModal";
import EmptyState from "../components/EmptyState";

export default function Dashboard() {
  const navigate = useNavigate();

  const [events, setEvents] = useState({
    organized: [],
    photographing: [],
    joined: [],
  });

  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showPhotographerModal, setShowPhotographerModal] = useState(false);

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

    const joinedEvent = allEvents.find(
      (event) => event._id === eventId
    );

    if (joinedEvent?.slug) {
      navigate(`/events/${joinedEvent.slug}`);
    } else {
      loadEverything();
    }
  };

  const renderCard = (event) => (
    <Link
      key={event._id}
      to={`/events/${event.slug}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_12px_30px_rgba(30,41,59,0.10)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20"
    >
      <div className="aspect-video overflow-hidden bg-slate-100">
        {event.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 transition-colors duration-300 group-hover:bg-indigo-50">
            <FolderOpen
              size={32}
              strokeWidth={1.5}
              className="text-slate-400 transition-colors duration-300 group-hover:text-indigo-500"
            />
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="truncate text-base font-semibold text-slate-800 transition-colors duration-200 group-hover:text-indigo-700">
          {event.title}
        </h3>

        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <CalendarDays size={13} />
          {new Date(event.date).toLocaleDateString()} · {event.status}
        </p>
      </div>
    </Link>
  );
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 h-8 w-48 animate-pulse rounded-lg bg-slate-200" />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="aspect-video animate-pulse bg-slate-100" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasNoEvents =
    !events.organized.length &&
    !events.photographing.length &&
    !events.joined.length;

  const actionButton =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 active:scale-[0.98]";

  const renderSection = (title, sectionEvents) => {
    if (!sectionEvents.length) return null;

    return (
      <section className="mb-12">
        <div className="mb-5 flex items-center gap-4">
          <h2 className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </h2>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sectionEvents.map(renderCard)}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      <div className="mx-auto max-w-7xl px-5 py-9 sm:px-8 lg:px-10 lg:py-12">
        {/* Header and existing actions */}
        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Your Events
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/events/create"
              className={`${actionButton} bg-[#26345f] text-white shadow-sm hover:-translate-y-0.5 hover:bg-[#1d284a] hover:shadow-md`}
            >
              <Plus size={17} />
              Create Event
            </Link>

            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className={`${actionButton} border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-sm`}
            >
              <KeyRound size={16} />
              Join Event
            </button>

            <button
              type="button"
              onClick={() => setShowPhotographerModal(true)}
              className={`${actionButton} border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-sm`}
            >
              <Camera size={16} />
              Join as Photographer
            </button>
          </div>
        </div>

        {/* Existing event sections */}
        {renderSection("Organizing", events.organized)}
        {renderSection("Photographing", events.photographing)}
        {renderSection("Joined", events.joined)}

        {/* Empty state */}
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

        {/* Existing modals */}
        {showJoinModal && (
          <JoinEventModal
            onClose={() => setShowJoinModal(false)}
            onJoined={handleJoined}
          />
        )}

        {showPhotographerModal && (
          <JoinAsPhotographerModal
            onClose={() => setShowPhotographerModal(false)}
            onJoined={handleJoined}
          />
        )}
      </div>
    </div>
  );
}
