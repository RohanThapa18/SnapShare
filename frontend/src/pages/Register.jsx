import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Lock,
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      navigate(redirectTo, { replace: true });
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center px-4 py-12">

      {/* ================= REGISTER CARD ================= */}
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

        {/* ================= HEADER ================= */}
        <div className="flex flex-col items-center mb-7">

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
              hover:-rotate-2
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
            Create your account
          </h1>

          <p className="text-sm text-text-muted text-center mt-2">
            Join SnapShare and start sharing your moments.
          </p>

        </div>


        {/* ================= FORM ================= */}
        <form onSubmit={handleSubmit}>

          {/* Name */}
          <div className="mb-5">

            <label className="block text-sm font-medium text-text mb-2">
              Full name
            </label>

            <div className="relative group">

              <User
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
                required
                autoComplete="name"
                placeholder="Enter your full name"
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
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />

            </div>

          </div>


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
          <div className="mb-5">

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
                minLength={8}
                autoComplete="new-password"
                placeholder="Create a password"
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

            <div className="flex items-center gap-2 mt-2">

              <CheckCircle2
                size={14}
                className="text-primary"
              />

              <p className="text-xs text-text-muted">
                Use at least 8 characters for your password.
              </p>

            </div>

          </div>


          {/* Info box */}
          <div
            className="
              flex gap-3
              rounded-xl
              bg-secondary/10
              border border-secondary/30
              p-3.5
              mb-6
            "
          >

            <User
              size={17}
              className="text-primary shrink-0 mt-0.5"
            />

            <p className="text-xs text-text-muted leading-relaxed">
              One account gives you access to everything.
              You can create events, join events, or participate
              as a photographer.
            </p>

          </div>


          {/* Sign up */}
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

            <UserPlus
              size={18}
              className="
                transition-transform duration-300
                group-hover:scale-110
              "
            />

            {loading
              ? "Creating account..."
              : "Create Account"}

          </button>

        </form>


        {/* ================= DIVIDER ================= */}
        <div className="flex items-center gap-3 my-7">

          <div className="h-px flex-1 bg-border" />

          <span className="text-xs text-text-muted">
            ALREADY A MEMBER?
          </span>

          <div className="h-px flex-1 bg-border" />

        </div>


        {/* Login */}
        <Link
          to="/login"
          state={location.state}
          className="
            group
            w-full
            flex items-center justify-center gap-2
            py-3
            rounded-xl
            border border-primary/20
            text-primary
            font-medium
            hover:bg-primary
            hover:text-white
            hover:border-primary
            hover:-translate-y-0.5
            hover:shadow-sm
            transition-all duration-300
          "
        >
          Back to Login

          <span className="transition-transform duration-300 group-hover:-translate-x-1">
            ←
          </span>
        </Link>

      </div>
    </div>
  );
}