import { useCallback, useState, useEffect, useMemo } from "react";
import { UploadCloud, X, ImagePlus } from "lucide-react";
import toast from "react-hot-toast";
import * as photoService from "../services/photoService";

export default function PhotoUploader({ eventId, canUploadOfficial, canUploadCommunity, onUploaded }) {
  const [targetAlbum, setTargetAlbum] = useState(canUploadOfficial ? "OFFICIAL" : "COMMUNITY");
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setTargetAlbum(canUploadOfficial ? "OFFICIAL" : "COMMUNITY");
  }, [canUploadOfficial, canUploadCommunity]);

  // Local thumbnail previews for whatever's currently selected. Revoked
  // whenever the selection changes so we don't leak object URLs.
  const previews = useMemo(() => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  if (!canUploadOfficial && !canUploadCommunity) {
    return (
      <p className="text-text-muted text-sm">
        You need to join this event before you can upload photos.
      </p>
    );
  }

  const handleFiles = (fileList) => setFiles((prev) => [...prev, ...Array.from(fileList)]);
  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    files.forEach((f) => formData.append("photos", f));
    if (targetAlbum === "OFFICIAL") {
      formData.append("isPaid", isPaid);
      if (isPaid) formData.append("price", price);
    }

    try {
      const uploadFn =
        targetAlbum === "OFFICIAL" ? photoService.uploadOfficialPhotos : photoService.uploadCommunityPhotos;
      await uploadFn(eventId, formData, (evt) => setProgress(Math.round((evt.loaded / evt.total) * 100)));
      toast.success(`${files.length} photo(s) uploaded — AI processing in background`);
      setFiles([]);
      onUploaded?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {canUploadOfficial && canUploadCommunity ? (
        <div className="flex gap-2 mb-4">
          {["OFFICIAL", "COMMUNITY"].map((a) => (
            <button
              key={a}
              onClick={() => setTargetAlbum(a)}
              className={`px-3 py-1 rounded-full text-xs transition ${
                targetAlbum === a ? "bg-primary text-white" : "bg-surface border border-border text-text-muted hover:text-primary"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted mb-4">
          Uploading to the <span className="text-primary font-medium">{targetAlbum}</span> album
        </p>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-card p-10 text-center transition-colors duration-150 ${
          dragOver ? "border-primary bg-secondary/15" : "border-border hover:border-secondary"
        }`}
      >
        <UploadCloud className={`mx-auto mb-3 transition-transform ${dragOver ? "scale-110 text-primary" : "text-text-muted"}`} size={32} />
        <p className="text-text-muted mb-2">Drag &amp; drop photos here, or</p>
        <label className="inline-block bg-surface hover:bg-surface-hover border border-border px-4 py-2 rounded-control cursor-pointer transition text-sm">
          Browse Files
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files.length && handleFiles(e.target.files)}
          />
        </label>
      </div>

      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 gap-2 animate-fade-in">
          {previews.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              {!uploading && (
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  aria-label="Remove"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary flex items-center justify-center cursor-pointer transition text-text-muted hover:text-primary">
            <ImagePlus size={18} />
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => e.target.files.length && handleFiles(e.target.files)}
            />
          </label>
        </div>
      )}

      {targetAlbum === "OFFICIAL" && (
        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="accent-primary" />
            Enable paid downloads
          </label>
          {isPaid && (
            <input
              type="number"
              min="1"
              placeholder="Price (₹) per photo"
              className="px-3 py-1.5 rounded-control bg-surface-sunken border border-border text-sm w-40 focus:border-primary outline-none"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          )}
        </div>
      )}

      {uploading && (
        <div className="mt-4">
          <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-text-muted mt-1">Uploading… {progress}%</p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!files.length || uploading}
        className="mt-4 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-6 py-2.5 rounded-control transition font-medium shadow-sm"
      >
        {uploading ? `Uploading ${progress}%` : `Upload${files.length ? ` ${files.length} photo${files.length === 1 ? "" : "s"}` : ""}`}
      </button>
    </div>
  );
}
