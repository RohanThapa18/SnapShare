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
  ArrowRight,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AmbientBackground from "../components/AmbientBackground"; // NEW

const STEPS = [
  {
    number: "01",
    icon: QrCode,
    title: "Join the event",
    description:
      "Scan a QR code or enter the passcode your organizer shared. No separate app and no complicated setup.",
  },
  {
    number: "02",
    icon: ScanFace,
    title: "Upload a selfie",
    description:
      "Upload one clear photo of yourself. Our AI uses it to search the event gallery for your photos.",
  },
  {
    number: "03",
    icon: PackageCheck,
    title: "Get your photos",
    description:
      "Browse every photo you appear in and download individual photos or your complete collection.",
  },
];

const FEATURES = [
  {
    icon: ScanFace,
    title: "AI face matching",
    description:
      "Find every photo you're in across an entire event gallery without manually scrolling through hundreds of images.",
  },
  {
    icon: Images,
    title: "Multiple photo collections",
    description:
      "Keep official photographer uploads and community-submitted photos organized in separate spaces.",
  },
  {
    icon: Download,
    title: "High-resolution downloads",
    description:
      "Download original-quality photos individually or collect your entire matched gallery at once.",
  },
  {
    icon: Lock,
    title: "Private by design",
    description:
      "Event access is protected with passcodes and QR tokens, while purchased photos remain protected until payment.",
  },
];

export default function Landing() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <Camera size={20} className="text-white" />
          </div>
          <p className="text-sm text-text-muted">
            Loading SnapShare...
          </p>
        </div>
      </div>
    );
  }

  // Logged-in users go directly to their dashboard.
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="landing-page-bg overflow-hidden">
      {/* Animated background — fixed behind all content (CHANGED) */}
      <AmbientBackground />

      {/* ==================== HERO ==================== */}

      <section className="relative overflow-hidden min-h-[620px] flex items-center bg-transparent">
        <div
          className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-transparent to-accent/5"
          aria-hidden="true"
        />

        <div className="max-w-6xl mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 relative w-full">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-14 items-center">
            {/* Hero text */}

            <div className="text-center md:text-left animate-slide-up">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-secondary/40 border border-secondary/40 px-3.5 py-1.5 rounded-full mb-5 transition-all duration-300 hover:bg-secondary/60 hover:border-secondary hover:shadow-sm hover:-translate-y-0.5">
                <Sparkles
                  size={13}
                  className="transition-transform duration-500 hover:rotate-12"
                />
              </span>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium text-primary leading-[1.1] mb-5">
                Find your event photos{" "}
                <span className="italic">
                  using your face.
                </span>
              </h1>

              <p className="text-base sm:text-lg leading-8 text-text-muted max-w-xl mx-auto md:mx-0 mb-9">
                Stop scrolling through hundreds of event photos.
                Upload one selfie and let SnapShare&apos;s AI find every
                memory you&apos;re in.
              </p>

              {/* CTA buttons */}

              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-7 py-3 rounded-control transition-all duration-300 font-medium shadow-card hover:shadow-elevated hover:-translate-y-1 active:translate-y-0 active:scale-[0.98]"
                >
                  Get Started
                  <ArrowRight size={17} />
                </Link>

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center bg-surface hover:bg-surface-hover border border-border text-primary px-7 py-3 rounded-control transition-all duration-300 font-medium hover:-translate-y-1 hover:shadow-card active:translate-y-0"
                >
                  Log In
                </Link>
              </div>

              {/* Trust indicators */}

              <div className="mt-7 flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  Privacy-conscious searches
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Check size={14} />
                  Simple event access
                </span>
              </div>
            </div>

            {/* ==================== ANIMATED PHOTO GALLERY ==================== */}

            <div
              className="hero-photo-scene animate-hero-scene-enter"
              role="img"
              aria-label="Preview of event photos discovered by SnapShare"
            >
              <div
                className="hero-photo-glow"
                aria-hidden="true"
              />

              {/* Photo 1: left */}

              <div className="hero-photo hero-photo-left">
                <img
                  src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=700&q=85"
                  alt=""
                  className="hero-photo-image"
                  loading="eager"
                  decoding="async"
                />

                <span className="hero-photo-label">
                  <Camera size={13} />
                  Event moments
                </span>
              </div>

              {/* Photo 2: right */}

              <div className="hero-photo hero-photo-right">
                <img
                  src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=700&q=85"
                  alt=""
                  className="hero-photo-image"
                  loading="eager"
                  decoding="async"
                />
              </div>

              {/* Photo 3: center */}

              <div className="hero-photo hero-photo-center">
                <img
                  src="https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=700&q=85"
                  alt=""
                  className="hero-photo-image"
                  loading="eager"
                  decoding="async"
                />

                {/* Animated scanning frame */}

                <div
                  className="hero-scan-overlay"
                  aria-hidden="true"
                >
                  <div className="hero-scan-frame">
                    <span className="scan-corner scan-tl" />
                    <span className="scan-corner scan-tr" />
                    <span className="scan-corner scan-bl" />
                    <span className="scan-corner scan-br" />

                    <span className="hero-scan-line" />
                  </div>
                </div>

                {/* AI status */}

                <div className="hero-ai-status">
                  <span className="hero-status-dot" />

                  <span>AI photo matching</span>

                  <ScanFace size={16} />
                </div>
              </div>

              {/* Floating gallery badge */}

              <div className="hero-gallery-badge">
                <div className="hero-gallery-icon">
                  <Images size={17} />
                </div>

                <div>
                  <p className="hero-gallery-caption">
                    GALLERY PREVIEW
                  </p>

                  <p className="hero-gallery-count">
                    1,248
                  </p>

                  <p className="hero-gallery-subtitle">
                    memories to discover
                  </p>
                </div>

                <span className="hero-gallery-check">
                  <Check size={13} />
                </span>
              </div>

              {/* Floating discovery badge */}

              <div className="hero-discovery-badge">
                <span className="hero-discovery-icon">
                  <Sparkles size={15} />
                </span>

                <div>
                  <p>Made for your memories</p>

                  <span>
                    Every moment, easier to find.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}

      {/* CHANGED: removed backdrop-blur-[2px] (re-blurs every frame over the moving background) */}
      <section className="border-y border-border bg-white/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-20 sm:py-24">
          <div className="text-center max-w-2xl mx-auto mb-14 animate-slide-up">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-hover">
              Simple by design
            </span>

            <h2 className="font-display text-3xl sm:text-4xl text-text mt-3 mb-4">
              From event to memories in three steps.
            </h2>

            <p className="text-text-muted leading-7">
              No complicated setup. Join your event, let AI find
              your photos, and enjoy your memories.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  style={{
                    animationDelay: `${index * 110}ms`,
                  }}
                  className="group relative bg-background border border-border rounded-2xl p-7 transition-all duration-300 hover:border-primary/20 hover:shadow-card hover:-translate-y-2 animate-slide-up"
                >
                  <div className="flex items-center justify-between mb-7">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:rotate-3">
                      <Icon
                        size={22}
                        className="text-primary group-hover:text-white transition-colors"
                      />
                    </div>

                    <span className="text-xs font-semibold tracking-widest text-text-muted">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-text mb-2">
                    {step.title}
                  </h3>

                  <p className="text-sm leading-6 text-text-muted">
                    {step.description}
                  </p>

                  <div className="absolute bottom-0 left-7 right-7 h-0.5 origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}

      <section className="bg-surface/60 border-y border-border">
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-hover">
              Made to find the moment
            </span>

            <h2 className="font-display text-2xl sm:text-3xl text-primary mt-3">
              Built for real events, not just galleries
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  style={{
                    animationDelay: `${index * 80}ms`,
                  }}
                  className="group flex gap-4 rounded-2xl p-5 border border-transparent transition-all duration-300 hover:bg-surface hover:border-border hover:shadow-card hover:-translate-y-1 animate-slide-up"
                >
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-secondary/40 flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:scale-110">
                    <Icon
                      className="text-primary transition-colors duration-300 group-hover:text-white"
                      size={20}
                    />
                  </div>

                  <div>
                    <h3 className="font-medium text-primary mb-1">
                      {feature.title}
                    </h3>

                    <p className="text-sm leading-6 text-text-muted">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== ORGANIZERS AND GUESTS ==================== */}

      <section className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Organizers */}

          <div className="group bg-primary text-white rounded-card p-8 shadow-card transition-all duration-300 hover:-translate-y-2 hover:shadow-elevated">
            <UserPlus
              className="mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-2"
              size={26}
            />

            <h3 className="font-display text-xl mb-2">
              For organizers &amp; photographers
            </h3>

            <p className="text-white/80 text-sm leading-6 mb-4">
              Create an event, share a QR code or passcode, and let
              guests find their own photos — no more fielding
              &quot;can you send me the ones with me in them&quot; messages.
            </p>

            <ul className="text-sm text-white/80 space-y-1.5">
              <li>• Separate official &amp; community albums</li>
              <li>
                • Passcodes you can view again anytime, not just once
              </li>
              <li>• Optional paid downloads for your official shots</li>
            </ul>
          </div>

          {/* Guests */}

          <div className="group bg-surface border border-border rounded-card p-8 shadow-card transition-all duration-300 hover:-translate-y-2 hover:shadow-elevated hover:border-secondary">
            <Camera
              className="mb-4 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-2"
              size={26}
            />

            <h3 className="font-display text-xl text-primary mb-2">
              For guests &amp; participants
            </h3>

            <p className="text-text-muted text-sm leading-6 mb-4">
              Join with a code, upload one selfie, and get every
              photo you&apos;re in — official and candid — ready to
              download in full resolution.
            </p>

            <div className="flex flex-wrap gap-3 mt-7">
              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-secondary text-primary text-xs font-medium">
                <Lock size={13} />
                Private searches
              </span>

              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-secondary text-primary text-xs font-medium">
                <ShieldCheck size={13} />
                Server-side validation
              </span>

              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-secondary text-primary text-xs font-medium">
                <ScanFace size={13} />
                Temporary face processing
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== PRIVACY ==================== */}

      <section className="border-t border-border bg-secondary/5">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <ShieldCheck
            className="text-primary mx-auto mb-3"
            size={28}
          />

          <h2 className="font-display text-xl text-primary mb-2">
            Privacy comes first
          </h2>

          <p className="text-text-muted text-sm leading-6 max-w-lg mx-auto mb-7">
            Selfies are processed in memory and discarded immediately
            — never saved to disk or a database. Every search is
            scoped to the single event you&apos;ve joined, and every
            download is checked against your actual purchase and
            membership records on the server, not just hidden in the
            interface.
          </p>

          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-primary hover:bg-white/90 font-semibold shadow-elevated hover:-translate-y-0.5 transition-all duration-300"
          >
            Get Started
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}

      <footer className="border-t border-border bg-secondary/5">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-muted">
          <span className="flex items-center gap-2 text-primary font-semibold transition-all duration-300 hover:-translate-y-0.5">
            <Camera size={16} />
            SnapShare
          </span>

          <span>
            © {new Date().getFullYear()} SnapShare. Built for events, not feeds.
          </span>
        </div>
      </footer>
    </div>
  );
}
