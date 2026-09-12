import { useState } from "react";
import { Heart, Bookmark, Download, Lock, Loader2, Expand } from "lucide-react";

/**
 * Renders a photo at its natural aspect ratio (no forced square crop) —
 * meant to sit inside a CSS-columns masonry grid so full images show
 * without cropping, Pinterest-style. Clicking anywhere on the image
 * opens it in the full-screen PhotoLightbox via `onOpen`.
 */
export default function PhotoCard({
  photo,
  onOpen,
  onLike,
  onFavourite,
  onDownload,
  onBuy,
  liked,
  favourited,
  downloading,
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="group relative rounded-xl overflow-hidden bg-surface-hover border border-border break-inside-avoid mb-4 shadow-sm hover:shadow-card transition-shadow duration-200">
      {!loaded && <div className="skeleton absolute inset-0" aria-hidden="true" />}
      <button
        onClick={() => onOpen?.(photo)}
        className="block w-full relative focus-visible:outline-none"
        aria-label="Open photo"
      >
        <img
          src={photo.thumbnailUrl || photo.url}
          alt=""
          className={`w-full h-auto object-contain transition-all duration-300 group-hover:scale-[1.015] ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
        {/* Subtle darken + expand hint on hover, desktop only */}
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-200 hidden sm:flex items-center justify-center">
          <Expand
            size={22}
            className="text-white opacity-0 group-hover:opacity-90 transition-opacity duration-200 drop-shadow"
          />
        </div>
      </button>

      {photo.isPaid && !photo.purchased && (
        <div className="absolute top-2 left-2 bg-primary/85 backdrop-blur text-xs px-2 py-1 rounded-full flex items-center gap-1 text-white">
          <Lock size={12} /> ₹{photo.price}
        </div>
      )}

      {photo.confidence !== undefined && (
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-xs px-2 py-1 rounded-full text-success font-medium shadow-sm">
          {Math.round(photo.confidence * 100)}% match
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
        <div className="flex items-center gap-3">
          {onLike && (
            <button onClick={() => onLike(photo)} className="flex items-center gap-1 text-xs text-white" aria-label="Like">
              <Heart size={16} fill={liked ? "#DFAEA1" : "none"} color={liked ? "#DFAEA1" : "white"} />
              {photo.likeCount ?? 0}
            </button>
          )}
          {onFavourite && (
            <button onClick={() => onFavourite(photo)} className="text-xs text-white" aria-label="Favourite">
              <Bookmark size={16} fill={favourited ? "#BABDE2" : "none"} color={favourited ? "#BABDE2" : "white"} />
            </button>
          )}
        </div>

        {photo.isPaid && !photo.purchased ? (
          <button
            onClick={() => onBuy?.(photo)}
            className="text-xs bg-accent text-on-accent font-medium px-2 py-1 rounded-full"
          >
            Buy
          </button>
        ) : (
          onDownload && (
            <button onClick={() => onDownload(photo)} disabled={downloading} className="text-white disabled:opacity-60" aria-label="Download">
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            </button>
          )
        )}
      </div>
    </div>
  );
}
