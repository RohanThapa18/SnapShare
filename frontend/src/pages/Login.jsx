import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { Mail, Lock, LogIn, Eye, EyeOff, Camera } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Camera } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo =
    location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center px-4 py-12">

      {/* ================= LOGIN CARD ================= */}
      <div
        className="
          w-full max-w-md
          bg-surface
          border border-border
          rounded-3xl
          shadow-card
          p-7 sm:p-9
          transition-all duration-500
          hover:-translate-y-1
          hover:shadow-elevated
        "
      >

        {/* ================= BRAND ================= */}
        <div className="flex flex-col items-center mb-8">

          <div
            className="
              group
              w-16 h-16
              rounded-2xl
              bg-secondary/40
              border border-secondary/60
              flex items-center justify-center
              shadow-sm
              mb-5
              transition-all duration-500
              hover:scale-110
              hover:rotate-2
              hover:shadow-elevated
            "
          >
            <img
              src="/Frame.svg"
              alt="SnapShare"
              className="
                w-11 h-11
                object-contain
                transition-transform duration-500
                group-hover:scale-110
              "
            />
          </div>

          <h1
            className="
              text-3xl
              font-display
              font-semibold
              text-primary
              tracking-tight
            "
          >
            Welcome back
          </h1>

          <p className="text-sm text-text-muted mt-2 text-center">
            Log in to continue to your SnapShare account
          </p>

        </div>


        {/* ================= FORM ================= */}
        <form onSubmit={handleSubmit}>

          {/* Email */}
          <div className="mb-5">

            <label className="block text-sm font-medium text-text mb-2">
              Email address
            </label>

            <div className="relative group">

              <Mail
                size={18}
                className="
                  absolute left-4 top-1/2
                  -translate-y-1/2
                  text-text-muted
                  transition-colors duration-200
                  group-focus-within:text-primary
                "
              />

              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Enter your email"
                className="
                  w-full
                  pl-11 pr-4 py-3
                  rounded-xl
                  bg-surface-sunken
                  border border-border
                  text-text
                  placeholder:text-text-muted/70
                  outline-none
                  transition-all duration-300
                  hover:border-secondary
                  focus:border-primary
                  focus:ring-4
                  focus:ring-primary/10
                "
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
              />

            </div>

          </div>


          {/* Password */}
          <div className="mb-7">

            <label className="block text-sm font-medium text-text mb-2">
              Password
            </label>

            <div className="relative group">

              <Lock
                size={18}
                className="
                  absolute left-4 top-1/2
                  -translate-y-1/2
                  text-text-muted
                  transition-colors duration-200
                  group-focus-within:text-primary
                "
              />

              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="
                  w-full
                  pl-11 pr-12 py-3
                  rounded-xl
                  bg-surface-sunken
                  border border-border
                  text-text
                  placeholder:text-text-muted/70
                  outline-none
                  transition-all duration-300
                  hover:border-secondary
                  focus:border-primary
                  focus:ring-4
                  focus:ring-primary/10
                "
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value,
                  })
                }
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((value) => !value)
                }
                className="
                  absolute right-3 top-1/2
                  -translate-y-1/2
                  w-8 h-8
                  rounded-lg
                  flex items-center justify-center
                  text-text-muted
                  hover:text-primary
                  hover:bg-secondary/20
                  transition-all duration-200
                "
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>

            </div>

          </div>


          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            className="
              group
              w-full
              flex items-center justify-center gap-2
              py-3.5
              rounded-xl
              bg-primary
              hover:bg-primary-hover
              text-white
              font-medium
              shadow-sm
              hover:shadow-elevated
              hover:-translate-y-0.5
              active:translate-y-0
              transition-all duration-300
              disabled:opacity-60
              disabled:cursor-not-allowed
              disabled:hover:translate-y-0
            "
          >

            <LogIn
              size={18}
              className="
                transition-transform duration-300
                group-hover:translate-x-0.5
              "
            />

            {loading ? "Logging in..." : "Log In"}

          </button>

        </form>


        {/* ================= DIVIDER ================= */}
        <div className="flex items-center gap-3 my-7">

          <div className="h-px flex-1 bg-border" />

          <span className="text-xs text-text-muted">
            OR
          </span>

          <div className="h-px flex-1 bg-border" />

        </div>


        {/* ================= REGISTER ================= */}
        <div
          className="
            rounded-2xl
            border border-secondary/40
            bg-secondary/10
            p-4
            text-center
            transition-all duration-300
            hover:bg-secondary/20
          "
        >

          <p className="text-sm text-text-muted">
            Don't have a SnapShare account?
          </p>

          <Link
            to="/register"
            className="
              inline-flex
              items-center
              gap-1
              mt-1
              text-sm
              font-semibold
              text-primary
              hover:text-primary-hover
              hover:underline
              underline-offset-4
              transition-all duration-200
            "
          >
            Create an account
            <span className="transition-transform duration-200 hover:translate-x-1">
              →
            </span>
          </Link>

        </div>

      </div>
    </div>
  );
}