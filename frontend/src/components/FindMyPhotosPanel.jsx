import { useEffect, useState } from "react";
import { Sparkles, UserRound, ImageOff, PackageCheck, Download, Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import * as photoService from "../services/photoService";
import * as collectionService from "../services/collectionService";
import { triggerBlobDownload, filenameFromContentDisposition } from "../utils/download";
import PhotoCard from "./PhotoCard";
import PhotoLightbox from "./PhotoLightbox";
import EmptyState from "./EmptyState";
import { PhotoGridSkeleton } from "./Skeleton";

/**
 * The "Find My Photos" experience end to end:
 *   selfie -> processing animation -> "Your photos are ready" gallery
 *   -> open any photo full-screen -> download one, or all as a ZIP.
 *
 * On mount it loads the user's persisted collection (if they've
 * already searched before) so they don't have to re-upload a selfie
 * every time they revisit the tab.
 */
export default function FindMyPhotosPanel({ eventId, onDownload, onBuy, onLike, onFavourite, likedIds, favouritedIds }) {
  const [selfie, setSelfie] = useState(null);
  const [preview, setPreview] = useState(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [loadingCollection, setLoadingCollection] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [zipState, setZipState] = useState("idle"); // idle | preparing | ready-error

  useEffect(() => {
    let cancelled = false;
    collectionService
      .getMyPhotosCollection(eventId)
      .then((res) => {
        if (cancelled) return;
        if (res.data.data.photos.length > 0) setResults(res.data.data.photos);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingCollection(false));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const handleSelect = (file) => {
    setSelfie(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSearch = async () => {
    if (!selfie) return;
    setSearching(true);
    try {
      const formData = new FormData();
      formData.append("selfie", selfie);
      const res = await photoService.findMyPhotos(eventId, formData);
      setResults(res.data.data.photos);
      if (res.data.data.photos.length === 0) {
        toast("No matching photos found — try a clearer, front-facing selfie", { icon: "🔍" });
      } else {
        toast.success("Your photos are ready!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Search failed");
    } finally {
      setSearching(false);
      setSelfie(null);
      setPreview(null);
    }
  };

  const handleDownloadOne = async (photo) => {
    setDownloadingId(photo._id);
    try {
      await onDownload?.(photo);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    setZipState("preparing");
    try {
      const res = await collectionService.downloadMyPhotosZip(eventId);
      const filename = filenameFromContentDisposition(res.headers["content-disposition"], "SnapShare_My_Photos.zip");
      triggerBlobDownload(res.data, filename);
      const skipped = Number(res.headers["x-skipped-count"] || 0);
      toast.success(skipped > 0 ? `Downloaded! (${skipped} paid photo(s) skipped — purchase to include them)` : "Download ready!");
      setZipState("idle");
    } catch (err) {
      setZipState("idle");
      toast.error(err.response?.data?.message || "Couldn't prepare your ZIP — try again");
    }
  };

  const showProcessing = searching;
  const showResults = !searching && results !== null;
  const showPrompt = !searching && results === null;

  return (
    <div className="max-w-3xl">
      {!showResults && (
        <div className="flex items-center gap-2 mb-2 text-primary">
          <Sparkles size={18} />
          <h2 className="font-display font-medium text-lg">Find My Photos</h2>
        </div>
      )}

      {loadingCollection ? (
        <PhotoGridSkeleton count={6} />
      ) : showPrompt ? (
        <div className="animate-fade-in">
          <p className="text-sm text-text-muted mb-6 max-w-md">
            Upload a clear, front-facing selfie and we'll find every photo you appear in across this event. Your
            selfie is used only to search — it's never stored.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label
              className={`relative flex items-center justify-center w-24 h-24 rounded-full border-2 border-dashed cursor-pointer transition overflow-hidden shrink-0 ${
                preview ? "border-transparent" : "border-border hover:border-primary bg-surface-hover"
              }`}
            >
              {preview ? (
                <img src={preview} alt="Selfie preview" className="w-full h-full object-cover" />
              ) : (
                <UserRound className="text-text-muted" size={28} />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => e.target.files[0] && handleSelect(e.target.files[0])}
              />
            </label>

            <div className="flex flex-col gap-2">
              <label className="inline-block bg-surface border border-border hover:bg-surface-hover px-4 py-2 rounded-control cursor-pointer transition text-sm w-fit shadow-sm">
                {preview ? "Choose a different selfie" : "Choose Selfie"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && handleSelect(e.target.files[0])}
                />
              </label>
              <button
                onClick={handleSearch}
                disabled={!preview}
                className="bg-primary hover:bg-primary-hover disabled:opacity-40 text-white px-4 py-2 rounded-control transition text-sm font-medium w-fit shadow-sm"
              >
                Find My Photos
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showProcessing && (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <div className="relative w-20 h-20 mb-5">
            {preview && (
              <img src={preview} alt="" className="w-20 h-20 rounded-full object-cover animate-pop" />
            )}
            <div className="absolute inset-0 rounded-full border-2 border-secondary border-t-primary animate-spin" />
          </div>
          <p className="font-display text-lg text-primary mb-1">Finding your photos…</p>
          <p className="text-sm text-text-muted">Matching faces against every photo in this event</p>
        </div>
      )}

      {showResults && (
        <div className="animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-display text-xl font-medium text-primary">
                {results.length > 0 ? "Your photos are ready" : "No photos found yet"}
              </h2>
              <p className="text-sm text-text-muted">
                {results.length > 0
                  ? `${results.length} photo${results.length === 1 ? "" : "s"} found`
                  : "Try again with a clearer selfie"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setResults(null);
                  setPreview(null);
                  setSelfie(null);
                }}
                className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary border border-border px-3 py-2 rounded-control transition"
              >
                <RefreshCw size={14} /> Search again
              </button>
              {results.length > 0 && (
                <button
                  onClick={handleDownloadAll}
                  disabled={zipState === "preparing"}
                  className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white px-4 py-2 rounded-control transition text-sm font-medium shadow-sm"
                >
                  {zipState === "preparing" ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Preparing ZIP…
                    </>
                  ) : (
                    <>
                      <PackageCheck size={16} /> Download All
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {results.length === 0 ? (
            <EmptyState
              icon={ImageOff}
              title="No matches yet"
              description="We couldn't find your face in this event's photos. Try a clearer, front-facing selfie with good lighting."
            />
          ) : (
            <div className="columns-2 sm:columns-3 photo-masonry">
              {results.map((photo, i) => (
                <PhotoCard
                  key={photo._id}
                  photo={photo}
                  onOpen={() => setLightboxIndex(i)}
                  onDownload={handleDownloadOne}
                  onBuy={onBuy}
                  onLike={onLike}
                  onFavourite={onFavourite}
                  liked={likedIds?.has(photo._id)}
                  favourited={favouritedIds?.has(photo._id)}
                  downloading={downloadingId === photo._id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {lightboxIndex !== null && results && (
        <PhotoLightbox
          photos={results}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onDownload={handleDownloadOne}
          onLike={onLike}
          onFavourite={onFavourite}
          likedIds={likedIds}
          favouritedIds={favouritedIds}
          downloadingId={downloadingId}
        />
      )}
    </div>
  );
}
