import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface border border-border rounded-2xl p-8 shadow-card">
        <h1 className="text-2xl font-semibold mb-2 text-center">Create your account</h1>
        <p className="text-sm text-text-muted text-center mb-6">
          One account for everything — create your own events, join others as a participant, or join as a
          photographer. No role to pick here.
        </p>

        <label className="block text-sm text-text-muted mb-1">Name</label>
        <input
          required
          className="w-full mb-4 px-3 py-2 rounded-lg bg-surface-sunken border border-border focus:border-primary outline-none"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <label className="block text-sm text-text-muted mb-1">Email</label>
        <input
          type="email"
          required
          className="w-full mb-4 px-3 py-2 rounded-lg bg-surface-sunken border border-border focus:border-primary outline-none"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <label className="block text-sm text-text-muted mb-1">Password (min 8 characters)</label>
        <input
          type="password"
          required
          minLength={8}
          className="w-full mb-6 px-3 py-2 rounded-lg bg-surface-sunken border border-border focus:border-primary outline-none"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-2 rounded-lg transition"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        <p className="text-sm text-text-muted text-center mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
