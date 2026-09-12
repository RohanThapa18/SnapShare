import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, Keyboard } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "./Modal";
import QrScanner from "./QrScanner";
import * as eventService from "../services/eventService";

const parsePathFromScan = (decodedText) => {
  try {
    return new URL(decodedText).pathname;
  } catch {
    return decodedText.startsWith("/") ? decodedText : null;
  }
};

export default function JoinAsPhotographerModal({ onClose, onJoined }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("code");
  const [eventId, setEventId] = useState("");
  const [photographerToken, setPhotographerToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await eventService.joinEventAsPhotographer(eventId.trim(), photographerToken.trim());
      toast.success("Joined event as photographer!");
      onJoined(eventId.trim());
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to join as photographer");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (decodedText) => {
    const path = parsePathFromScan(decodedText);
    if (!path || !path.startsWith("/join-photographer/")) {
      toast.error("That QR code doesn't look like a SnapShare photographer join code");
      return;
    }
    onClose();
    navigate(path);
  };

  return (
    <Modal title="Join as Photographer" onClose={onClose}>
      <p className="text-sm text-text-muted mb-4">
        This is a separate code from the regular participant passcode — the organizer shares this one only with
        official photographers.
      </p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("code")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition ${
            mode === "code" ? "bg-accent text-on-accent" : "bg-surface-sunken text-text-muted"
          }`}
        >
          <Keyboard size={14} /> Enter Code
        </button>
        <button
          onClick={() => setMode("scan")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition ${
            mode === "scan" ? "bg-accent text-on-accent" : "bg-surface-sunken text-text-muted"
          }`}
        >
          <QrCode size={14} /> Scan QR
        </button>
      </div>

      {mode === "code" ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Event ID</label>
            <input
              required
              className="w-full px-3 py-2 rounded-lg bg-surface-sunken border border-border focus:border-primary outline-none text-sm"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Photographer Code</label>
            <input
              required
              className="w-full px-3 py-2 rounded-lg bg-surface-sunken border border-border focus:border-primary outline-none text-sm"
              value={photographerToken}
              onChange={(e) => setPhotographerToken(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-on-accent font-medium py-2 rounded-lg transition text-sm"
          >
            {loading ? "Joining..." : "Join as Photographer"}
          </button>
        </form>
      ) : (
        <div>
          <p className="text-sm text-text-muted mb-3">Point your camera at the organizer's photographer QR code.</p>
          <QrScanner onScan={handleScan} onError={(msg) => toast.error(msg)} />
        </div>
      )}
    </Modal>
  );
}
