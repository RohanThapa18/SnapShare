import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

/** Danger-zone card for the Profile → Security tab. */
export default function DeleteAccountCard() {
  const { refreshMe } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.delete("/auth/me", { data: { password } });
      // The server already cleared the cookie; this just drops the client-side user
      await refreshMe();
      toast.success("Your account has been deleted");
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't delete your account");
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 animate-fade-in rounded-2xl border border-error/30 bg-error/5 p-6 md:p-8">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-error">
        <Trash2 size={18} />
        Delete account
      </h3>
      <p className="mt-1 text-sm text-text-muted">This permanently closes your SnapShare account.</p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 rounded-xl border border-error/40 px-4 py-2.5 text-sm font-medium text-error transition hover:bg-error/10"
        >
          I want to delete my account
        </button>
      ) : (
        <form onSubmit={handleDelete} className="mt-4 space-y-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-text-muted">
            <li>Your name, email and profile photo are removed, and you can no longer log in.</li>
            <li>Photos you uploaded are deleted, except ones other people have already bought.</li>
            <li>Your likes, favourites and saved results are removed, and you leave every event.</li>
            <li>You must delete any events you own first, and be paid out for any earnings.</li>
            <li>This can't be undone.</li>
          </ul>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Enter your password to confirm</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full max-w-sm rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-error"
            />
          </div>

          {error && <p className="text-sm font-medium text-error">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !password}
              className="rounded-xl bg-error px-4 py-2.5 text-sm font-medium text-white transition hover:bg-error/90 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Permanently delete my account"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setPassword(""); setError(""); }}
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-text transition hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}