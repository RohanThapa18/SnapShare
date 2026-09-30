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
 *   selfie(s) -> processing animation -> "Your photos are ready" gallery
 *   -> open any photo full-screen -> download one, or all as a ZIP.
 *
 * On mount it loads the user's persisted collection (if they've
 * already searched before) so they don't have to re-upload a selfie
 * every time they revisit the tab.
 */
export default function FindMyPhotosPanel({ eventId, onDownload, onBuy, onLike, onFavourite, likedIds, favouritedIds }) {
  const [selfies, setSelfies] = useState([]);
  const [previews, setPreviews] = useState([]);
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
    if (selfies.length >= 3) return;
    setSelfies((prev) => [...prev, file]);
    setPreviews((prev) => [...prev, URL.createObjectURL(file)]);
  };

  const handleRemoveSelfie = (index) => {
    setSelfies((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const resetSelfies = () => {
    setSelfies([]);
    setPreviews([]);
  };

  const handleSearch = async () => {
    if (selfies.length === 0) return;
    setSearching(true);
    try {
      const formData = new FormData();
      selfies.forEach((file) => formData.append("selfies", file));
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
      resetSelfies();
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
            Upload 1-3 clear, front-facing selfies and we'll find every photo you appear in across this event. Your
            selfies are used only to search — they're never stored.
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              {previews.map((src, i) => (
                <div key={i} className="relative w-20 h-20 rounded-full overflow-hidden shrink-0">
                  <img src={src} alt={`Selfie ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveSelfie(i)}
                    className="absolute inset-0 bg-primary/60 opacity-0 hover:opacity-100 transition flex items-center justify-center text-white text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {selfies.length < 3 && (
                <label className="flex items-center justify-center w-20 h-20 rounded-full border-2 border-dashed border-border hover:border-primary bg-surface-hover cursor-pointer transition shrink-0">
                  <UserRound className="text-text-muted" size={24} />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files[0] && handleSelect(e.target.files[0])}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-text-muted -mt-1">
              Add up to 3 selfies from slightly different angles for a more accurate match ({selfies.length}/3).
            </p>

            <button
              onClick={handleSearch}
              disabled={selfies.length === 0 || searching}
              className="bg-primary text-white px-5 py-2 rounded-control hover:bg-primary-hover transition disabled:opacity-50 w-fit"
            >
              Find My Photos
            </button>
          </div>
        </div>
      ) : null}

      {showProcessing && (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <div className="relative w-20 h-20 mb-5">
            {previews[0] && (
              <img src={previews[0]} alt="" className="w-20 h-20 rounded-full object-cover animate-pop" />
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
                  resetSelfies();
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
            (() => {
              const highMatches = results.filter((p) => p.tier !== "possible");
              const possibleMatches = results.filter((p) => p.tier === "possible");
              return (
                <>
                  <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
                    {highMatches.map((photo, i) => (
                      <PhotoCard
                        key={photo._id}
                        photo={photo}
                        onOpen={() => setLightboxIndex(i)}
                        onLike={onLike}
                        onFavourite={onFavourite}
                        onDownload={handleDownloadOne}
                        onBuy={onBuy}
                        liked={likedIds?.has(photo._id)}
                        favourited={favouritedIds?.has(photo._id)}
                        downloading={downloadingId === photo._id}
                      />
                    ))}
                  </div>

                  {possibleMatches.length > 0 && (
                    <div className="mt-8">
                      <p className="text-sm text-text-muted mb-3">
                        Possible matches — lower confidence, take a look and confirm it's you:
                      </p>
                      <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
                        {possibleMatches.map((photo, i) => (
                          <PhotoCard
                            key={photo._id}
                            photo={photo}
                            onOpen={() => setLightboxIndex(highMatches.length + i)}
                            onLike={onLike}
                            onFavourite={onFavourite}
                            onDownload={handleDownloadOne}
                            onBuy={onBuy}
                            liked={likedIds?.has(photo._id)}
                            favourited={favouritedIds?.has(photo._id)}
                            downloading={downloadingId === photo._id}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()
          )}
        </div>
      )}

      {lightboxIndex !== null && results && (
        <PhotoLightbox
          photos={[...results.filter((p) => p.tier !== "possible"), ...results.filter((p) => p.tier === "possible")]}
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