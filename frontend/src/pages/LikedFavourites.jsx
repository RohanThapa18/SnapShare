import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Heart, Bookmark } from "lucide-react";
import * as photoService from "../services/photoService";
import BackButton from "../components/BackButton";
import PhotoCard from "../components/PhotoCard";
import PhotoLightbox from "../components/PhotoLightbox";
import EmptyState from "../components/EmptyState";
import { PhotoGridSkeleton } from "../components/Skeleton";
import { triggerBlobDownload, filenameFromContentDisposition } from "../utils/download";

const TABS = [
  { key: "liked", label: "Liked", icon: Heart },
  { key: "favourited", label: "Favourited", icon: Bookmark },
];

export default function LikedFavourites() {
  const [tab, setTab] = useState("liked");
  const [loading, setLoading] = useState(true);
  const [likedPhotos, setLikedPhotos] = useState([]);
  const [favouritedPhotos, setFavouritedPhotos] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const photos = tab === "liked" ? likedPhotos : favouritedPhotos;
  const setPhotos = tab === "liked" ? setLikedPhotos : setFavouritedPhotos;

  const load = async () => {
    setLoading(true);
    try {
      const [likesRes, favouritesRes] = await Promise.all([
        photoService.listMyLikes(),
        photoService.listMyFavourites(),
      ]);
      setLikedPhotos(likesRes.data.data.photos);
      setFavouritedPhotos(favouritesRes.data.data.photos);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't load your photos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleLike = async (photo) => {
    const isLiked = photo.likedByMe;
    const patch = (list) =>
      list
        .map((p) => (p._id === photo._id ? { ...p, likedByMe: !isLiked, likeCount: (p.likeCount ?? 0) + (isLiked ? -1 : 1) } : p))
        // if we're unliking from the Liked tab, drop it from that list immediately
        .filter((p) => !(tab === "liked" && p._id === photo._id && isLiked));
    setLikedPhotos((prev) => patch(prev));
    setFavouritedPhotos((prev) =>
      prev.map((p) => (p._id === photo._id ? { ...p, likedByMe: !isLiked, likeCount: (p.likeCount ?? 0) + (isLiked ? -1 : 1) } : p))
    );
    try {
      isLiked ? await photoService.unlikePhoto(photo._id) : await photoService.likePhoto(photo._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't update like");
      load();
    }
  };

  const handleFavourite = async (photo) => {
    const isFavourited = photo.favouritedByMe;
    const patch = (list) =>
      list
        .map((p) => (p._id === photo._id ? { ...p, favouritedByMe: !isFavourited } : p))
        .filter((p) => !(tab === "favourited" && p._id === photo._id && isFavourited));
    setFavouritedPhotos((prev) => patch(prev));
    setLikedPhotos((prev) => prev.map((p) => (p._id === photo._id ? { ...p, favouritedByMe: !isFavourited } : p)));
    try {
      isFavourited ? await photoService.unfavouritePhoto(photo._id) : await photoService.favouritePhoto(photo._id);
      toast.success(isFavourited ? "Removed from favourites" : "Added to favourites");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't update favourite");
      load();
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <BackButton />
      <h1 className="text-2xl font-semibold mb-1">Liked & Favourited</h1>
      <p className="text-text-muted text-sm mb-6">Every photo you've liked or favourited, across all your events.</p>

      <div className="flex gap-2 mb-6 border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === key ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <Icon size={15} />
            {label}
            <span className="text-xs text-text-muted">
              ({key === "liked" ? likedPhotos.length : favouritedPhotos.length})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <PhotoGridSkeleton count={8} />
      ) : photos.length === 0 ? (
        <EmptyState
          title={tab === "liked" ? "No liked photos yet" : "No favourited photos yet"}
          description="Open any event's gallery and tap the heart or bookmark icon on a photo to save it here."
        />
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
          {photos.map((photo, i) => (
            <div key={photo._id} className="break-inside-avoid mb-4">
              <PhotoCard
                photo={photo}
                onOpen={() => setLightboxIndex(i)}
                onLike={handleLike}
                onFavourite={handleFavourite}
                onDownload={handleDownload}
                liked={photo.likedByMe}
                favourited={photo.favouritedByMe}
                downloading={downloadingId === photo._id}
              />
              {photo.eventId?.title && (
                <Link
                  to={`/events/${photo.eventId._id}`}
                  className="block text-xs text-text-muted hover:text-primary mt-1 px-1 truncate"
                >
                  from {photo.eventId.title}
                </Link>
              )}
            </div>
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
          likedIds={new Set(photos.filter((p) => p.likedByMe).map((p) => p._id))}
          favouritedIds={new Set(photos.filter((p) => p.favouritedByMe).map((p) => p._id))}
          downloadingId={downloadingId}
        />
      )}
    </div>
  );
}