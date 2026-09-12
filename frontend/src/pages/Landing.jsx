import { Navigate, Link } from "react-router-dom";
import {
  Camera,
  ScanFace,
  QrCode,
  Download,
  ShieldCheck,
  Images,
  Sparkles,
  UserPlus,
  PackageCheck,
  Lock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const STEPS = [
  {
    icon: QrCode,
    title: "Join the event",
    description: "Scan a QR code or enter the passcode your organizer shared — no separate app, no account type to pick.",
  },
  {
    icon: ScanFace,
    title: "Upload a selfie",
    description: "One clear photo of your face. It's used only to search this event's photos and is never stored.",
  },
  {
    icon: PackageCheck,
    title: "Get your photos",
    description: "Every photo you appear in, ready to browse, download individually, or grab all at once as a ZIP.",
  },
];

const FEATURES = [
  { icon: ScanFace, title: "Face-matching search", description: "AI finds every photo you're in across an entire event gallery in seconds." },
  { icon: Images, title: "Official + community albums", description: "Photographer uploads and guest-submitted shots, kept in their own separate spaces." },
  { icon: Download, title: "True high-resolution downloads", description: "Full-quality originals, not compressed previews — one photo or your whole collection at once." },
  { icon: Lock, title: "Private by design", description: "Passcodes and QR tokens gate every event; paid photos stay watermarked until purchased." },
];

export default function Landing() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-text-muted">Loading...</div>;
  }

  // Logged-in users go straight to their dashboard — there's no
  // separate role-specific landing anymore.
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/25 via-transparent to-transparent" aria-hidden="true" />
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left animate-slide-up">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-secondary/40 px-3 py-1.5 rounded-full mb-5">
                <Sparkles size={13} /> AI-powered event photography
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium text-primary leading-[1.1] mb-5">
                Find your event photos <span className="italic">using your face.</span>
              </h1>
              <p className="text-text-muted text-base sm:text-lg max-w-md mx-auto md:mx-0 mb-8">
                Upload a selfie, and SnapShare finds every photo you're in — out of thousands — in seconds. No
                scrolling, no guessing, no waiting on a photographer's Google Drive link.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link
                  to="/register"
                  className="bg-primary hover:bg-primary-hover text-white px-7 py-3 rounded-control transition font-medium shadow-card"
                >
                  Get Started
                </Link>
                <Link
                  to="/login"
                  className="bg-surface hover:bg-surface-hover border border-border text-primary px-7 py-3 rounded-control transition font-medium"
                >
                  Log In
                </Link>
              </div>
            </div>

            {/* Decorative photo-stack mockup — pure CSS, no stock imagery */}
            <div className="relative h-72 sm:h-96 hidden md:block" aria-hidden="true">
              <div className="absolute top-6 left-8 w-48 h-60 rounded-2xl bg-secondary/60 shadow-card rotate-[-9deg]" />
              <div className="absolute top-2 right-6 w-48 h-60 rounded-2xl bg-accent/70 shadow-card rotate-[7deg]" />
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-52 h-64 rounded-2xl bg-surface border border-border shadow-elevated flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <ScanFace className="text-primary" size={30} />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-medium text-primary">Match found</p>
                  <p className="text-xs text-text-muted">128 photos · 96% confidence</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
        <h2 className="font-display text-2xl sm:text-3xl text-primary text-center mb-2">How it works</h2>
        <p className="text-text-muted text-center mb-12 max-w-lg mx-auto">
          Three steps between you and every photo you're in.
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative bg-surface border border-border rounded-card p-6 shadow-sm">
              <span className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-white text-sm font-medium flex items-center justify-center shadow-card">
                {i + 1}
              </span>
              <step.icon className="text-primary mb-3" size={26} />
              <h3 className="font-medium text-primary mb-1.5">{step.title}</h3>
              <p className="text-sm text-text-muted">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="bg-surface/60 border-y border-border">
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
          <h2 className="font-display text-2xl sm:text-3xl text-primary text-center mb-12">
            Built for real events, not just galleries
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-secondary/40 flex items-center justify-center">
                  <f.icon className="text-primary" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-primary mb-1">{f.title}</h3>
                  <p className="text-sm text-text-muted">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Organizer / participant benefits ---------- */}
      <section className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-primary text-white rounded-card p-8 shadow-card">
            <UserPlus className="mb-4" size={26} />
            <h3 className="font-display text-xl mb-2">For organizers &amp; photographers</h3>
            <p className="text-white/80 text-sm mb-4">
              Create an event, share a QR code or passcode, and let guests find their own photos — no more fielding
              "can you send me the ones with me in them" messages.
            </p>
            <ul className="text-sm text-white/80 space-y-1.5">
              <li>• Separate official &amp; community albums</li>
              <li>• Passcodes you can view again anytime, not just once</li>
              <li>• Optional paid downloads for your official shots</li>
            </ul>
          </div>
          <div className="bg-surface border border-border rounded-card p-8 shadow-card">
            <Camera className="mb-4 text-primary" size={26} />
            <h3 className="font-display text-xl text-primary mb-2">For guests &amp; participants</h3>
            <p className="text-text-muted text-sm mb-4">
              Join with a code, upload one selfie, and get every photo you're in — official and candid — ready to
              download in full resolution.
            </p>
            <ul className="text-sm text-text-muted space-y-1.5">
              <li>• One-tap "Download All" as a ZIP</li>
              <li>• Full-screen viewer, swipe or arrow-key browsing</li>
              <li>• Your selfie is used only to search — never stored</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- Trust / security ---------- */}
      <section className="border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-14 text-center">
          <ShieldCheck className="text-primary mx-auto mb-3" size={28} />
          <h2 className="font-display text-xl text-primary mb-2">Privacy comes first</h2>
          <p className="text-text-muted text-sm max-w-lg mx-auto">
            Selfies are processed in memory and discarded immediately — never saved to disk or a database. Every
            search is scoped to the single event you've joined, and every download is checked against your actual
            purchase and membership records on the server, not just hidden in the interface.
          </p>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-text-muted">
          <span className="flex items-center gap-1.5 text-primary font-medium">
            <Camera size={16} /> SnapShare
          </span>
          <span>© {new Date().getFullYear()} SnapShare. Built for events, not feeds.</span>
        </div>
      </footer>
    </div>
  );
}
