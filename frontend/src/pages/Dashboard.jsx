import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, KeyRound, Camera, CalendarDays, FolderOpen } from "lucide-react";
import * as eventService from "../services/eventService";
import * as dashboardService from "../services/dashboardService";
import JoinEventModal from "../components/JoinEventModal";
import JoinAsPhotographerModal from "../components/JoinAsPhotographerModal";
import EmptyState from "../components/EmptyState";

const StatCard = ({ label, value }) => (
  <div className="bg-surface border border-border rounded-xl p-4 shadow-card">
    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">{label}</p>
    <p className="text-xl font-semibold text-primary">{value}</p>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState({ organized: [], photographing: [], joined: [] });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showPhotographerModal, setShowPhotographerModal] = useState(false);

  const loadEverything = () => {
    Promise.all([eventService.listMyEvents(), dashboardService.getMyDashboard()])
      .then(([eventsRes, statsRes]) => {
        setEvents(eventsRes.data.data);
        setStats(statsRes.data.data);
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
  };

  const renderCard = (event) => (
    <Link
      key={event._id}
      to={`/events/${event._id}`}
      className="group block bg-surface border border-border rounded-xl overflow-hidden hover:border-primary hover:shadow-card transition-all duration-200"
    >
      <div className="aspect-video bg-surface-sunken flex items-center justify-center text-text-muted text-sm overflow-hidden">
        {event.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <FolderOpen size={28} className="text-border" />
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium text-primary">{event.title}</h3>
        <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
          <CalendarDays size={12} />
          {new Date(event.date).toLocaleDateString()} · {event.status}
        </p>
      </div>
    </Link>
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
        <div className="skeleton h-8 w-48 rounded-lg mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton aspect-video rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const hasNoEvents = !events.organized.length && !events.photographing.length && !events.joined.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Google-Classroom-style action row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-medium text-primary">Your Events</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/events/create"
            className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition text-sm"
          >
            <Plus size={16} /> Create Event
          </Link>
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-1 bg-surface hover:bg-surface-hover border border-border text-primary px-4 py-2 rounded-lg transition text-sm"
          >
            <KeyRound size={16} /> Join Event
          </button>
          <button
            onClick={() => setShowPhotographerModal(true)}
            className="flex items-center gap-1 bg-surface hover:bg-surface-hover border border-border text-primary px-4 py-2 rounded-lg transition text-sm"
          >
            <Camera size={16} /> Join as Photographer
          </button>
        </div>
      </div>

      {/* Compact stats — only shown for sections where the user actually has activity */}
      {stats && (stats.organizing.totalEvents > 0 || stats.photographing.totalEventsPhotographing > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.organizing.totalEvents > 0 && (
            <>
              <StatCard label="Events Organizing" value={stats.organizing.totalEvents} />
              <StatCard label="Participants (yours)" value={stats.organizing.totalParticipants} />
              <StatCard label="Photos (your events)" value={stats.organizing.totalPhotos} />
              <StatCard label="Storage Used" value={`${stats.organizing.storageUsedMB} MB`} />
            </>
          )}
          {stats.photographing.totalEventsPhotographing > 0 && (
            <>
              <StatCard label="Events Photographing" value={stats.photographing.totalEventsPhotographing} />
              <StatCard label="Photos Uploaded" value={stats.photographing.totalPhotosUploaded} />
              <StatCard label="Downloads of Your Work" value={stats.photographing.totalDownloads} />
              <StatCard label="Likes on Your Work" value={stats.photographing.totalLikes} />
            </>
          )}
        </div>
      )}

      {events.organized.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm text-text-muted uppercase tracking-wide mb-3">Organizing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.organized.map(renderCard)}
          </div>
        </section>
      )}

      {events.photographing.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm text-text-muted uppercase tracking-wide mb-3">Photographing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.photographing.map(renderCard)}
          </div>
        </section>
      )}

      {events.joined.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm text-text-muted uppercase tracking-wide mb-3">Joined</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.joined.map(renderCard)}
          </div>
        </section>
      )}

      {hasNoEvents && (
        <EmptyState
          icon={FolderOpen}
          title="No events yet"
          description="Create your own event, or use a code/QR from someone else's to join one."
          action={
            <Link
              to="/events/create"
              className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-control transition text-sm font-medium"
            >
              <Plus size={16} /> Create Event
            </Link>
          }
        />
      )}

      {showJoinModal && <JoinEventModal onClose={() => setShowJoinModal(false)} onJoined={handleJoined} />}
      {showPhotographerModal && (
        <JoinAsPhotographerModal onClose={() => setShowPhotographerModal(false)} onJoined={handleJoined} />
      )}
    </div>
  );
}
