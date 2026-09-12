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
    // Not an absolute URL — assume it's already a path like /join/abc/xyz
    return decodedText.startsWith("/") ? decodedText : null;
  }
};

export default function JoinEventModal({ onClose, onJoined }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("code"); // "code" | "scan"
  const [eventId, setEventId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await eventService.joinEvent(eventId.trim(), { passcode: passcode.trim().toUpperCase() });
      toast.success("Joined event!");
      onJoined(eventId.trim());
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to join event");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (decodedText) => {
    const path = parsePathFromScan(decodedText);
    if (!path || !path.startsWith("/join/")) {
      toast.error("That QR code doesn't look like a SnapShare join code");
      return;
    }
    onClose();
    navigate(path);
  };

  return (
    <Modal title="Join an Event" onClose={onClose}>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("code")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition ${
            mode === "code" ? "bg-primary text-white" : "bg-surface-sunken text-text-muted"
          }`}
        >
          <Keyboard size={14} /> Enter Code
        </button>
        <button
          onClick={() => setMode("scan")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition ${
            mode === "scan" ? "bg-primary text-white" : "bg-surface-sunken text-text-muted"
          }`}
        >
          <QrCode size={14} /> Scan QR
        </button>
      </div>

      {mode === "code" ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm text-text-muted mb-1">Ask the organizer for the Event ID and passcode.</p>
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
            <label className="block text-xs text-text-muted mb-1">Passcode</label>
            <input
              required
              maxLength={6}
              className="w-full px-3 py-2 rounded-lg bg-surface-sunken border border-border focus:border-primary outline-none uppercase text-sm"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-2 rounded-lg transition text-sm"
          >
            {loading ? "Joining..." : "Join"}
          </button>
        </form>
      ) : (
        <div>
          <p className="text-sm text-text-muted mb-3">Point your camera at the organizer's QR code.</p>
          <QrScanner onScan={handleScan} onError={(msg) => toast.error(msg)} />
        </div>
      )}
    </Modal>
  );
}
