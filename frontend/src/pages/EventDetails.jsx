import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, LogOut, Trash2, RefreshCw, CalendarClock, Eye, EyeOff, KeyRound, Images, Users, Camera as CameraIcon, ImageIcon } from "lucide-react";
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

const TABS = ["Gallery", "Upload", "Find My Photos", "Participants", "Photographers", "Settings"];

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
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

  // Organizer passcode reveal — never fetched until the organizer opens
  // Settings, decrypted server-side on demand (see event.controller.js).
  const [passcode, setPasscode] = useState(null);
  const [passcodeVisible, setPasscodeVisible] = useState(false);
  const [passcodeNeedsRegen, setPasscodeNeedsRegen] = useState(false);
  const [passcodeLoading, setPasscodeLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [passcodeCopied, setPasscodeCopied] = useState(false);

  const isOrganizer = viewerAccess.isOrganizer;

  const loadEvent = () =>
    eventService.getEvent(id).then((res) => {
      setEvent(res.data.data.event);
      setViewerAccess(res.data.data.viewerAccess);
    });
  const loadPhotos = () => {
    setPhotosLoading(true);
    return photoService
      .listPhotos(id, { album })
      .then((res) => setPhotos(res.data.data.photos))
      .finally(() => setPhotosLoading(false));
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

  useEffect(() => {
    if (viewerAccess.isOrganizer) {
      eventService.getEventStats(id).then((res) => setStats(res.data.data)).catch(() => { });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, viewerAccess.isOrganizer]);

  useEffect(() => {
    if (tab === "Gallery") loadPhotos();
  }, [tab, album, id]);

  useEffect(() => {
    if (tab === "Settings" && isOrganizer && passcode === null && !passcodeLoading) loadPasscode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isOrganizer]);

  const handleBuy = async (photo) => {
    try {
      const res = await paymentService.createOrder({
        eventId: id,
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
      toast.success("Download started");
    } catch (err) {
      toast.error(err.response?.data?.message || "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleLike = async (photo) => {
    try {
      await photoService.likePhoto(photo._id);
      loadPhotos();
    } catch {
      /* likely already liked; ignore */
    }
  };

  const handleFavourite = async (photo) => {
    try {
      await photoService.favouritePhoto(photo._id);
      toast.success("Added to favourites");
    } catch {
      /* already favourited; ignore */
    }
  };

  const loadQr = async () => {
    const res = await eventService.getJoinQr(id);
    setJoinQr(res.data.data);
  };

  const loadPhotographerQr = async () => {
    const res = await eventService.getPhotographerJoinQr(id);
    setPhotographerJoinQr(res.data.data);
  };

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(id);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 1500);
  };

  const handleLeave = async () => {
    if (!window.confirm("Leave this event? You'll need the passcode or QR code again to rejoin.")) return;
    setLeaving(true);
    try {
      await eventService.leaveEvent(id);
      toast.success("Left the event");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to leave event");
    } finally {
      setLeaving(false);
    }
  };

  const handleDeletePhoto = async (photo) => {
  if (!window.confirm("Delete this photo permanently? This can't be undone.")) return;
  try {
    await photoService.deletePhoto(photo._id);
    setPhotos((prev) => prev.filter((p) => p._id !== photo._id));
    toast.success("Photo deleted");
  } catch (err) {
    toast.error(err.response?.data?.message || "Couldn't delete photo");
  }
};

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Delete this event permanently? This removes all photos, participants, and cannot be undone."
      )
    )
      return;
    setDeleting(true);
    try {
      await eventService.deleteEvent(id);
      toast.success("Event deleted");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete event");
      setDeleting(false);
    }
  };

  const handleExtend = async (e) => {
    e.preventDefault();
    if (!newExpiryDate) return;
    setExtending(true);
    try {
      const res = await eventService.updateEvent(id, { expiryDate: newExpiryDate });
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
      const res = await eventService.getEventPasscode(id);
      setPasscode(res.data.data.passcode);
      setPasscodeNeedsRegen(res.data.data.needsRegeneration);
      setPasscodeVisible(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't load the passcode");
    } finally {
      setPasscodeLoading(false);
    }
  };

  const handleRegeneratePasscode = async () => {
    if (
      passcode &&
      !window.confirm("Generate a new passcode? The current one will stop working immediately.")
    )
      return;
    setRegenerating(true);
    try {
      const res = await eventService.regeneratePasscode(id);
      setPasscode(res.data.data.passcode);
      setPasscodeNeedsRegen(false);
      setPasscodeVisible(true);
      toast.success("New passcode generated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't generate a new passcode");
    } finally {
      setRegenerating(false);
    }
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
      const res = await photoService.syncPhotosWithCloudinary(id);
      toast.success(res.data.message);
      loadPhotos();
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
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-primary">{event.title}</h1>
          <p className="text-text-muted text-sm mt-1">
            {new Date(event.date).toLocaleDateString()} · {event.location} · {event.status}
          </p>
          {(viewerAccess.isOrganizer || viewerAccess.isPhotographer) && (
            <p className="text-xs text-primary mt-1">
              {viewerAccess.isOrganizer && "You organize this event"}
              {viewerAccess.isOrganizer && viewerAccess.isPhotographer && " · "}
              {viewerAccess.isPhotographer && "You're a photographer for this event"}
            </p>
          )}
          {viewerAccess.isOrganizer && (
            <button
              onClick={handleCopyId}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text mt-2 transition"
            >
              {idCopied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
              Event ID: {id}
            </button>
          )}
        </div>

        {!viewerAccess.isOrganizer && (viewerAccess.isParticipant || viewerAccess.isPhotographer) && (
          <button
            onClick={handleLeave}
            disabled={leaving}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-error border border-border hover:border-error/50 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            <LogOut size={14} />
            {leaving ? "Leaving..." : "Leave Event"}
          </button>
        )}
      </div>

      {isOrganizer && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-fade-in">
          <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-1 flex items-center gap-1"><Users size={12} /> Participants</p>
            <p className="text-xl font-semibold text-primary">{stats.participantCount}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-1 flex items-center gap-1"><CameraIcon size={12} /> Photographers</p>
            <p className="text-xl font-semibold text-primary">{stats.photographerCount}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-1 flex items-center gap-1"><ImageIcon size={12} /> Photos</p>
            <p className="text-xl font-semibold text-primary">{stats.totalPhotos}</p>
            <p className="text-[11px] text-text-muted mt-0.5">{stats.officialPhotos} official · {stats.communityPhotos} community</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Engagement</p>
            <p className="text-xl font-semibold text-primary">{stats.totalDownloads}</p>
            <p className="text-[11px] text-text-muted mt-0.5">downloads · {stats.totalLikes} likes</p>
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
            />
          )}
        </div>
      )}

      {tab === "Upload" && (
        <PhotoUploader
          eventId={id}
          canUploadOfficial={viewerAccess.isPhotographer}
          canUploadCommunity={viewerAccess.isParticipant}
          onUploaded={loadPhotos}
        />
      )}

      {tab === "Find My Photos" && (
        <FindMyPhotosPanel
          eventId={id}
          onDownload={handleDownload}
          onBuy={handleBuy}
          onLike={handleLike}
          onFavourite={handleFavourite}
        />
      )}

      {tab === "Participants" && isOrganizer && <ParticipantsPanel eventId={id} />}

      {tab === "Photographers" && isOrganizer && <PhotographersPanel eventId={id} />}

      {tab === "Settings" && isOrganizer && (
        <div className="space-y-6 max-w-md">
          <div className="bg-surface border border-border rounded-xl p-6 shadow-card">
            <h3 className="font-medium mb-1 flex items-center gap-1.5">
              <KeyRound size={16} />
              Event Passcode
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
      )}
    </div>
  );
}
