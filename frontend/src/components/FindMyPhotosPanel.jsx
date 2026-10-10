import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  UserRound,
  ImageOff,
  PackageCheck,
  Loader2,
  RefreshCw,
  Camera,
  Upload,
  X,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import * as photoService from "../services/photoService";
import * as collectionService from "../services/collectionService";
import { triggerBlobDownload, filenameFromContentDisposition } from "../utils/download";
import PhotoCard from "./PhotoCard";
import PhotoLightbox from "./PhotoLightbox";
import EmptyState from "./EmptyState";
import { PhotoGridSkeleton } from "./Skeleton";
import { resizeImageFile } from "../utils/resizeImage";

/**
 * The "Find My Photos" experience end to end:
 *   selfie(s) -> processing animation -> "Your photos are ready" gallery
 *   -> open any photo full-screen -> download one, or all as a ZIP.
 *
 * On mount it loads the user's persisted collection (if they've
 * already searched before) so they don't have to re-upload a selfie
 * every time they revisit the tab.
 */
export default function FindMyPhotosPanel({ eventId, onDownload, onBuy, onLike, onFavourite, likedIds, favouritedIds, photoPatches, removedIds }) {
  const [selfies, setSelfies] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [loadingCollection, setLoadingCollection] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [zipState, setZipState] = useState("idle"); // idle | preparing | ready-error

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const previewsRef = useRef([]);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    let cancelled = false;
    collectionService
      .getMyPhotosCollection(eventId)
      .then((res) => {
        if (cancelled) return;
        if (res.data.data.photos.length > 0) setResults(res.data.data.photos);
      })
      .catch(() => { })
      .finally(() => !cancelled && setLoadingCollection(false));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // keep results in sync with likes / deletions made elsewhere on the page
  useEffect(() => {
    setResults((prev) =>
      prev
        ? prev
          .filter((p) => !removedIds?.includes(p._id))
          .map((p) => (photoPatches?.[p._id] ? { ...p, ...photoPatches[p._id] } : p))
        : prev
    );
  }, [photoPatches, removedIds]);
  const handleSelect = (file) => {
    if (selfies.length >= 3) return;
    setSelfies((prev) => [...prev, file]);
    setPreviews((prev) => [...prev, URL.createObjectURL(file)]);
  };

  const handleRemoveSelfie = (index) => {
    setSelfies((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const resetSelfies = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setSelfies([]);
    setPreviews([]);
  };

  const openCamera = async () => {
    if (selfies.length >= 3) return;

    setCameraError("");
    setCameraLoading(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported by this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);
    } catch (error) {
      console.error("Camera error:", error);

      if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
        setCameraError(
          "Camera permission was denied. Allow camera access in your browser and try again."
        );
      } else if (error?.name === "NotFoundError") {
        setCameraError("No camera was found on this device.");
      } else if (error?.name === "NotReadableError") {
        setCameraError("Your camera is already being used by another application.");
      } else {
        setCameraError("Unable to access your camera. Please try again.");
        toast.error("Unable to access your camera. Please check your camera permission.");
      }
    } finally {
      setCameraLoading(false);
    }
  };

  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) return;

    const video = videoRef.current;
    video.srcObject = streamRef.current;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (error) {
        console.error("Unable to start camera preview:", error);
        setCameraError("Unable to start the camera preview. Please try again.");
      }
    };

    playVideo();
  }, [cameraOpen]);

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setCameraError("");
    setCapturing(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("Camera is not ready yet. Please wait a moment and try again.");
      return;
    }

    setCapturing(true);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("Unable to capture the camera image.");
      setCapturing(false);
      return;
    }

    // Do not mirror the saved image. The AI receives the normal camera frame.
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Unable to create the selfie image. Please try again.");
          setCapturing(false);
          return;
        }

        const file = new File(
          [blob],
          `camera-selfie-${Date.now()}.jpg`,
          { type: "image/jpeg" }
        );

        const previewUrl = URL.createObjectURL(file);

        setSelfies((prev) => {
          if (prev.length >= 3) {
            URL.revokeObjectURL(previewUrl);
            return prev;
          }
          return [...prev, file];
        });

        setPreviews((prev) => {
          if (prev.length >= 3) {
            URL.revokeObjectURL(previewUrl);
            return prev;
          }
          return [...prev, previewUrl];
        });

        closeCamera();
        setCapturing(false);
      },
      "image/jpeg",
      0.92
    );
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleSearch = async () => {
    if (selfies.length === 0) return;
    setSearching(true);
    try {
      const formData = new FormData();
      const prepared = await Promise.all(selfies.map((file) => resizeImageFile(file)));
      prepared.forEach((file) => formData.append("selfies", file));
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
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSelect(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-text-muted -mt-1">
              Add up to 3 selfies from slightly different angles for a more accurate match ({selfies.length}/3).
            </p>

            {selfies.length < 3 && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={openCamera}
                  disabled={cameraLoading}
                  className="flex items-center justify-center gap-2 border border-primary text-primary hover:bg-primary/5 px-5 py-2.5 rounded-control transition disabled:opacity-50"
                >
                  <Camera size={17} />
                  {cameraLoading ? "Opening Camera..." : "Use Camera"}
                </button>

                <label className="flex items-center justify-center gap-2 border border-border bg-white text-text px-5 py-2.5 rounded-control hover:bg-surface-hover cursor-pointer transition">
                  <Upload size={17} />
                  Upload from Device
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSelect(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}

            <button
              onClick={handleSearch}
              disabled={selfies.length === 0 || searching}
              className="bg-primary text-white px-5 py-2.5 rounded-control hover:bg-primary-hover transition disabled:opacity-50 w-fit"
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

      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-display text-lg font-medium text-primary">Take a Selfie</h3>
                <p className="text-xs text-text-muted mt-1">Position your face inside the guide</p>
              </div>
              <button
                type="button"
                onClick={closeCamera}
                className="w-9 h-9 rounded-lg hover:bg-surface-hover flex items-center justify-center text-text-muted"
                aria-label="Close camera"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-black aspect-video relative overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-44 h-56 sm:w-56 sm:h-72 border-2 border-white/80 rounded-[50%] shadow-lg" />
              </div>
            </div>

            {cameraError && (
              <div className="px-5 pt-4 text-sm text-error">
                {cameraError}
              </div>
            )}

            <div className="p-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={closeCamera}
                className="flex items-center gap-2 px-4 py-2.5 rounded-control border border-border text-text-muted hover:bg-surface-hover transition"
              >
                <RotateCcw size={16} />
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                disabled={capturing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-control bg-primary hover:bg-primary-hover text-white font-medium transition disabled:opacity-50"
              >
                <Camera size={17} />
                {capturing ? "Capturing..." : "Capture Selfie"}
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
