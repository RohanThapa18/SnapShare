import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Camera } from "lucide-react";

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
  <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-4 py-10">
    <div className="w-full max-w-5xl grid md:grid-cols-2 bg-white rounded-3xl border border-border shadow-elevated overflow-hidden">

      {/* Brand panel */}
      <div className="hidden md:flex bg-primary p-12 text-white flex-col justify-between min-h-[560px]">

        <div>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-8">
            <Camera size={24} />
          </div>

          <p className="text-white/60 text-sm uppercase tracking-[0.18em] mb-4">
            SnapShare
          </p>

          <h2 className="font-display text-4xl leading-tight">
            Your event memories,
            <br />
            all in one place.
          </h2>

          <p className="mt-6 text-white/70 leading-7 max-w-sm">
            Find every photo you're in with AI-powered face matching.
            No endless scrolling required.
          </p>
        </div>

        <p className="text-white/50 text-sm">
          AI-powered event photography
        </p>
      </div>


      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="p-8 sm:p-12 flex flex-col justify-center"
      >

        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-text">
            Welcome back
          </h1>

          <p className="text-text-muted mt-2">
            Log in to continue to your events.
          </p>
        </div>


        <label className="block text-sm font-medium text-text mb-2">
          Email
        </label>

        <input
          type="email"
          required
          placeholder="you@example.com"
          className="w-full mb-5 px-4 py-3.5 rounded-xl bg-surface-sunken border border-border text-text placeholder:text-text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
          value={form.email}
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
        />


        <label className="block text-sm font-medium text-text mb-2">
          Password
        </label>

        <input
          type="password"
          required
          placeholder="Enter your password"
          className="w-full mb-7 px-4 py-3.5 rounded-xl bg-surface-sunken border border-border text-text placeholder:text-text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
          value={form.password}
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />


        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold shadow-sm hover:-translate-y-0.5"
        >
          {loading ? "Logging in..." : "Log In"}
        </button>


        <p className="text-sm text-text-muted text-center mt-6">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-primary font-semibold hover:underline"
          >
            Create one
          </Link>
        </p>

      </form>

    </div>
  </div>
);

}