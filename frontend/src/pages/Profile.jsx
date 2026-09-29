import { useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import BackButton from "../components/BackButton";
import { User, Mail, Lock, ShieldCheck, Save, KeyRound } from "lucide-react";

export default function Profile() {
  const { user, refreshMe } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      await api.put("/auth/me", { name });
      await refreshMe();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setSavingPassword(true);

    try {
      await api.put("/auth/change-password", passwords);
      toast.success("Password updated");

      setPasswords({
        currentPassword: "",
        newPassword: "",
      });
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Password update failed"
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">

      {/* Back */}
      <div className="mb-6">
        <BackButton />
      </div>

      {/* ================= HEADER ================= */}
      <div className="mb-8">
        <p className="text-sm font-medium text-primary mb-2">
          Account Settings
        </p>

        <h1 className="text-3xl md:text-4xl font-display font-semibold text-text">
          Profile
        </h1>

        <p className="mt-2 text-text-muted">
          Manage your personal information and account security.
        </p>
      </div>


      {/* ================= PROFILE CARD ================= */}
      <form
        onSubmit={handleProfileSave}
        className="
          group
          bg-surface
          border border-border
          rounded-2xl
          p-6 md:p-8
          shadow-card
          mb-8
          transition-all duration-300
          hover:-translate-y-1
          hover:shadow-elevated
          hover:border-secondary
        "
      >

        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-8">

          <div
            className="
              w-16 h-16
              rounded-2xl
              bg-secondary/40
              border border-secondary
              flex items-center justify-center
              shadow-sm
              transition-all duration-300
              group-hover:scale-105
              group-hover:rotate-2
            "
          >
            <User
              size={30}
              className="text-primary"
            />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-text">
              Personal Information
            </h2>

            <p className="text-sm text-text-muted mt-1">
              Update the information associated with your account.
            </p>
          </div>

        </div>


        {/* Name */}
        <div className="mb-5">

          <label className="block text-sm font-medium text-text mb-2">
            Name
          </label>

          <div className="relative">

            <User
              size={18}
              className="
                absolute left-4 top-1/2 -translate-y-1/2
                text-text-muted
                transition-colors
                duration-200
                peer-focus:text-primary
              "
            />

            <input
              className="
                peer
                w-full
                pl-11 pr-4 py-3
                rounded-xl
                bg-surface-sunken
                border border-border
                text-text
                outline-none
                transition-all duration-300
                hover:border-secondary
                focus:border-primary
                focus:ring-4
                focus:ring-primary/10
              "
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />

          </div>

        </div>


        {/* Email */}
        <div className="mb-6">

          <label className="block text-sm font-medium text-text mb-2">
            Email
          </label>

          <div className="relative">

            <Mail
              size={18}
              className="
                absolute left-4 top-1/2 -translate-y-1/2
                text-text-muted
              "
            />

            <input
              disabled
              className="
                w-full
                pl-11 pr-4 py-3
                rounded-xl
                bg-surface-sunken/60
                border border-border
                text-text-muted
                cursor-not-allowed
              "
              value={user?.email || ""}
            />

          </div>

          <p className="text-xs text-text-muted mt-2">
            Your email address is linked to your account and cannot be
            changed here.
          </p>

        </div>


        {/* Role information */}
        <div
          className="
            flex gap-3
            p-4
            rounded-xl
            bg-secondary/15
            border border-secondary/30
            mb-7
          "
        >

          <ShieldCheck
            size={20}
            className="text-primary shrink-0 mt-0.5"
          />

          <p className="text-sm text-text-muted leading-relaxed">
            Your role isn't fixed — you can organize some events,
            photograph others, and simply participate in the rest,
            all from this one account.
          </p>

        </div>


        {/* Save */}
        <button
          type="submit"
          disabled={savingProfile}
          className="
            inline-flex
            items-center
            gap-2
            px-5 py-3
            rounded-xl
            bg-primary
            hover:bg-primary/90
            text-white
            font-medium
            shadow-sm
            hover:shadow-elevated
            hover:-translate-y-0.5
            active:translate-y-0
            transition-all duration-300
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          <Save size={17} />

          {savingProfile ? "Saving..." : "Save Profile"}
        </button>

      </form>


      {/* ================= PASSWORD CARD ================= */}
      <form
        onSubmit={handlePasswordSave}
        className="
          group
          bg-surface
          border border-border
          rounded-2xl
          p-6 md:p-8
          shadow-card
          transition-all duration-300
          hover:-translate-y-1
          hover:shadow-elevated
          hover:border-secondary
        "
      >

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">

          <div
            className="
              w-14 h-14
              rounded-2xl
              bg-accent/20
              border border-accent/30
              flex items-center justify-center
              transition-all duration-300
              group-hover:scale-105
              group-hover:-rotate-2
            "
          >
            <Lock
              size={25}
              className="text-primary"
            />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-text">
              Account Security
            </h2>

            <p className="text-sm text-text-muted mt-1">
              Keep your account protected with a strong password.
            </p>
          </div>

        </div>


        {/* Current password */}
        <div className="mb-5">

          <label className="block text-sm font-medium text-text mb-2">
            Current Password
          </label>

          <div className="relative">

            <KeyRound
              size={18}
              className="
                absolute left-4 top-1/2 -translate-y-1/2
                text-text-muted
              "
            />

            <input
              type="password"
              required
              className="
                w-full
                pl-11 pr-4 py-3
                rounded-xl
                bg-surface-sunken
                border border-border
                text-text
                outline-none
                transition-all duration-300
                hover:border-secondary
                focus:border-primary
                focus:ring-4
                focus:ring-primary/10
              "
              value={passwords.currentPassword}
              onChange={(e) =>
                setPasswords({
                  ...passwords,
                  currentPassword: e.target.value,
                })
              }
              placeholder="Enter current password"
            />

          </div>

        </div>


        {/* New password */}
        <div className="mb-6">

          <label className="block text-sm font-medium text-text mb-2">
            New Password
          </label>

          <div className="relative">

            <Lock
              size={18}
              className="
                absolute left-4 top-1/2 -translate-y-1/2
                text-text-muted
              "
            />

            <input
              type="password"
              required
              minLength={8}
              className="
                w-full
                pl-11 pr-4 py-3
                rounded-xl
                bg-surface-sunken
                border border-border
                text-text
                outline-none
                transition-all duration-300
                hover:border-secondary
                focus:border-primary
                focus:ring-4
                focus:ring-primary/10
              "
              value={passwords.newPassword}
              onChange={(e) =>
                setPasswords({
                  ...passwords,
                  newPassword: e.target.value,
                })
              }
              placeholder="Enter new password"
            />

          </div>

          <p className="text-xs text-text-muted mt-2">
            Your new password must contain at least 8 characters.
          </p>

        </div>


        {/* Update password */}
        <button
          type="submit"
          disabled={savingPassword}
          className="
            inline-flex
            items-center
            gap-2
            px-5 py-3
            rounded-xl
            bg-primary
            hover:bg-primary/90
            text-white
            font-medium
            shadow-sm
            hover:shadow-elevated
            hover:-translate-y-0.5
            active:translate-y-0
            transition-all duration-300
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          <Lock size={17} />

          {savingPassword
            ? "Updating..."
            : "Update Password"}
        </button>

      </form>

    </div>
  );
}