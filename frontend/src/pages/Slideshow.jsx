import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Pause, Play, X } from "lucide-react";
import * as eventService from "../services/eventService";
import * as photoService from "../services/photoService";

const POLL_MS = 20000;
const SPEEDS = [3, 5, 8, 12];
const SOURCES = [
  { key: "OFFICIAL", label: "Official photos" },
  { key: "COMMUNITY", label: "Community photos" },
  { key: "ALL", label: "All photos" },
];

// Paid photos the viewer hasn't bought only have a watermarked preview, so skip those on a big screen
const isShowable = (p) => !(p.isPaid && Number(p.price) > 0 && !p.purchased);

const fetchSlides = async (eventId, source, maxPages) => {
  const albums = source === "ALL" ? ["OFFICIAL", "COMMUNITY"] : [source];
  const perAlbum = await Promise.all(
    albums.map(async (album) => {
      let all = [];
      for (let page = 1; page <= maxPages; page++) {
        const res = await photoService.listPhotos(eventId, { album, page, limit: 60 });
        const { photos, total } = res.data.data;
        all = all.concat(photos);
        if (photos.length === 0 || all.length >= total) break;
      }
      return all;
    })
  );
  return perAlbum
    .flat()
    .filter(isShowable)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)); // newest first
};

/**
 * Full-screen, auto-advancing photo wall for a projector or TV.
 * Route: /events/:slug/slideshow. Any member of the event can open it.
 * New uploads are picked up every 20s and shown next, so it stays live.
 */
export default function Slideshow() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const [source, setSource] = useState("OFFICIAL");
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [seconds, setSeconds] = useState(6);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [freshCount, setFreshCount] = useState(0);

  const seenRef = useRef(new Set());
  const indexRef = useRef(0);
  const idleRef = useRef(null);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // ---- the event ----
  useEffect(() => {
    eventService
      .getEventBySlug(slug)
      .then((res) => setEvent(res.data.data.event))
      .catch((err) => setError(err.response?.data?.message || "Couldn't open this event"));
  }, [slug]);

  const eventId = event?._id;

  // ---- initial load (and again whenever the source changes) ----
  useEffect(() => {
    if (!eventId) return undefined;
    let cancelled = false;
    setLoading(true);

    fetchSlides(eventId, source, 5)
      .then((list) => {
        if (cancelled) return;
        seenRef.current = new Set(list.map((p) => p._id));
        setSlides(list);
        setIndex(0);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || "Couldn't load photos");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, source]);

  // ---- live: pick up new uploads and show them next ----
  useEffect(() => {
    if (!eventId || loading) return undefined;
    let cancelled = false;
    let hideTimer = null;

    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const latest = await fetchSlides(eventId, source, 1);
        if (cancelled) return;
        const fresh = latest.filter((p) => !seenRef.current.has(p._id));
        if (!fresh.length) return;

        fresh.forEach((p) => seenRef.current.add(p._id));
        setSlides((prev) => {
          const at = Math.min(indexRef.current + 1, prev.length);
          return [...prev.slice(0, at), ...fresh, ...prev.slice(at)];
        });
        setFreshCount(fresh.length);
        hideTimer = setTimeout(() => setFreshCount(0), 4000);
      } catch {
        // try again on the next tick
      }
    };

    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearTimeout(hideTimer);
    };
  }, [eventId, source, loading]);

  // ---- navigation + autoplay ----
  const go = useCallback(
    (delta) => setIndex((i) => (slides.length ? (i + delta + slides.length) % slides.length : 0)),
    [slides.length]
  );

  useEffect(() => {
    if (!playing || slides.length < 2) return undefined;
    const t = setTimeout(() => go(1), seconds * 1000);
    return () => clearTimeout(t);
  }, [playing, slides.length, index, seconds, go]);

  // warm the next image so the transition never waits on the network
  useEffect(() => {
    if (slides.length < 2) return;
    const next = slides[(index + 1) % slides.length];
    if (next) new Image().src = next.url;
  }, [index, slides]);

  // ---- controls auto-hide ----
  const wake = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  useEffect(() => {
    wake();
    return () => clearTimeout(idleRef.current);
  }, [wake]);

  // ---- fullscreen ----
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else containerRef.current?.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // keep the screen awake while the wall is up (supported browsers only)
  useEffect(() => {
    let lock = null;
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) || null;
      } catch {
        lock = null;
      }
    };
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release?.().catch(() => {});
    };
  }, []);

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "SELECT") return;
      wake();
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
      else if (e.key === "Escape" && !document.fullscreenElement) navigate(`/events/${slug}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, wake, toggleFullscreen, navigate, slug]);

  // a dead image (deleted photo) is dropped instead of leaving a hole
  const dropSlide = (photoId) => setSlides((prev) => prev.filter((p) => p._id !== photoId));

  const photo = slides.length ? slides[index % slides.length] : null;
  const hideCursor = !controlsVisible && playing;

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black p-6 text-center text-white">
        <p className="text-lg">{error}</p>
        <button onClick={() => navigate(`/events/${slug}`)} className="rounded-xl bg-white/15 px-4 py-2 text-sm transition hover:bg-white/25">
          Back to event
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={wake}
      onTouchStart={wake}
      className={`fixed inset-0 z-[60] overflow-hidden bg-black text-white ${hideCursor ? "cursor-none" : ""}`}
    >
      <style>{`@keyframes ss-progress { from { width: 0 } to { width: 100% } }`}</style>

      {/* photo: blurred copy fills the screen behind, sharp copy sits on top */}
      {photo && (
        <div key={photo._id} className="absolute inset-0 animate-fade-in">
          <img src={photo.url} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
          <img
            src={photo.url}
            alt=""
            onError={() => dropSlide(photo._id)}
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>
      )}

      {/* empty / loading states */}
      {!photo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          {loading ? (
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white" />
          ) : (
            <>
              <p className="text-xl font-medium">No photos to show yet</p>
              <p className="text-sm text-white/60">New uploads appear here automatically.</p>
            </>
          )}
        </div>
      )}

      {/* top bar */}
      <div className={`absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent p-4 transition-opacity duration-300 sm:p-6 ${controlsVisible ? "opacity-100" : "opacity-0"}`}>
        <div className="min-w-0">
          <p className="truncate font-display text-xl sm:text-2xl">{event?.title}</p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-white/70">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> LIVE
            </span>
            {slides.length > 0 && <span>{(index % slides.length) + 1} / {slides.length}</span>}
          </p>
        </div>
        <button
          onClick={() => navigate(`/events/${slug}`)}
          aria-label="Exit slideshow"
          className="rounded-full bg-white/15 p-2 backdrop-blur-md transition hover:bg-white/30"
        >
          <X size={18} />
        </button>
      </div>

      {/* "new photos" toast */}
      {freshCount > 0 && (
        <div className="absolute left-1/2 top-20 -translate-x-1/2 animate-slide-up rounded-full bg-emerald-500/90 px-4 py-1.5 text-sm font-medium shadow-lg">
          {freshCount} new photo{freshCount === 1 ? "" : "s"} coming up
        </div>
      )}

      {/* bottom controls */}
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12 transition-opacity duration-300 sm:px-6 ${controlsVisible ? "opacity-100" : "opacity-0"}`}>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <button onClick={() => go(-1)} aria-label="Previous photo" className="rounded-full bg-white/15 p-2.5 backdrop-blur-md transition hover:bg-white/30">
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
            className="rounded-full bg-white px-5 py-2.5 text-black transition hover:bg-white/90"
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button onClick={() => go(1)} aria-label="Next photo" className="rounded-full bg-white/15 p-2.5 backdrop-blur-md transition hover:bg-white/30">
            <ChevronRight size={20} />
          </button>

          <select
            value={seconds}
            onChange={(e) => setSeconds(Number(e.target.value))}
            aria-label="Seconds per photo"
            className="rounded-full border-0 bg-white/15 px-3 py-2 text-sm backdrop-blur-md outline-none"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s} className="text-black">{s}s per photo</option>
            ))}
          </select>

          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            aria-label="Which photos to show"
            className="rounded-full border-0 bg-white/15 px-3 py-2 text-sm backdrop-blur-md outline-none"
          >
            {SOURCES.map((s) => (
              <option key={s.key} value={s.key} className="text-black">{s.label}</option>
            ))}
          </select>

          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="rounded-full bg-white/15 p-2.5 backdrop-blur-md transition hover:bg-white/30"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-white/45">
          Space = play/pause · ← → = navigate · F = fullscreen · Paid photos you haven't bought are skipped
        </p>
      </div>

      {/* progress bar for the current slide */}
      {playing && slides.length > 1 && (
        <div
          key={`${index}-${seconds}`}
          className="absolute bottom-0 left-0 h-0.5 bg-white/80"
          style={{ animation: `ss-progress ${seconds}s linear forwards` }}
        />
      )}
    </div>
  );
}