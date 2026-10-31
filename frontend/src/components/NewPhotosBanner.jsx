import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import useNewPhotoCount from "../hooks/useNewPhotoCount";

/** Floating "N new photos" pill for the gallery. */
export default function NewPhotosBanner({ eventId, album, photos, loading, active, onRefresh }) {
  // newest photo we're already showing
  const since = useMemo(() => {
    if (!photos.length) return new Date(0).toISOString();
    return photos.reduce((max, p) => (p.createdAt > max ? p.createdAt : max), photos[0].createdAt);
  }, [photos]);

  const count = useNewPhotoCount({ eventId, album, since, enabled: active && !loading });
  if (!count) return null;

  return (
    <div className="pointer-events-none sticky top-[140px] z-20 mb-4 flex justify-center">
      <button
        onClick={onRefresh}
        className="pointer-events-auto flex animate-slide-up items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-elevated transition hover:bg-primary-hover"
      >
        <RefreshCw size={14} />
        {count} new photo{count === 1 ? "" : "s"} — show
      </button>
    </div>
  );
}