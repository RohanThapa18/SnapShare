import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Download, Heart, Bookmark, Maximize, Loader2, Trash2 } from "lucide-react";
/**
 * Full-screen photo viewer ("lightbox"). Renders on top of everything
 * else in the app instead of navigating away from the gallery.
 *
 * Controls: close (button / Esc / backdrop click), previous/next
 * (buttons / Left-Right arrow keys / swipe on touch devices), a
 * counter, download, like, favourite, and native fullscreen where the
 * browser supports it.
 *
 * Props:
 * - photos: array of photo objects currently being browsed
 * - index: index into `photos` of the photo to show
 * - onClose(): called to dismiss the viewer
 * - onNavigate(newIndex): called when the user moves to another photo
 * - onDownload(photo), onLike(photo), onFavourite(photo): optional
 * - likedIds / favouritedIds: optional Set of photo ids for active-state icons
 * - downloadingId: id of a photo currently downloading (shows a spinner)
 */
export default function PhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate,
  onDownload,
  onLike,
  onDelete,
  onFavourite,
  likedIds,
  favouritedIds,
  downloadingId,
}) {
  const [closing, setClosing] = useState(false);
  const touchStartX = useRef(null);
  const dialogRef = useRef(null);

  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const requestClose = useCallback(() => {
    setClosing(true);
    // Let the exit animation play before actually unmounting.
    setTimeout(onClose, 140);
  }, [onClose]);

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(index - 1);
  }, [hasPrev, index, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(index + 1);
  }, [hasNext, index, onNavigate]);

  // Keyboard navigation: Esc closes, Left/Right move between photos.
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") requestClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [requestClose, goPrev, goNext]);

  // Lock body scroll while the viewer is open.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) goPrev();
      else goNext();
    }
    touchStartX.current = null;
  };

  const handleFullscreen = () => {
    const el = dialogRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.().catch(() => { });
    }
  };

  if (!photo) return null;

  const isDownloading = downloadingId === photo._id;
  const isLiked = likedIds?.has(photo._id);
  const isFavourited = favouritedIds?.has(photo._id);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      tabIndex={-1}
      className={`fixed inset-0 z-[100] flex items-center justify-center outline-none ${closing ? "animate-fade-out" : "animate-fade-in"
        }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Backdrop — darkened + blurred, click to close */}
      <div
        className="absolute inset-0 bg-primary/90 backdrop-blur-sm"
        onClick={requestClose}
        aria-hidden="true"
      />

      {/* Top bar: counter + fullscreen + close */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4">
        <span className="text-sm text-white/80 bg-black/30 px-3 py-1 rounded-full">
          {index + 1} / {photos.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFullscreen}
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition"
            aria-label="Toggle fullscreen"
          >
            <Maximize size={16} />
          </button>
          <button
            onClick={requestClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition"
            aria-label="Close viewer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Previous / Next — hidden on mobile in favor of swipe */}
      {hasPrev && (
        <button
          onClick={goPrev}
          className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition"
          aria-label="Previous photo"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {hasNext && (
        <button
          onClick={goNext}
          className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition"
          aria-label="Next photo"
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Image — centered, aspect ratio preserved, scale/fade in */}
      <img
        key={photo._id}
        src={photo.url}
        alt=""
        className={`relative z-[5] max-h-[82vh] max-w-[92vw] sm:max-w-[85vw] object-contain rounded-lg shadow-elevated ${closing ? "animate-scale-out" : "animate-scale-in"
          }`}
      />

      {/* Bottom control bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-3 px-4 py-5">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur px-4 py-2.5 rounded-full">
          {onLike && (
            <button
              onClick={() => onLike(photo)}
              className="flex items-center gap-1.5 text-white/90 hover:text-white transition text-sm"
              aria-label="Like photo"
            >
              <Heart size={18} fill={isLiked ? "#DFAEA1" : "none"} color={isLiked ? "#DFAEA1" : "currentColor"} />
              {photo.likeCount ?? 0}
            </button>
          )}
          {onFavourite && (
            <button
              onClick={() => onFavourite(photo)}
              className="text-white/90 hover:text-white transition"
              aria-label="Save to favourites"
            >
              <Bookmark size={18} fill={isFavourited ? "#BABDE2" : "none"} color={isFavourited ? "#BABDE2" : "currentColor"} />
            </button>
          )}
          {onDownload && (!photo.isPaid || photo.purchased) && (
            <button
              onClick={() => onDownload(photo)}
              disabled={isDownloading}
              className="flex items-center gap-1.5 text-white/90 hover:text-white transition text-sm disabled:opacity-60"
              aria-label="Download photo"
            >
              {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {isDownloading ? "Downloading…" : "Download"}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(photo)}
              className="flex items-center gap-1.5 text-white/90 hover:text-red-400 transition text-sm"
              aria-label="Delete photo"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
