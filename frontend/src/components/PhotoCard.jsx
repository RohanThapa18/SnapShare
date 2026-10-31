import { useState } from "react";
import { Heart, Flag, Bookmark, Download, Lock, Loader2, Expand, Trash2 } from "lucide-react";
const glassBtn =
  "flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-md transition hover:bg-white/35 active:scale-95 disabled:opacity-60";

export default function PhotoCard({
  photo,
  onOpen,
  onLike,
  onFavourite,
  onDownload,
  onBuy,
  onDelete,
  onReport,
  liked,
  favourited,
  downloading,
  variant = "masonry",
  className = "",
}) {
  const [loaded, setLoaded] = useState(false);

  const isMasonry = variant === "masonry";
  const shape =
    variant === "tile"
      ? "aspect-[4/5]"
      : variant === "fill"
        ? "h-full"
        : "mb-4 break-inside-avoid";
  const locked = photo.isPaid && Number(photo.price) > 0 && !photo.purchased;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-slate-100 shadow-sm ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(38,52,95,0.20)] hover:ring-indigo-300/60 ${shape} ${!loaded && isMasonry ? "min-h-[180px]" : ""
        } ${className}`}
    >
      {!loaded && <div className="skeleton absolute inset-0" aria-hidden="true" />}

      <button
        onClick={() => onOpen?.(photo)}
        className={`relative block w-full focus-visible:outline-none ${isMasonry ? "" : "h-full"}`}
        aria-label="Open photo"
      >
        <img
          src={photo.thumbnailUrl || photo.url}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`block w-full transition-all duration-700 ease-out group-hover:scale-[1.05] ${isMasonry ? "h-auto" : "h-full object-cover"
            } ${loaded ? "opacity-100" : "opacity-0"}`}
        />

        {/* soft darken + expand hint (desktop) */}
        <div className="absolute inset-0 hidden items-center justify-center bg-[#141c38]/0 transition-colors duration-300 group-hover:bg-[#141c38]/20 sm:flex">
          <span className="flex h-11 w-11 scale-90 items-center justify-center rounded-full bg-white/20 text-white opacity-0 ring-1 ring-white/40 backdrop-blur-md transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
            <Expand size={18} />
          </span>
        </div>
      </button>

      {/* price badge */}
      {locked && (
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-[#26345f]/80 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur-md">
          <Lock size={12} /> ₹{photo.price}
        </div>
      )}

      {/* face-match badge */}
      {photo.confidence !== undefined && (
        <div className="absolute right-2.5 top-2.5 rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-200 backdrop-blur-md">
          {Math.round(photo.confidence * 100)}% match
        </div>
      )}

      {/* action bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-3 pt-12 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        <div className="pointer-events-auto flex items-center gap-1.5">
          {onLike && (
            <button
              onClick={() => onLike(photo)}
              aria-label="Like"
              className="flex h-8 items-center gap-1.5 rounded-full bg-white/20 px-2.5 text-xs font-semibold text-white ring-1 ring-white/30 backdrop-blur-md transition hover:bg-white/35 active:scale-95"
            >
              <Heart
                size={15}
                fill={liked ? "#ef4444" : "none"}
                color={liked ? "#ef4444" : "white"}
              />
              {photo.likeCount ?? 0}
            </button>
          )}
          {onFavourite && (
            <button onClick={() => onFavourite(photo)} aria-label="Favourite" className={glassBtn}>
              <Bookmark
                size={15}
                fill={favourited ? "#60a5fa" : "none"}
                color={favourited ? "#60a5fa" : "white"}
              />
            </button>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          {onReport && (
            <button
              onClick={() => onReport(photo)}
              aria-label="Report photo"
              className={`${glassBtn} hover:!bg-amber-500/70`}
            >
              <Flag size={15} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(photo)}
              aria-label="Delete photo"
              className={`${glassBtn} hover:!bg-red-500/70`}
            >
              <Trash2 size={15} />
            </button>
          )}

          {locked ? (
            <button
              onClick={() => onBuy?.(photo)}
              className="h-8 rounded-full bg-accent px-3.5 text-xs font-semibold text-on-accent shadow-md transition hover:bg-accent-hover active:scale-95"
            >
              Buy
            </button>
          ) : (
            onDownload && (
              <button
                onClick={() => onDownload(photo)}
                disabled={downloading}
                aria-label="Download"
                className={glassBtn}
              >
                {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}