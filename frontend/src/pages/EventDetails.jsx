import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, LogOut, Trash2, RefreshCw, CalendarClock, Eye, EyeOff, KeyRound, Images, Users, Camera as CameraIcon, ImageIcon, Settings, Heart, Download, CalendarDays, MapPin, Crown } from "lucide-react";
import * as eventService from "../services/eventService";
import * as photoService from "../services/photoService";
import PhotoCard from "../components/PhotoCard";
import PhotoLightbox from "../components/PhotoLightbox";
import PhotoUploader from "../components/PhotoUploader";
import FindMyPhotosPanel from "../components/FindMyPhotosPanel";
import ParticipantsPanel from "../components/ParticipantsPanel";
import PhotographersPanel from "../components/PhotographersPanel";
import BackButton from "../components/BackButton";
import EmptyState from "../components/EmptyState";
import { PhotoGridSkeleton } from "../components/Skeleton";
import { triggerDownload, triggerBlobDownload, filenameFromContentDisposition } from "../utils/download";
import * as paymentService from "../services/paymentService";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal";
import PasscodeCard from "../components/PasscodeCard";
import { formatEventCode } from "../utils/eventCode";
import EventIdCard from "../components/EventIdCard";
import CoverImageCard from "../components/CoverImageCard";

const TABS = ["Gallery", "Upload", "Find My Photos", "Participants", "Photographers"];
import { nowLocalInput } from "../utils/datetime";
export default function EventDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);

  const eventId = event?._id;
  // viewerAccess reflects how the CURRENT user relates to THIS specific
  // event — there's no global role, so this replaces the old
  // user.role === "PHOTOGRAPHER" style checks.
  const [viewerAccess, setViewerAccess] = useState({ isOrganizer: false, isPhotographer: false, isParticipant: false });
  const [album, setAlbum] = useState("OFFICIAL");
  const [photos, setPhotos] = useState([]);
  const [tab, setTab] = useState("Gallery");
  const [joinQr, setJoinQr] = useState(null);
  const [photographerJoinQr, setPhotographerJoinQr] = useState(null);
  const [idCopied, setIdCopied] = useState(false);
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [extending, setExtending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [stats, setStats] = useState(null);
  const [photoPatches, setPhotoPatches] = useState({});
  const [removedIds, setRemovedIds] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  // Organizer passcode reveal — never fetched until the organizer opens
  // Settings, decrypted server-side on demand (see event.controller.js).
  const [passcode, setPasscode] = useState(null);
  const [passcodeVisible, setPasscodeVisible] = useState(false);
  const [passcodeNeedsRegen, setPasscodeNeedsRegen] = useState(false);
  const [passcodeLoading, setPasscodeLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [passcodeCopied, setPasscodeCopied] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const isOrganizer = viewerAccess.isOrganizer;
  const [confirmState, setConfirmState] = useState(null);
  const loadEvent = () =>
    eventService.getEventBySlug(slug).then((res) => {
      setEvent(res.data.data.event);
      setViewerAccess(res.data.data.viewerAccess);
    });
  const loadPhotos = () => {
    setPhotosLoading(true);
    return photoService
      .listPhotos(eventId, { album })
      .then((res) => setPhotos(res.data.data.photos))
      .finally(() => setPhotosLoading(false));
  };

  useEffect(() => {
    loadEvent();
  }, [slug]);

  const refreshStats = () => {
    if (!viewerAccess.isOrganizer || !eventId) return;
    eventService.getEventStats(eventId).then((res) => setStats(res.data.data)).catch(() => { });
  };

  useEffect(() => {
    refreshStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, viewerAccess.isOrganizer]);

  useEffect(() => {
    if (!viewerAccess.isOrganizer || !eventId) return;
    const id = setInterval(refreshStats, 15000);
    const onVisible = () => document.visibilityState === "visible" && refreshStats();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, viewerAccess.isOrganizer]);
  useEffect(() => {
    if (tab === "Gallery" && eventId) loadPhotos();
  }, [tab, album, eventId]);
  useEffect(() => {
    setDeleting(false);
    setConfirmState(null);
    setShowSettings(false);
    setPasscode(null);
    setJoinQr(null);
    setPhotographerJoinQr(null);
  }, [slug]);
  useEffect(() => {
    if (showSettings && isOrganizer && passcode === null && !passcodeLoading) loadPasscode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSettings, isOrganizer]);

  const handleBuy = async (photo) => {
    try {
      const res = await paymentService.createOrder({
        eventId: eventId,
        purchaseType: "PHOTO",
        photoId: photo._id,
      });
      toast(
        "Razorpay checkout would open here with orderId " +
        res.data.data.orderId +
        " — wire up Razorpay Checkout.js on the frontend using razorpayKeyId from this response.",
        { duration: 6000 }
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not start purchase");
    }
  };

  const handleDownload = async (photo) => {
    setDownloadingId(photo._id);
    try {
      const res = await photoService.downloadPhoto(photo._id);
      const filename = filenameFromContentDisposition(res.headers["content-disposition"], `photo_${photo._id}.jpg`);
      triggerBlobDownload(res.data, filename);
      refreshStats();
      toast.success("Download started");
    } catch (err) {
      toast.error(err.response?.data?.message || "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const [likedIds, setLikedIds] = useState(new Set());
  const [favouritedIds, setFavouritedIds] = useState(new Set());

  // merge likedByMe/favouritedByMe flags in whenever photos load
  useEffect(() => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      photos.forEach((p) => { if (p.likedByMe) next.add(p._id); });
      return next;
    });
    setFavouritedIds((prev) => {
      const next = new Set(prev);
      photos.forEach((p) => { if (p.favouritedByMe) next.add(p._id); });
      return next;
    });
  }, [photos]);

  const handleLike = async (photo) => {
    const isLiked = likedIds.has(photo._id);
    const prevCount = photo.likeCount ?? 0;
    const nextCount = Math.max(0, prevCount + (isLiked ? -1 : 1));

    const apply = (liked, count) => {
      setLikedIds((prev) => {
        const next = new Set(prev);
        liked ? next.add(photo._id) : next.delete(photo._id);
        return next;
      });
      setPhotos((prev) => prev.map((p) => (p._id === photo._id ? { ...p, likeCount: count } : p)));
      // lets the Find My Photos tab show the same count without a reload
      setPhotoPatches((prev) => ({ ...prev, [photo._id]: { likeCount: count } }));
    };

    apply(!isLiked, nextCount);
    setStats((s) => (s ? { ...s, totalLikes: Math.max(0, s.totalLikes + (isLiked ? -1 : 1)) } : s));
    try {
      isLiked ? await photoService.unlikePhoto(photo._id) : await photoService.likePhoto(photo._id);
    } catch (err) {
      apply(isLiked, prevCount);
      setStats((s) => (s ? { ...s, totalLikes: Math.max(0, s.totalLikes + (isLiked ? 1 : -1)) } : s));
      toast.error(err.response?.data?.message || "Couldn't update like");
    }
  };

  const handleFavourite = async (photo) => {
    const isFavourited = favouritedIds.has(photo._id);
    setFavouritedIds((prev) => {
      const next = new Set(prev);
      isFavourited ? next.delete(photo._id) : next.add(photo._id);
      return next;
    });
    try {
      isFavourited ? await photoService.unfavouritePhoto(photo._id) : await photoService.favouritePhoto(photo._id);
      toast.success(isFavourited ? "Removed from favourites" : "Added to favourites");
    } catch (err) {
      setFavouritedIds((prev) => {
        const next = new Set(prev);
        isFavourited ? next.add(photo._id) : next.delete(photo._id);
        return next;
      });
      toast.error(err.response?.data?.message || "Couldn't update favourite");
    }
  };
  const loadQr = async () => {
    const res = await eventService.getJoinQr(eventId);
    setJoinQr(res.data.data);
  };

  const loadPhotographerQr = async () => {
    const res = await eventService.getPhotographerJoinQr(eventId);
    setPhotographerJoinQr(res.data.data);
  };

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(formatEventCode(event.eventCode));
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 1500);
  };

  const handleLeave = () => {
    setConfirmState({
      title: "Leave event?",
      message: "You'll need the passcode or QR code again to rejoin.",
      confirmLabel: "Leave",
      danger: true,
      onConfirm: async () => {
        setLeaving(true);
        try {
          await eventService.leaveEvent(eventId);
          toast.success("Left the event");
          navigate("/dashboard");
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to leave event");
        } finally {
          setLeaving(false);
        }
      },
    });
  };

  const handleDeletePhoto = (photo) => {
    setConfirmState({
      title: "Delete this photo?",
      message: "This permanently removes it for everyone. This can't be undone.",
      confirmLabel: "Delete Photo",
      danger: true,
      onConfirm: async () => {
        try {
          await photoService.deletePhoto(photo._id);
          setPhotos((prev) => prev.filter((p) => p._id !== photo._id));
          setRemovedIds((prev) => [...prev, photo._id]);
          // keep the lightbox valid after the photo disappears
          setLightboxIndex((i) =>
            i === null ? null : photos.length <= 1 ? null : Math.min(i, photos.length - 2)
          );
          refreshStats();
          toast.success("Photo deleted");
        } catch (err) {
          toast.error(err.response?.data?.message || "Couldn't delete photo");
        }
      },
    });
  };

  const handleDelete = () => {
    setConfirmState({
      title: "Delete event permanently?",
      message: "This removes all photos, participants, and cannot be undone.",
      confirmLabel: "Delete Event",
      danger: true,
      onConfirm: async () => {
        setDeleting(true);
        try {
          await eventService.deleteEvent(eventId);
          toast.success("Event deleted");
          navigate("/dashboard");
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to delete event");
          setDeleting(false);
        }
      },
    });
  };

  const handleExtend = async (e) => {
    e.preventDefault();
    if (new Date(newExpiryDate) <= new Date()) {
      toast.error("Pick an expiry date in the future");
      return;
    }
    setExtending(true);
    try {
      const res = await eventService.updateEvent(eventId, { expiryDate: new Date(newExpiryDate).toISOString() });
      setEvent(res.data.data.event);
      toast.success("Event duration extended");
      setNewExpiryDate("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to extend event");
    } finally {
      setExtending(false);
    }
  };

  const loadPasscode = async () => {
    setPasscodeLoading(true);
    try {
      const res = await eventService.getEventPasscode(eventId);
      setPasscode(res.data.data.passcode);
      setPasscodeNeedsRegen(res.data.data.needsRegeneration);
      setPasscodeVisible(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't load the passcode");
    } finally {
      setPasscodeLoading(false);
    }
  };

  const handleRegeneratePasscode = () => {
    const doRegenerate = async () => {
      setRegenerating(true);
      try {
        const res = await eventService.regeneratePasscode(eventId);
        setPasscode(res.data.data.passcode);
        setPasscodeNeedsRegen(false);
        setPasscodeVisible(true);
        toast.success("New passcode generated");
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to regenerate passcode");
      } finally {
        setRegenerating(false);
      }
    };

    if (!passcode) return doRegenerate();

    setConfirmState({
      title: "Generate a new passcode?",
      message: "The current one will stop working immediately.",
      confirmLabel: "Regenerate",
      danger: true,
      onConfirm: doRegenerate,
    });
  };

  const handleCopyPasscode = async () => {
    if (!passcode) return;
    await navigator.clipboard.writeText(passcode);
    setPasscodeCopied(true);
    setTimeout(() => setPasscodeCopied(false), 1500);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await photoService.syncPhotosWithCloudinary(eventId);
      toast.success(res.data.message);
      loadPhotos();
      refreshStats()
    } catch (err) {
      toast.error(err.response?.data?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (!event) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
        <div className="skeleton h-8 w-64 rounded-lg mb-3" />
        <div className="skeleton h-4 w-48 rounded-lg mb-8" />
        <PhotoGridSkeleton count={8} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <BackButton />

      {/* ---------- Hero ---------- */}
      <div className="mb-6 overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
        <div className="relative h-52 sm:h-72">
          {event.coverImageUrl ? (
            <img src={event.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-indigo-700 to-accent" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-md ${
                event.status === "ACTIVE"
                  ? "bg-emerald-400/25 text-emerald-50 border border-emerald-300/40"
                  : "bg-white/20 text-white border border-white/30"
              }`}
            >
              {event.status}
            </span>

            <div className="flex gap-2">
              {!viewerAccess.isOrganizer && (viewerAccess.isParticipant || viewerAccess.isPhotographer) && (
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-3 py-1.5 text-sm text-white backdrop-blur-md transition hover:bg-white/25 disabled:opacity-50"
                >
                  <LogOut size={14} />
                  {leaving ? "Leaving..." : "Leave Event"}
                </button>
              )}
              {isOrganizer && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-3 py-1.5 text-sm text-white backdrop-blur-md transition hover:bg-white/25"
                >
                  <Settings size={14} />
                  Settings
                </button>
              )}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <h1 className="font-display text-3xl font-medium text-white drop-shadow sm:text-4xl">{event.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/90">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} />
                {new Date(event.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} />
                  {event.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {(event.description || viewerAccess.isOrganizer || viewerAccess.isPhotographer) && (
          <div className="space-y-4 p-5 sm:p-6">
            {event.description && (
              <div>
                <p
                  className={`max-w-3xl whitespace-pre-line text-sm leading-relaxed text-text-muted ${
                    descOpen ? "" : "line-clamp-3"
                  }`}
                >
                  {event.description}
                </p>
                {event.description.length > 180 && (
                  <button
                    onClick={() => setDescOpen((v) => !v)}
                    className="mt-1 text-xs font-medium text-primary hover:underline"
                  >
                    {descOpen ? "Show less" : "Read more"}
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {viewerAccess.isOrganizer && (
                <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Crown size={12} /> You organize this event
                </span>
              )}
              {viewerAccess.isPhotographer && (
                <span className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-on-accent">
                  <CameraIcon size={12} /> You're a photographer
                </span>
              )}
              {viewerAccess.isOrganizer && event.eventCode && (
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-surface-sunken px-3 py-1 text-xs text-text-muted transition hover:text-text"
                  aria-label="Copy event ID"
                >
                  {idCopied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                  <span>Event ID</span>
                  <span className="font-mono tracking-widest">{formatEventCode(event.eventCode)}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---------- Stats ---------- */}
      {isOrganizer && stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 animate-fade-in sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:shadow-card">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users size={18} />
            </div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Participants</p>
            <p className="text-2xl font-semibold text-primary">{stats.participantCount}</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:shadow-card">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CameraIcon size={18} />
            </div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Photographers</p>
            <p className="text-2xl font-semibold text-primary">{stats.photographerCount}</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:shadow-card">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ImageIcon size={18} />
            </div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Photos</p>
            <p className="text-2xl font-semibold text-primary">{stats.totalPhotos}</p>
            <p className="mt-0.5 text-[11px] text-text-muted">
              {stats.officialPhotos} official · {stats.communityPhotos} community
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:shadow-card">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-accent/15" aria-hidden="true" />
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-accent">
              <Heart size={18} className="fill-accent" />
            </div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Engagement</p>
            <div className="flex items-end gap-1.5">
              <p key={stats.totalLikes} className="animate-scale-in text-2xl font-semibold leading-tight text-primary">
                {stats.totalLikes}
              </p>
              <span className="pb-0.5 text-sm text-text-muted">likes</span>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted">
              <Download size={11} /> {stats.totalDownloads} downloads
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition ${tab === t ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-primary"
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Gallery" && (
        <div>
          <div className="flex gap-2 mb-4">
            {["OFFICIAL", "COMMUNITY"].map((a) => (
              <button
                key={a}
                onClick={() => setAlbum(a)}
                className={`px-3 py-1 rounded-full text-xs transition ${album === a ? "bg-primary text-white" : "bg-surface border border-border text-text-muted hover:text-primary"
                  }`}
              >
                {a}
              </button>
            ))}
          </div>
          {photosLoading ? (
            <PhotoGridSkeleton count={8} />
          ) : photos.length === 0 ? (
            <EmptyState
              icon={Images}
              title="No photos in this album yet"
              description={
                album === "OFFICIAL"
                  ? "Once a photographer uploads, official photos will show up here."
                  : "Participant-uploaded photos will show up here."
              }
            />
          ) : (
            <div className="columns-2 sm:columns-3 md:columns-4 photo-masonry">
              {photos.map((photo, i) => (
                <PhotoCard
                  key={photo._id}
                  photo={photo}
                  onOpen={() => setLightboxIndex(i)}
                  onLike={handleLike}
                  onFavourite={handleFavourite}
                  onDownload={handleDownload}
                  onBuy={handleBuy}
                  onDelete={isOrganizer ? handleDeletePhoto : undefined}
                  downloading={downloadingId === photo._id}
                  liked={likedIds.has(photo._id)}
                  favourited={favouritedIds.has(photo._id)}

                />
              ))}
            </div>
          )}
          {lightboxIndex !== null && (
            <PhotoLightbox
              photos={photos}
              index={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
              onNavigate={setLightboxIndex}
              onDownload={handleDownload}
              onLike={handleLike}
              onFavourite={handleFavourite}
              onDelete={isOrganizer ? handleDeletePhoto : undefined}
              downloadingId={downloadingId}
              likedIds={likedIds}
              favouritedIds={favouritedIds}
            />
          )}

        </div>
      )}

      {tab === "Upload" && (
        <PhotoUploader
          eventId={eventId}
          canUploadOfficial={viewerAccess.isPhotographer}
          canUploadCommunity={viewerAccess.isParticipant}
          onUploaded={() => {
            loadPhotos();
            refreshStats();
          }}
        />
      )}

      {tab === "Find My Photos" && (
        <FindMyPhotosPanel
          eventId={eventId}
          onDownload={handleDownload}
          onBuy={handleBuy}
          onLike={handleLike}
          onFavourite={handleFavourite}
          likedIds={likedIds}
          favouritedIds={favouritedIds}
          photoPatches={photoPatches}
          removedIds={removedIds}
        />
      )}

      {tab === "Participants" && (
        <ParticipantsPanel eventId={eventId} isOrganizer={isOrganizer} onChanged={refreshStats} />
      )}
      {tab === "Photographers" && (
        <PhotographersPanel eventId={eventId} isOrganizer={isOrganizer} onChanged={refreshStats} />
      )}
      {showSettings && viewerAccess.isOrganizer && (
        <Modal title="Event Settings" size="lg" onClose={() => setShowSettings(false)}>
          <div className="space-y-6">
            <EventIdCard eventCode={event.eventCode} />
            <CoverImageCard
              eventId={eventId}
              coverImageUrl={event.coverImageUrl}
              onChange={(coverImageUrl) => setEvent((prev) => ({ ...prev, coverImageUrl }))}
              onRequestConfirm={setConfirmState}
            />
            <div className="bg-surface border border-border rounded-xl p-6 shadow-card">
              <h3 className="font-medium mb-1 flex items-center gap-1.5">
                <KeyRound size={16} />
                Participant Passcode
              </h3>
              <p className="text-xs text-text-muted mb-4">
                Share this with people joining as regular participants. You can come back and view it here any time —
                it isn't only shown once anymore.
              </p>
              {passcodeLoading ? (
                <div className="skeleton h-11 w-full rounded-lg" />
              ) : passcodeNeedsRegen ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-error">
                    This event's passcode was created before this feature existed and can't be recovered — generate a
                    new one to enable viewing it going forward.
                  </p>
                  <button
                    onClick={handleRegeneratePasscode}
                    disabled={regenerating}
                    className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition w-fit"
                  >
                    {regenerating ? "Generating..." : "Generate New Passcode"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center justify-between bg-surface-sunken border border-border rounded-lg px-4 py-2.5 font-mono text-lg tracking-[0.3em] text-primary">
                    {passcodeVisible ? passcode : "••••••"}
                    <button
                      onClick={() => setPasscodeVisible((v) => !v)}
                      className="text-text-muted hover:text-primary transition"
                      aria-label={passcodeVisible ? "Hide passcode" : "Show passcode"}
                    >
                      {passcodeVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button
                    onClick={handleCopyPasscode}
                    className="flex items-center justify-center w-10 h-10 rounded-lg border border-border hover:bg-surface-hover transition shrink-0"
                    aria-label="Copy passcode"
                  >
                    {passcodeCopied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                  </button>
                </div>
              )}
              {!passcodeLoading && !passcodeNeedsRegen && (
                <button
                  onClick={handleRegeneratePasscode}
                  disabled={regenerating}
                  className="text-xs text-text-muted hover:text-error transition mt-3"
                >
                  {regenerating ? "Generating..." : "Generate a new passcode instead"}
                </button>
              )}
            </div>
            <PasscodeCard
              title="Photographer Passcode"
              description="A separate passcode for your official photographers. They enter it with the Event ID under Join as Photographer. Don't share it with regular participants."
              fetchPasscode={() => eventService.getPhotographerPasscode(eventId)}
              regeneratePasscode={() => eventService.regeneratePhotographerPasscode(eventId)}
              onRequestConfirm={setConfirmState}
            />
            <div className="bg-surface border border-border rounded-xl p-6 shadow-card">
              <h3 className="font-medium mb-1">Participant QR Code</h3>
              <p className="text-xs text-text-muted mb-4">Anyone who scans this joins as a regular participant.</p>
              {!joinQr ? (
                <button onClick={loadQr} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm">
                  Generate QR
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG value={joinQr.joinUrl} size={160} />
                  </div>
                  <p className="text-xs text-text-muted break-all">{joinQr.joinUrl}</p>
                </div>
              )}
            </div>

            <div className="bg-surface border border-border rounded-xl p-6 shadow-card">
              <h3 className="font-medium mb-1 text-primary">Photographer QR Code</h3>
              <p className="text-xs text-text-muted mb-4">
                A separate code — only share this with your official photographers. Scanning it assigns them as a
                photographer for this event (in addition to the organizer adding them by email in the Photographers
                tab).
              </p>
              {!photographerJoinQr ? (
                <button
                  onClick={loadPhotographerQr}
                  className="bg-accent hover:bg-accent/90 text-on-accent font-medium px-4 py-2 rounded-lg text-sm"
                >
                  Generate Photographer QR
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG value={photographerJoinQr.joinUrl} size={160} />
                  </div>
                  <p className="text-xs text-text-muted break-all">{photographerJoinQr.joinUrl}</p>
                </div>
              )}
            </div>

            <div className="bg-surface border border-border rounded-xl p-6 shadow-card">
              <h3 className="font-medium mb-1 flex items-center gap-1.5">
                <CalendarClock size={16} />
                Extend Event Duration
              </h3>
              <p className="text-xs text-text-muted mb-4">
                Currently expires {new Date(event.expiryDate).toLocaleString()}. Pushing this into the future
                automatically re-activates the event if it had already expired.
              </p>
              <form onSubmit={handleExtend} className="flex flex-col gap-3">
                <input
                  type="datetime-local"
                  required
                  min={nowLocalInput()}
                  className="px-3 py-2 rounded-lg bg-surface-sunken border border-border focus:border-primary outline-none text-sm"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={extending}
                  className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition"
                >
                  {extending ? "Extending..." : "Extend Event"}
                </button>
              </form>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6 shadow-card">
              <h3 className="font-medium mb-1 flex items-center gap-1.5">
                <RefreshCw size={16} />
                Sync with Cloudinary
              </h3>
              <p className="text-xs text-text-muted mb-4">
                If a photo was deleted directly in your Cloudinary dashboard instead of through SnapShare, it can get
                stuck here pointing at a dead file. Run this to clean those up.
              </p>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1.5 bg-surface-hover hover:bg-secondary/40 disabled:opacity-50 text-primary px-4 py-2 rounded-lg text-sm transition"
              >
                <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Checking..." : "Sync Now"}
              </button>
            </div>

            <div className="bg-error/5 border border-error/30 rounded-xl p-6">
              <h3 className="font-medium mb-1 text-error flex items-center gap-1.5">
                <Trash2 size={16} />
                Danger Zone
              </h3>
              <p className="text-xs text-text-muted mb-4">
                Permanently deletes this event, all its photos, participant records, and photographer assignments.
                This cannot be undone.
              </p>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-error hover:bg-error/90 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                {deleting ? "Deleting..." : "Delete Event"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {confirmState && (
        <ConfirmDialog
          {...confirmState}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}