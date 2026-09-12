import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface border border-border rounded-2xl p-8 shadow-card">
        <h1 className="text-2xl font-semibold mb-6 text-center">Log in to SnapShare</h1>

        <label className="block text-sm text-text-muted mb-1">Email</label>
        <input
          type="email"
          required
          className="w-full mb-4 px-3 py-2 rounded-lg bg-surface-sunken border border-border focus:border-primary outline-none"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <label className="block text-sm text-text-muted mb-1">Password</label>
        <input
          type="password"
          required
          className="w-full mb-6 px-3 py-2 rounded-lg bg-surface-sunken border border-border focus:border-primary outline-none"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-2 rounded-lg transition"
        >
          {loading ? "Logging in..." : "Log In"}
        </button>

        <p className="text-sm text-text-muted text-center mt-4">
          No account?{" "}
          <Link to="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
