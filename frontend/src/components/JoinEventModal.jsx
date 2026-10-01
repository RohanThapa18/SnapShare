
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

export default function JoinEventModal({ onClose, onJoined }) {
  const navigate = useNavigate();

  const [mode, setMode] = useState("code");
  const [eventId, setEventId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await eventService.joinEvent(eventId.trim(), {
        passcode: passcode.trim().toUpperCase(),
      });

      toast.success("Joined event!");
      onJoined(eventId.trim());
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to join event"
      );
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

  const tabBase =
    "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20";

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10";

  return (
    <Modal title="Join an Event" onClose={onClose}>
      <div className="space-y-5">
        {/* Mode tabs */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
          <button
            type="button"
            onClick={() => setMode("code")}
            className={`${tabBase} ${
              mode === "code"
                ? "bg-[#293866] text-white shadow-sm"
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
                ? "bg-[#293866] text-white shadow-sm"
                : "text-slate-500 hover:bg-white hover:text-slate-800"
            }`}
          >
            <QrCode size={16} />
            Scan QR
          </button>
        </div>

        {mode === "code" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-500">
              Ask the organizer for the Event ID and passcode.
            </p>

            {/* Event ID */}
            <div>
              <label
                htmlFor="join-event-id"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Event ID
              </label>

              <input
                id="join-event-id"
                type="text"
                required
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                placeholder="Enter event ID"
                className={inputClass}
              />
            </div>

            {/* Passcode */}
            <div>
              <label
                htmlFor="join-event-passcode"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Passcode
              </label>

              <input
                id="join-event-passcode"
                type="text"
                required
                maxLength={6}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter 6-character passcode"
                className={`${inputClass} uppercase tracking-widest`}
              />
            </div>

            {/* Join button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#293866] to-[#394b83] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-950/10 transition-all duration-300 hover:-translate-y-0.5 hover:from-[#202c52] hover:to-[#30416f] hover:shadow-lg hover:shadow-indigo-950/20 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? "Joining..." : "Join"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-500">
              Point your camera at the organizer's QR code.
            </p>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-colors duration-200 hover:border-indigo-200">
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