
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
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden min-h-[620px] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/25 via-transparent to-transparent" aria-hidden="true" />
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left animate-slide-up">
              <span
  className="
    inline-flex items-center gap-1.5
    text-xs font-medium text-primary
    bg-secondary/40
    border border-secondary/40
    px-3.5 py-1.5
    rounded-full
    mb-5
    transition-all duration-300
    hover:bg-secondary/60
    hover:border-secondary
    hover:shadow-sm
    hover:-translate-y-0.5
  "
>
  <Sparkles
    size={13}
    className="transition-transform duration-500 hover:rotate-12"
  />
  AI-powered event photography
</span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium text-primary leading-[1.1] mb-5">
                Find your event photos <span className="italic">using your face.</span>
              </h1>


              {/* Description */}

              <p className="text-base sm:text-lg leading-8 text-text-muted max-w-xl mx-auto lg:mx-0 mb-9">
                Stop scrolling through hundreds of event photos.
                Upload one selfie and let SnapShare's AI find every
                memory you're in.
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
              <div
  className="
    absolute top-6 left-8
    w-48 h-60
    rounded-2xl
    bg-secondary/60
    shadow-card
    rotate-[-9deg]
    animate-float-soft
    transition-transform duration-500
    hover:scale-105
  "
/>
              <div
  className="
    absolute top-2 right-6
    w-48 h-60
    rounded-2xl
    bg-accent/70
    shadow-card
    rotate-[7deg]
    animate-float-delayed
    transition-transform duration-500
    hover:scale-105
  "
/>
              <div
  className="
    absolute top-10 left-1/2 -translate-x-1/2
    w-52 h-64
    rounded-2xl
    bg-surface
    border border-border
    shadow-elevated
    flex flex-col items-center justify-center gap-3
    animate-card-enter
    transition-transform duration-500
    hover:-translate-y-2
  "
>
                <div
  className="
    w-16 h-16
    rounded-full
    bg-primary/10
    flex items-center justify-center
    transition-all duration-500
    hover:bg-primary/20
    hover:scale-110
  "
>
                  <ScanFace className="text-primary" size={30} />
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

      {/* ---------- How it works ---------- */}
      <section className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
        <h2 className="font-display text-2xl sm:text-3xl text-primary text-center mb-2">How it works</h2>
        <p className="text-text-muted text-center mb-12 max-w-lg mx-auto">
          Three steps between you and every photo you're in.
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <div
  key={step.title}
  className="
    group
    relative
    bg-surface
    border border-border
    rounded-card
    p-6
    shadow-sm
    transition-all duration-300
    hover:-translate-y-2
    hover:shadow-elevated
    hover:border-secondary
  "
>
              <span
  className="
    absolute -top-3 -left-3
    w-8 h-8
    rounded-full
    bg-primary
    text-white
    text-sm font-medium
    flex items-center justify-center
    shadow-card
    border-4 border-background
    transition-transform duration-300
    group-hover:scale-110
  "
>
                {i + 1}
              </span>
              <step.icon
  className="
    text-primary mb-3
    transition-all duration-300
    group-hover:scale-110
    group-hover:rotate-2
  "
  size={26}
/>
              <h3 className="font-medium text-primary mb-1.5">{step.title}</h3>
              <p className="text-sm text-text-muted">{step.description}</p>
            </div>

          </div>

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
              <div
  key={f.title}
  className="
    group
    flex gap-4
    rounded-2xl
    p-5
    border border-transparent
    transition-all duration-300
    hover:bg-surface
    hover:border-border
    hover:shadow-card
    hover:-translate-y-1
  "
>
                <div
  className="
    w-11 h-11
    shrink-0
    rounded-xl
    bg-secondary/40
    flex items-center justify-center
    transition-all duration-300
    group-hover:bg-primary
    group-hover:text-white
    group-hover:scale-110
  "
>
                  <f.icon
  className="
    text-primary
    transition-colors duration-300
    group-hover:text-white
  "
  size={20}
/>
                </div>
                <div>
                  <h3 className="font-medium text-primary mb-1">{f.title}</h3>
                  <p className="text-sm text-text-muted">{f.description}</p>
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

      {/* ---------- Organizer / participant benefits ---------- */}
      <section className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
        <div className="grid sm:grid-cols-2 gap-6">
          <div
  className="
    group
    bg-primary
    text-white
    rounded-card
    p-8
    shadow-card
    transition-all duration-300
    hover:-translate-y-2
    hover:shadow-elevated
  "
>
            <UserPlus
  className="
    mb-4
    transition-transform duration-300
    group-hover:scale-110
    group-hover:rotate-2
  "
  size={26}
/>
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
          <div
  className="
    group
    bg-surface
    border border-border
    rounded-card
    p-8
    shadow-card
    transition-all duration-300
    hover:-translate-y-2
    hover:shadow-elevated
    hover:border-secondary
  "
>
            <Camera
  className="
    mb-4 text-primary
    transition-transform duration-300
    group-hover:scale-110
    group-hover:rotate-2
  "
  size={26}
/>
            <h3 className="font-display text-xl text-primary mb-2">For guests &amp; participants</h3>
            <p className="text-text-muted text-sm mb-4">
              Join with a code, upload one selfie, and get every photo you're in — official and candid — ready to
              download in full resolution.
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

      {/* ---------- Trust / security ---------- */}
      <section className="border-t border-border bg-secondary/5">
       <div
  className="
    max-w-3xl
    mx-auto
    px-6 py-16
    text-center
  "
>
<ShieldCheck className="text-primary mx-auto mb-3" size={28} />
          <h2 className="font-display text-xl text-primary mb-2">Privacy comes first</h2>
          <p className="text-text-muted text-sm max-w-lg mx-auto">
            Selfies are processed in memory and discarded immediately — never saved to disk or a database. Every
            search is scoped to the single event you've joined, and every download is checked against your actual
            purchase and membership records on the server, not just hidden in the interface.
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

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-border bg-secondary/5">
  <div
    className="
      max-w-6xl
      mx-auto
      px-6 py-10
      flex flex-col
      sm:flex-row
      items-center
      justify-between
      gap-4
      text-sm
      text-text-muted
    "
  >
         <span
  className="
    flex items-center gap-2
    text-primary
    font-semibold
    transition-all duration-300
    hover:-translate-y-0.5
  "
>
  <Camera size={16} />
  SnapShare
</span>
          <span>© {new Date().getFullYear()} SnapShare. Built for events, not feeds.</span>
        </div>

      </footer>

    </div>
  );
}
