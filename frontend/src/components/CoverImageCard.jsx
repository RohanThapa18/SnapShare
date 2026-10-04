import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Image as ImageIcon, Upload, Trash2 } from "lucide-react";
import * as eventService from "../services/eventService";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // matches the backend limit

export default function CoverImageCard({ eventId, coverImageUrl, onChange, onRequestConfirm }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const resetPicker = () => {
    setFile(null);
    setPreview("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handlePick = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;

    if (!ALLOWED_TYPES.includes(picked.type)) {
      toast.error("Please select a JPG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }
    if (picked.size > MAX_SIZE) {
      toast.error("Image size must be less than 5 MB.");
      e.target.value = "";
      return;
    }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const res = await eventService.updateEventCover(eventId, file);
      onChange(res.data.data.coverImageUrl);
      toast.success("Cover image updated");
      resetPicker();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update cover image");
    } finally {
      setSaving(false);
    }
  };

  const doRemove = async () => {
    setSaving(true);
    try {
      await eventService.removeEventCover(eventId);
      onChange(null);
      toast.success("Cover image removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove cover image");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () =>
    onRequestConfirm({
      title: "Remove cover image?",
      message: "The event will go back to showing a placeholder instead of a cover.",
      confirmLabel: "Remove",
      danger: true,
      onConfirm: doRemove,
    });

  const shown = preview || coverImageUrl;

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-card">
      <h3 className="font-medium mb-1 flex items-center gap-1.5">
        <ImageIcon size={16} />
        Cover Image
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Shown on the dashboard card and at the top of the event page. JPG, PNG or WebP, up to 5 MB.
      </p>

      <div className="aspect-video overflow-hidden rounded-lg border border-border bg-surface-sunken flex items-center justify-center">
        {shown ? (
          <img src={shown} alt="Event cover" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-text-muted">No cover image yet</span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handlePick}
        className="hidden"
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {file ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition"
            >
              {saving ? "Saving..." : "Save cover"}
            </button>
            <button
              onClick={resetPicker}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-surface-hover transition"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm border border-border hover:bg-surface-hover transition"
            >
              <Upload size={14} />
              {coverImageUrl ? "Change cover" : "Upload cover"}
            </button>
            {coverImageUrl && (
              <button
                onClick={handleRemove}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-error transition"
              >
                <Trash2 size={14} />
                Remove
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}