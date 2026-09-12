import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import * as eventService from "../services/eventService";
import BackButton from "../components/BackButton";

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <div className="flex items-center gap-2 bg-surface-sunken border border-border rounded-lg px-3 py-2">
        <code className="flex-1 text-sm text-text truncate">{value}</code>
        <button onClick={handleCopy} className="text-text-muted hover:text-primary shrink-0">
          {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function CreateEvent() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", date: "", location: "", expiryDate: "" });
  const [loading, setLoading] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);
  const [passcode, setPasscode] = useState(null);
  const [joinQr, setJoinQr] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await eventService.createEvent(form);
      setCreatedEvent(res.data.data.event);
      setPasscode(res.data.data.passcode);
      toast.success("Event created!");

      // Show the participant QR right away so the organizer can share
      // it immediately without hunting for it in Settings.
      const qrRes = await eventService.getJoinQr(res.data.data.event._id);
      setJoinQr(qrRes.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  if (createdEvent) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <BackButton fallback="/dashboard" />
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold mb-2">Event Created!</h1>
          <p className="text-sm text-text-muted">
            Share the info below with participants. You can view the passcode again anytime from the event's
            Settings tab.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 shadow-card mb-4 space-y-4">
          <CopyField label="Event ID" value={createdEvent._id} />
          <CopyField label="Passcode" value={passcode} />
        </div>

        {joinQr && (
          <div className="bg-surface border border-border rounded-xl p-6 shadow-card mb-6 flex flex-col items-center gap-3">
            <p className="text-sm text-text-muted">Or let them scan this QR code to join instantly</p>
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG value={joinQr.joinUrl} size={180} />
            </div>
          </div>
        )}

        <button
          onClick={() => navigate(`/events/${createdEvent._id}`)}
          className="w-full bg-primary hover:bg-primary/90 text-white py-2 rounded-lg transition"
        >
          Go to Event
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <BackButton />
      <h1 className="text-2xl font-semibold mb-6">Create Event</h1>
      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-4">
        <div>
          <label className="block text-sm text-text-muted mb-1">Title</label>
          <input
            required
            className="w-full px-3 py-2 rounded-lg bg-surface-sunken border border-border focus:border-primary outline-none"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Description</label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-surface-sunken border border-border focus:border-primary outline-none"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Location</label>
          <input
            className="w-full px-3 py-2 rounded-lg bg-surface-sunken border border-border focus:border-primary outline-none"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Event Date</label>
            <input
              type="datetime-local"
              required
              className="w-full px-3 py-2 rounded-lg bg-surface-sunken border border-border focus:border-primary outline-none"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Expiry Date</label>
            <input
              type="datetime-local"
              required
              className="w-full px-3 py-2 rounded-lg bg-surface-sunken border border-border focus:border-primary outline-none"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-2 rounded-lg transition"
        >
          {loading ? "Creating..." : "Create Event"}
        </button>
      </form>
    </div>
  );
}
