
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
      await eventService.joinEventAsPhotographer(
        eventId.trim(),
        photographerToken.trim()
      );

      toast.success("Joined event as photographer!");
      onJoined(eventId.trim());
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Failed to join as photographer"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (decodedText) => {
    const path = parsePathFromScan(decodedText);

    if (!path || !path.startsWith("/join-photographer/")) {
      toast.error(
        "That QR code doesn't look like a SnapShare photographer join code"
      );
      return;
    }

    onClose();
    navigate(path);
  };

  const tabBase =
    "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/20";

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-400/10";

  return (
    <Modal title="Join as Photographer" onClose={onClose}>
      <div className="space-y-5">
        {/* Description */}
        <p className="text-sm leading-relaxed text-slate-500">
          This is a separate code from the regular participant passcode.
          The organizer shares this one only with official photographers.
        </p>

        {/* Mode tabs */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
          <button
            type="button"
            onClick={() => setMode("code")}
            className={`${tabBase} ${
              mode === "code"
                ? "bg-[#e99b79] text-slate-900 shadow-sm"
                : "text-slate-500 hover:bg-white hover:text-slate-800"
            }`}
          >
            <Keyboard size={16} />
            Enter Code
          </button>

          <button
            type="button"
            onClick={() => setMode("scan")}
            className={`${tabBase} ${
              mode === "scan"
                ? "bg-[#e99b79] text-slate-900 shadow-sm"
                : "text-slate-500 hover:bg-white hover:text-slate-800"
            }`}
          >
            <QrCode size={16} />
            Scan QR
          </button>
        </div>

        {mode === "code" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Event ID */}
            <div>
              <label
                htmlFor="photographer-event-id"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Event ID
              </label>

              <input
                id="photographer-event-id"
                type="text"
                required
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                placeholder="Enter event ID"
                className={inputClass}
              />
            </div>

            {/* Photographer code */}
            <div>
              <label
                htmlFor="photographer-code"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Photographer Code
              </label>

              <input
                id="photographer-code"
                type="text"
                required
                value={photographerToken}
                onChange={(e) => setPhotographerToken(e.target.value)}
                placeholder="Enter photographer code"
                className={inputClass}
              />
            </div>

            {/* Join button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#df906c] to-[#edaa88] px-5 py-3 text-sm font-semibold text-slate-900 shadow-md shadow-orange-900/10 transition-all duration-300 hover:-translate-y-0.5 hover:from-[#d9825d] hover:to-[#e79b76] hover:shadow-lg hover:shadow-orange-900/15 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? "Joining..." : "Join as Photographer"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-500">
              Point your camera at the organizer's photographer QR code.
            </p>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-colors duration-200 hover:border-orange-200">
              <QrScanner
                onScan={handleScan}
                onError={(msg) => toast.error(msg)}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}