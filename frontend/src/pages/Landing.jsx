
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
  Play,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

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

          <p className="text-sm text-text-muted">Loading SnapShare...</p>
        </div>
      </div>
    );
  }

  // Logged-in users go directly to their dashboard.
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="bg-background text-text overflow-hidden">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative">

        {/* Background decoration */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/10 blur-3xl" />

          <div className="absolute top-40 -left-40 w-[450px] h-[450px] rounded-full bg-secondary/70 blur-3xl" />
        </div>


        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-16 sm:pt-24 lg:pt-28 pb-20 lg:pb-28">

          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-20 items-center">


            {/* ================= LEFT ================= */}

            <div className="text-center lg:text-left animate-slide-up">

              {/* Badge */}

              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-border shadow-sm mb-7">

                <span className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                  <Sparkles
                    size={13}
                    className="text-accent-hover"
                  />
                </span>

                <span className="text-xs sm:text-sm font-medium text-text">
                  AI-powered event photography
                </span>

              </div>


              {/* Heading */}

              <h1 className="font-display text-5xl sm:text-6xl lg:text-[76px] font-medium tracking-tight leading-[0.98] text-text mb-7">

                Your memories.

                <br />

                <span className="text-primary italic">
                  Found in seconds.
                </span>

              </h1>


              {/* Description */}

              <p className="text-base sm:text-lg leading-8 text-text-muted max-w-xl mx-auto lg:mx-0 mb-9">
                Stop scrolling through hundreds of event photos.
                Upload one selfie and let SnapShare's AI find every
                memory you're in.
              </p>


              {/* Buttons */}

              <div className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-3">

                <Link
                  to="/register"
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold shadow-card hover:-translate-y-0.5 transition-all"
                >
                  Find My Photos

                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>


                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white border border-border hover:border-primary/30 hover:bg-surface-hover text-text font-semibold shadow-sm transition-all"
                >
                  Log In
                </Link>

              </div>


              {/* Trust indicators */}

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 mt-8 text-xs text-text-muted">

                <span className="inline-flex items-center gap-2">
                  <Check size={14} className="text-success" />
                  No app required
                </span>

                <span className="inline-flex items-center gap-2">
                  <Check size={14} className="text-success" />
                  Private searches
                </span>

                <span className="inline-flex items-center gap-2">
                  <Check size={14} className="text-success" />
                  Full-resolution photos
                </span>

              </div>

            </div>


            {/* ================= RIGHT / VISUAL ================= */}

            <div
              className="relative h-[420px] sm:h-[500px] hidden md:block"
              aria-hidden="true"
            >

              {/* Decorative background card */}

              <div className="absolute top-10 left-5 sm:left-12 w-56 h-72 rounded-[28px] bg-secondary shadow-card rotate-[-9deg]" />

              <div className="absolute top-2 right-5 sm:right-12 w-56 h-72 rounded-[28px] bg-accent/30 shadow-card rotate-[8deg]" />


              {/* Main photo-style card */}

              <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[270px] sm:w-[310px] h-[370px] sm:h-[410px] rounded-[30px] bg-white border border-border shadow-elevated overflow-hidden rotate-[-1deg]">

                {/* Fake photo area */}

                <div className="h-[67%] bg-gradient-to-br from-primary/20 via-secondary to-accent/20 relative overflow-hidden">

                  <div className="absolute inset-0 flex items-center justify-center">

                    <div className="w-32 h-40 rounded-[45%] bg-white/60 backdrop-blur-sm shadow-sm flex items-center justify-center">

                      <Camera
                        size={38}
                        className="text-primary/70"
                      />

                    </div>

                  </div>


                  {/* Decorative circles */}

                  <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-accent/30" />

                  <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-primary/10" />

                </div>


                {/* Card information */}

                <div className="p-5 bg-white">

                  <div className="flex items-center justify-between mb-4">

                    <div>
                      <p className="text-sm font-semibold text-text">
                        Event Gallery
                      </p>

                      <p className="text-xs text-text-muted mt-1">
                        Wedding Celebration
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                      <Images
                        size={17}
                        className="text-primary"
                      />
                    </div>

                  </div>


                  {/* AI match */}

                  <div className="rounded-xl bg-surface-sunken border border-border p-3 flex items-center gap-3">

                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">

                      <ScanFace
                        size={19}
                        className="text-primary"
                      />

                    </div>

                    <div className="min-w-0">

                      <p className="text-xs font-semibold text-primary">
                        Match found
                      </p>

                      <p className="text-[11px] text-text-muted mt-0.5">
                        128 photos · 96% confidence
                      </p>

                    </div>

                    <div className="ml-auto w-7 h-7 rounded-full bg-success/10 flex items-center justify-center">

                      <Check
                        size={14}
                        className="text-success"
                      />

                    </div>

                  </div>

                </div>

              </div>


              {/* Floating AI badge */}

              <div className="absolute bottom-16 left-0 sm:left-4 bg-white border border-border rounded-2xl shadow-elevated p-3.5 flex items-center gap-3 animate-scale-in">

                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">

                  <ScanFace
                    size={19}
                    className="text-white"
                  />

                </div>

                <div>

                  <p className="text-xs font-semibold text-text">
                    AI search
                  </p>

                  <p className="text-[11px] text-text-muted">
                    Finding your memories...
                  </p>

                </div>

              </div>


              {/* Floating photo count */}

              <div className="absolute top-20 right-0 sm:right-4 bg-white border border-border rounded-2xl shadow-card px-4 py-3">

                <p className="text-[10px] uppercase tracking-wider text-text-muted">
                  Gallery
                </p>

                <p className="text-lg font-semibold text-primary">
                  1,248
                </p>

                <p className="text-[10px] text-text-muted">
                  photos ready
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          HOW IT WORKS
      ===================================================== */}

      <section className="border-y border-border bg-white">

        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-20 sm:py-24">

          <div className="text-center max-w-2xl mx-auto mb-14">

            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-hover">
              Simple by design
            </span>

            <h2 className="font-display text-3xl sm:text-4xl text-text mt-3 mb-4">
              From event to memories in three steps.
            </h2>

            <p className="text-text-muted leading-7">
              No complicated setup. Join your event, let AI find your
              photos, and enjoy your memories.
            </p>

          </div>


          <div className="grid md:grid-cols-3 gap-6">

            {STEPS.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  className="group relative bg-background border border-border rounded-2xl p-7 hover:border-primary/20 hover:shadow-card transition-all"
                >

                  {/* Number */}

                  <div className="flex items-center justify-between mb-7">

                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary transition-colors">

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

                </div>
              );
            })}

          </div>

        </div>

      </section>


      {/* =====================================================
          FEATURES
      ===================================================== */}

      <section className="bg-background">

        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-20 sm:py-24">

          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-14 items-start">

            {/* Left */}

            <div className="lg:sticky lg:top-28">

              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-hover">

                <Sparkles size={14} />

                Built for real events

              </span>

              <h2 className="font-display text-3xl sm:text-4xl text-text mt-4 mb-5 leading-tight">

                Everything you need to turn event photos into memories.

              </h2>

              <p className="text-text-muted leading-7 mb-7">

                SnapShare brings photographers, organizers and guests
                together around one simple photo experience.

              </p>

              <Link
                to="/register"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover"
              >
                Get started with SnapShare

                <ArrowRight size={16} />

              </Link>

            </div>


            {/* Right */}

            <div className="grid sm:grid-cols-2 gap-4">

              {FEATURES.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="bg-white border border-border rounded-2xl p-6 hover:shadow-card hover:border-primary/20 transition-all"
                  >

                    <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center mb-5">

                      <Icon
                        size={20}
                        className="text-primary"
                      />

                    </div>

                    <h3 className="font-semibold text-text mb-2">
                      {feature.title}
                    </h3>

                    <p className="text-sm leading-6 text-text-muted">
                      {feature.description}
                    </p>

                  </div>
                );
              })}

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          FOR ORGANIZERS / GUESTS
      ===================================================== */}

      <section className="bg-white border-y border-border">

        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-20 sm:py-24">

          <div className="text-center max-w-2xl mx-auto mb-14">

            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-hover">
              One platform
            </span>

            <h2 className="font-display text-3xl sm:text-4xl text-text mt-3">
              Designed for everyone at the event.
            </h2>

          </div>


          <div className="grid lg:grid-cols-2 gap-6">

            {/* Organizer */}

            <div className="relative overflow-hidden rounded-3xl bg-primary p-8 sm:p-10 text-white">

              <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-white/5" />

              <div className="relative">

                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-7">

                  <UserPlus size={23} />

                </div>

                <p className="text-xs uppercase tracking-[0.18em] text-white/60 mb-3">
                  For organizers
                </p>

                <h3 className="font-display text-2xl sm:text-3xl mb-4">
                  Give your guests an easier way to find their photos.
                </h3>

                <p className="text-white/70 text-sm leading-7 mb-7 max-w-lg">
                  Create an event, share a QR code or passcode, and let
                  guests find their own photos without endless requests
                  for individual images.
                </p>


                <ul className="space-y-3 text-sm text-white/80">

                  <li className="flex items-start gap-3">
                    <Check size={17} className="mt-0.5 shrink-0" />
                    Separate official and community albums
                  </li>

                  <li className="flex items-start gap-3">
                    <Check size={17} className="mt-0.5 shrink-0" />
                    Easy event access with QR codes and passcodes
                  </li>

                  <li className="flex items-start gap-3">
                    <Check size={17} className="mt-0.5 shrink-0" />
                    Optional paid downloads for official photos
                  </li>

                </ul>

              </div>

            </div>


            {/* Guests */}

            <div className="relative overflow-hidden rounded-3xl bg-background border border-border p-8 sm:p-10">

              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-7">

                <Camera
                  size={23}
                  className="text-primary"
                />

              </div>

              <p className="text-xs uppercase tracking-[0.18em] text-accent-hover mb-3">
                For guests
              </p>

              <h3 className="font-display text-2xl sm:text-3xl text-text mb-4">
                Find the moments you actually want to keep.
              </h3>

              <p className="text-text-muted text-sm leading-7 mb-7">
                Join with a code, upload one selfie, and let AI locate
                every photo you're in across the event gallery.
              </p>


              <ul className="space-y-3 text-sm text-text-muted">

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} className="text-success" />
                  </span>
                  Download your complete collection as a ZIP
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} className="text-success" />
                  </span>
                  Full-screen photo viewer
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} className="text-success" />
                  </span>
                  Selfie used only for your event search
                </li>

              </ul>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          PRIVACY
      ===================================================== */}

      <section className="bg-background">

        <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 py-20 sm:py-24">

          <div className="bg-white border border-border rounded-3xl p-8 sm:p-12 text-center shadow-sm">

            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6">

              <ShieldCheck
                size={27}
                className="text-primary"
              />

            </div>


            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-hover mb-3">
              Privacy first
            </p>

            <h2 className="font-display text-2xl sm:text-3xl text-text mb-4">
              Your face belongs to you.
            </h2>

            <p className="text-text-muted text-sm sm:text-base leading-7 max-w-2xl mx-auto">
              Selfies are processed in memory and discarded immediately.
              They are not saved to disk or your database. Searches are
              scoped to the event you've joined, while downloads are
              validated by the server against your actual membership and
              purchase records.
            </p>


            <div className="flex flex-wrap justify-center gap-3 mt-7">

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


      {/* =====================================================
          FINAL CTA
      ===================================================== */}

      <section className="bg-primary text-white">

        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 py-20 sm:py-24 text-center">

          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-7">

            <Camera size={25} />

          </div>

          <h2 className="font-display text-3xl sm:text-5xl leading-tight mb-5">
            Your next event deserves
            <br className="hidden sm:block" />
            a better photo experience.
          </h2>

          <p className="text-white/70 max-w-xl mx-auto leading-7 mb-8">
            Create your SnapShare account and start finding your
            event memories without the endless scrolling.
          </p>


          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-primary hover:bg-white/90 font-semibold shadow-elevated hover:-translate-y-0.5 transition-all"
          >
            Get Started

            <ArrowRight size={18} />

          </Link>

        </div>

      </section>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="bg-white border-t border-border">

        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-8">

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

            <Link
              to="/"
              className="flex items-center gap-2 text-primary font-semibold"
            >

              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">

                <Camera
                  size={16}
                  className="text-white"
                />

              </div>

              SnapShare

            </Link>


            <p className="text-xs text-text-muted text-center">
              © {new Date().getFullYear()} SnapShare. Built for events,
              not feeds.
            </p>


            <div className="flex items-center gap-4 text-xs text-text-muted">

              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} />
                Privacy focused
              </span>

            </div>

          </div>

        </div>

      </footer>

    </div>
  );
}
