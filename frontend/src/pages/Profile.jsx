import { useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import BackButton from "../components/BackButton";

export default function Profile() {
  const { user, refreshMe } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
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
      setPasswords({ currentPassword: "", newPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Password update failed");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold mb-6">Profile</h1>
        <form onSubmit={handleProfileSave} className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Name</label>
            <input
              className="w-full px-3 py-2 rounded-lg bg-surface-sunken border border-border"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Email</label>
            <input disabled className="w-full px-3 py-2 rounded-lg bg-surface-sunken/50 border border-border text-text-muted" value={user?.email} />
          </div>
          <p className="text-xs text-text-muted">
            Your role isn't fixed — you can organize some events, photograph others, and just participate in the
            rest, all from this one account.
          </p>
          <button type="submit" disabled={savingProfile} className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition">
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Change Password</h2>
        <form onSubmit={handlePasswordSave} className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Current Password</label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 rounded-lg bg-surface-sunken border border-border"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="w-full px-3 py-2 rounded-lg bg-surface-sunken border border-border"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            />
          </div>
          <button type="submit" disabled={savingPassword} className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition">
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
