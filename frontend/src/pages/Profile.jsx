import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import * as eventService from "../services/eventService";
import { useAuth } from "../context/AuthContext";
import BackButton from "../components/BackButton";
import {
  User,
  Mail,
  Lock,
  ShieldCheck,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  Copy,
  CalendarDays,
  Crown,
  Camera,
  Users,
  Heart,
  ShoppingBag,
  LayoutGrid,
  ArrowRight,
  Palette,
  Trash2,
  Loader2,
} from "lucide-react";

/* ---------- avatar themes (saved in this browser) ---------- */
const THEMES = [
  { key: "indigo", grad: "from-indigo-500 via-indigo-600 to-violet-700", cover: "from-[#2f3f73] via-indigo-600 to-violet-500" },
  { key: "sunset", grad: "from-orange-400 via-rose-500 to-pink-600", cover: "from-orange-400 via-rose-500 to-fuchsia-600" },
  { key: "ocean", grad: "from-sky-400 via-cyan-500 to-teal-600", cover: "from-sky-500 via-cyan-500 to-teal-500" },
  { key: "forest", grad: "from-emerald-400 via-green-500 to-teal-700", cover: "from-emerald-500 via-green-500 to-teal-600" },
  { key: "grape", grad: "from-fuchsia-500 via-purple-600 to-indigo-700", cover: "from-fuchsia-500 via-purple-600 to-indigo-600" },
  { key: "slate", grad: "from-slate-500 via-slate-700 to-slate-900", cover: "from-slate-600 via-slate-700 to-slate-900" },
];

const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "?";

const passwordChecks = (pw) => [
  { label: "8+ characters", ok: pw.length >= 8 },
  { label: "Upper & lowercase", ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
  { label: "A number", ok: /\d/.test(pw) },
  { label: "A symbol", ok: /[^A-Za-z0-9]/.test(pw) },
];

const STRENGTH = [
  { label: "Too weak", bar: "bg-slate-300", text: "text-slate-500" },
  { label: "Weak", bar: "bg-rose-500", text: "text-rose-600" },
  { label: "Okay", bar: "bg-amber-500", text: "text-amber-600" },
  { label: "Good", bar: "bg-lime-500", text: "text-lime-600" },
  { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white/80 py-3 pl-11 pr-4 text-text outline-none transition-all duration-300 hover:border-indigo-200 focus:border-primary focus:ring-4 focus:ring-primary/10";

export default function Profile() {
  const { user, refreshMe } = useAuth();

  const [tab, setTab] = useState("info");
  const [name, setName] = useState(user?.name || "");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [counts, setCounts] = useState(null);
  const avatarInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const [themeKey, setThemeKey] = useState(() => {
    try {
      const v = localStorage.getItem("snapshare:avatarTheme");
      return THEMES.some((t) => t.key === v) ? v : "indigo";
    } catch {
      return "indigo";
    }
  });
  const theme = THEMES.find((t) => t.key === themeKey) || THEMES[0];

  const pickTheme = (key) => {
    setThemeKey(key);
    try {
      localStorage.setItem("snapshare:avatarTheme", key);
    } catch {
      /* ignore */
    }
  };

    useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  useEffect(() => {
    setImgFailed(false);
  }, [user?.avatarUrl]);

  const showAvatarImg = Boolean(user?.avatarUrl) && !imgFailed;

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      await api.put("/auth/me/avatar", formData);
      await refreshMe();
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!window.confirm("Remove your profile photo?")) return;
    setUploadingAvatar(true);
    try {
      await api.delete("/auth/me/avatar");
      await refreshMe();
      toast.success("Profile photo removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't remove photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    eventService
      .listMyEvents()
      .then((res) => {
        const d = res.data.data;
        setCounts({
          organized: d.organized?.length || 0,
          photographing: d.photographing?.length || 0,
          joined: d.joined?.length || 0,
        });
      })
      .catch(() => setCounts({ organized: 0, photographing: 0, joined: 0 }));
  }, []);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;
  /* ---------- handlers ---------- */
  const nameChanged = name.trim() !== (user?.name || "") && name.trim().length > 0;

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put("/auth/me", { name: name.trim() });
      await refreshMe();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSavingProfile(false);
    }
  };

  const checks = passwordChecks(passwords.newPassword);
  const score = passwords.newPassword ? checks.filter((c) => c.ok).length : 0;
  const strength = STRENGTH[score];
  const mismatch = passwords.confirm.length > 0 && passwords.confirm !== passwords.newPassword;
  const canSavePassword =
    passwords.currentPassword &&
    passwords.newPassword.length >= 8 &&
    passwords.confirm === passwords.newPassword;

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!canSavePassword) return;
    setSavingPassword(true);
    try {
      await api.put("/auth/change-password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success("Password updated");
      setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Password update failed");
    } finally {
      setSavingPassword(false);
    }
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user?.email || "");
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const card =
    "rounded-3xl border border-white/80 bg-white/85 shadow-[0_2px_10px_rgba(30,41,59,0.05)] ring-1 ring-slate-200/70 backdrop-blur";

  const tabs = [
    { key: "info", label: "Personal info", icon: User },
    { key: "security", label: "Security", icon: Lock },
  ];

  return (
    <div className="relative min-h-screen">
      {/* background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#eef0fb] via-[#f6f7fc] to-[#fbf7f5]" />
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute -right-24 top-40 h-[24rem] w-[24rem] rounded-full bg-rose-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[26rem] w-[26rem] rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text md:text-4xl">Profile</h1>
          <p className="mt-2 text-text-muted">Manage your personal information and account security.</p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
          {/* ================= LEFT: identity card ================= */}
          <aside className={`${card} overflow-hidden lg:sticky lg:top-24`}>
                       <div className={`relative h-28 overflow-hidden bg-gradient-to-br ${theme.cover}`}>
              {showAvatarImg && (
                <img
                  src={user.avatarUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-125 object-cover opacity-30 blur-md"
                />
              )}
              <div className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/15 blur-xl" />
              <div className="absolute -bottom-10 left-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
            </div>

            <div className="px-6 pb-6">
                            {/* avatar (z-10 keeps it above the cover) */}
              <div className="relative z-10 -mt-12 h-24 w-24">
                <div
                  className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br ${theme.grad} text-3xl font-semibold text-white shadow-xl ring-4 ring-white`}
                >
                  {showAvatarImg ? (
                    <img
                      src={user.avatarUrl}
                      alt={`${user?.name || "Your"} profile photo`}
                      onError={() => setImgFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initialsOf(user?.name)
                  )}

                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/55 backdrop-blur-[2px]">
                      <Loader2 size={24} className="animate-spin text-white" />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  aria-label="Change profile photo"
                  title="Change profile photo"
                  className="absolute -bottom-1.5 -right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#26345f] shadow-lg ring-1 ring-slate-200 transition hover:scale-110 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 disabled:opacity-60"
                >
                  <Camera size={16} />
                </button>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarPick}
                />
              </div>

              <h2 className="mt-4 truncate text-xl font-semibold text-text">{user?.name}</h2>
              <p className="truncate text-sm text-text-muted">{user?.email}</p>
              <div className="mt-2 flex items-center gap-3 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="text-indigo-600 transition hover:text-indigo-800 hover:underline disabled:opacity-50"
                >
                  {user?.avatarUrl ? "Change photo" : "Upload photo"}
                </button>
                {user?.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleAvatarRemove}
                    disabled={uploadingAvatar}
                    className="flex items-center gap-1 text-slate-400 transition hover:text-rose-600 disabled:opacity-50"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>

              {memberSince && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  <CalendarDays size={12} /> Member since {memberSince}
                </p>
              )}

              {/* stats */}
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { label: "Hosting", value: counts?.organized, icon: Crown, tone: "text-amber-600 bg-amber-50" },
                  { label: "Shooting", value: counts?.photographing, icon: Camera, tone: "text-indigo-600 bg-indigo-50" },
                  { label: "Joined", value: counts?.joined, icon: Users, tone: "text-emerald-600 bg-emerald-50" },
                ].map(({ label, value, icon: Icon, tone }) => (
                  <div key={label} className="rounded-2xl bg-slate-50/80 p-3 text-center ring-1 ring-slate-100">
                    <span className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
                      <Icon size={15} />
                    </span>
                    {counts ? (
                      <p className="text-lg font-semibold leading-none text-text">{value}</p>
                    ) : (
                      <div className="skeleton mx-auto h-5 w-5 rounded" />
                    )}
                    <p className="mt-1 text-[11px] font-medium text-text-muted">{label}</p>
                  </div>
                ))}
              </div>

              {/* theme picker */}
              <div className="mt-6">
                <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <Palette size={13} /> Avatar style
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {THEMES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => pickTheme(t.key)}
                      aria-label={`${t.key} theme`}
                      aria-pressed={themeKey === t.key}
                      className={`relative h-8 w-8 rounded-full bg-gradient-to-br ${t.grad} transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 ${themeKey === t.key ? "ring-2 ring-offset-2 ring-slate-800" : ""
                        }`}
                    >
                      {themeKey === t.key && <Check size={14} className="absolute inset-0 m-auto text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* quick links */}
              <div className="mt-6 space-y-1.5 border-t border-slate-100 pt-4">
                {[
                  { to: "/dashboard", label: "My events", icon: LayoutGrid },
                  { to: "/liked", label: "Liked & favourites", icon: Heart },
                  { to: "/purchases", label: "Purchases", icon: ShoppingBag },
                ].map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon size={16} /> {label}
                    </span>
                    <ArrowRight size={15} className="text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-indigo-500" />
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* ================= RIGHT ================= */}
          <div className="space-y-6">
            {/* tab switcher */}
            <div role="tablist" className="inline-flex gap-1 rounded-2xl bg-white/90 p-1.5 shadow-sm ring-1 ring-slate-200/70">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${tab === key
                      ? "bg-[#26345f] text-white shadow-md"
                      : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            {/* ---------- PERSONAL INFO ---------- */}
            {tab === "info" && (
              <form onSubmit={handleProfileSave} className={`${card} animate-fade-in p-6 md:p-8`}>
                <div className="mb-7 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/30">
                    <User size={26} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-text">Personal information</h2>
                    <p className="mt-0.5 text-sm text-text-muted">Update the information associated with your account.</p>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="profile-name" className="text-sm font-medium text-text">Name</label>
                    <span className="text-xs text-text-muted">{name.length}/60</span>
                  </div>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      id="profile-name"
                      className={inputClass}
                      value={name}
                      maxLength={60}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium text-text">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-text-muted"
                      value={user?.email || ""}
                    />
                    <button
                      type="button"
                      onClick={copyEmail}
                      aria-label="Copy email"
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-indigo-600"
                    >
                      {emailCopied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">
                    Your email address is linked to your account and cannot be changed here.
                  </p>
                </div>

                <div className="mb-7 flex gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-sky-50/60 p-4">
                  <ShieldCheck size={20} className="mt-0.5 shrink-0 text-primary" />
                  <p className="text-sm leading-relaxed text-text-muted">
                    Your role isn't fixed — you can organize some events, photograph others, and simply participate in
                    the rest, all from this one account.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingProfile || !nameChanged}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#2f3f73] to-[#1d284a] px-5 py-3 font-medium text-white shadow-[0_8px_20px_rgba(38,52,95,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(38,52,95,0.36)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:hover:translate-y-0"
                  >
                    <Save size={17} />
                    {savingProfile ? "Saving..." : "Save profile"}
                  </button>
                  {nameChanged && (
                    <button
                      type="button"
                      onClick={() => setName(user?.name || "")}
                      className="rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-slate-800"
                    >
                      Reset
                    </button>
                  )}
                  {nameChanged && <span className="text-xs font-medium text-amber-600">Unsaved changes</span>}
                </div>
              </form>
            )}

            {/* ---------- SECURITY ---------- */}
            {tab === "security" && (
              <form onSubmit={handlePasswordSave} className={`${card} animate-fade-in p-6 md:p-8`}>
                <div className="mb-7 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/30">
                    <Lock size={25} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-text">Account security</h2>
                    <p className="mt-0.5 text-sm text-text-muted">Keep your account protected with a strong password.</p>
                  </div>
                </div>

                {/* current */}
                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium text-text">Current password</label>
                  <div className="relative">
                    <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type={showPw.current ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      className={`${inputClass} pr-12`}
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => ({ ...s, current: !s.current }))}
                      aria-label={showPw.current ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:text-indigo-600"
                    >
                      {showPw.current ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* new */}
                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium text-text">New password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type={showPw.next ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className={`${inputClass} pr-12`}
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => ({ ...s, next: !s.next }))}
                      aria-label={showPw.next ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:text-indigo-600"
                    >
                      {showPw.next ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>

                  {/* strength meter */}
                  <div className="mt-3">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${score >= i ? strength.bar : "bg-slate-200"
                            }`}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-text-muted">Use at least 8 characters.</p>
                      {passwords.newPassword && (
                        <p className={`text-xs font-semibold ${strength.text}`}>{strength.label}</p>
                      )}
                    </div>
                    <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {checks.map((c) => (
                        <li
                          key={c.label}
                          className={`flex items-center gap-2 text-xs transition-colors ${c.ok ? "text-emerald-600" : "text-slate-400"
                            }`}
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full ${c.ok ? "bg-emerald-100" : "bg-slate-100"
                              }`}
                          >
                            {c.ok && <Check size={10} strokeWidth={3} />}
                          </span>
                          {c.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* confirm */}
                <div className="mb-7">
                  <label className="mb-2 block text-sm font-medium text-text">Confirm new password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type={showPw.next ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      className={`${inputClass} ${mismatch ? "!border-rose-300 focus:!ring-rose-500/10" : ""}`}
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      placeholder="Re-enter new password"
                    />
                  </div>
                  {mismatch && <p className="mt-2 text-xs font-medium text-rose-600">Passwords don't match yet.</p>}
                </div>

                <button
                  type="submit"
                  disabled={savingPassword || !canSavePassword}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#2f3f73] to-[#1d284a] px-5 py-3 font-medium text-white shadow-[0_8px_20px_rgba(38,52,95,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(38,52,95,0.36)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:hover:translate-y-0"
                >
                  <Lock size={17} />
                  {savingPassword ? "Updating..." : "Update password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}