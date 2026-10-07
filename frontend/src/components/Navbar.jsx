import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, User, Menu, X, LayoutDashboard, Heart, ShoppingBag } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/login");
  };

  const closeMenu = () => setMenuOpen(false);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-40 border-b border-border/70 bg-[#E8E9F6] backdrop-blur-xl shadow-sm">
      <div className="max-w-7xl mx-auto px-5 h-[72px] flex items-center justify-between">

        {/* ==================== LOGO ==================== */}
        <Link
          to="/"
          onClick={closeMenu}
          className="flex items-center gap-3 group"
        >
          <div
            className="
              relative w-11 h-11 rounded-2xl
              flex items-center justify-center
              bg-secondary/40
              border border-secondary/60
              shadow-sm
              overflow-hidden
              transition-all duration-300
              group-hover:scale-105
              group-hover:rotate-2
              group-hover:shadow-elevated
            "
          >
            <img
              src="/Frame.svg"
              alt="SnapShare"
              className="
                w-8 h-8 object-contain
                transition-transform duration-500
                group-hover:scale-110
                group-hover:rotate-2deg
              "
            />

            {/* Small shine effect */}
            <span
              className="
                absolute inset-0
                bg-white/20
                translate-x-[-120%]
                skew-x-[-20deg]
                transition-transform duration-700
                group-hover:translate-x-[120%]
              "
            />
          </div>

          <span
            className="
              text-xl font-display font-semibold
              tracking-tight text-primary
              transition-all duration-300
              group-hover:tracking-wide
            "
          >
            SnapShare
          </span>
        </Link>


        {/* ==================== DESKTOP NAV ==================== */}
        <div className="hidden md:flex items-center gap-2">

          {user ? (
            <>
              {/* Dashboard */}
              <Link
                to="/dashboard"
                className={`
                  group relative flex items-center gap-2
                  px-4 py-2.5 rounded-xl
                  text-sm font-medium
                  transition-all duration-300
                  ${
                    isActive("/dashboard")
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-muted hover:text-primary hover:bg-secondary/30 hover:-translate-y-0.5"
                  }
                `}
              >
                <LayoutDashboard
                  size={16}
                  className="transition-transform duration-300 group-hover:scale-110"
                />
                <span>Dashboard</span>

                {!isActive("/dashboard") && (
                  <span className="absolute bottom-1 left-1/2 w-0 h-0.5 bg-primary rounded-full transition-all duration-300 group-hover:w-8 -translate-x-1/2" />
                )}
              </Link>


              {/* Liked */}
              <Link
                to="/liked"
                className={`
                  group relative flex items-center gap-2
                  px-4 py-2.5 rounded-xl
                  text-sm font-medium
                  transition-all duration-300
                  ${
                    isActive("/liked")
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-muted hover:text-primary hover:bg-secondary/30 hover:-translate-y-0.5"
                  }
                `}
              >
                <Heart
                  size={16}
                  className="transition-transform duration-300 group-hover:scale-110 group-hover:fill-current"
                />
                <span>Liked & Favourites</span>

                {!isActive("/liked") && (
                  <span className="absolute bottom-1 left-1/2 w-0 h-0.5 bg-primary rounded-full transition-all duration-300 group-hover:w-8 -translate-x-1/2" />
                )}
              </Link>


              {/* Purchases */}
              <Link
                to="/purchases"
                className={`
                  group relative flex items-center gap-2
                  px-4 py-2.5 rounded-xl
                  text-sm font-medium
                  transition-all duration-300
                  ${
                    isActive("/purchases")
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-muted hover:text-primary hover:bg-secondary/30 hover:-translate-y-0.5"
                  }
                `}
              >
                <ShoppingBag
                  size={16}
                  className="transition-transform duration-300 group-hover:scale-110"
                />
                <span>Purchases</span>

                {!isActive("/purchases") && (
                  <span className="absolute bottom-1 left-1/2 w-0 h-0.5 bg-primary rounded-full transition-all duration-300 group-hover:w-8 -translate-x-1/2" />
                )}
              </Link>


              {/* ==================== USER ==================== */}
              <Link
                to="/profile"
                className="
                  group ml-3
                  flex items-center gap-2
                  px-3 py-2
                  rounded-2xl
                  border border-border
                  bg-surface/70
                  hover:bg-secondary/25
                  hover:border-secondary
                  hover:shadow-sm
                  hover:-translate-y-0.5
                  transition-all duration-300
                "
              >
                <div
                  className="
                    w-8 h-8 rounded-full
                    bg-primary/10
                    border border-primary/10
                    flex items-center justify-center
                    transition-all duration-300
                    group-hover:bg-primary
                    group-hover:text-white
                    group-hover:scale-105
                  "
                >
                  <User size={15} />
                </div>

                <span className="text-sm font-medium text-text max-w-[150px] truncate">
                  {user.name}
                </span>
              </Link>


              {/* ==================== LOGOUT ==================== */}
              <button
                onClick={handleLogout}
                title="Log out"
                className="
                  group ml-1
                  w-10 h-10
                  rounded-xl
                  flex items-center justify-center
                  text-text-muted
                  border border-transparent
                  hover:border-error/20
                  hover:bg-error/10
                  hover:text-error
                  hover:scale-105
                  transition-all duration-300
                "
              >
                <LogOut
                  size={18}
                  className="
                    transition-transform duration-300
                    group-hover:translate-x-0.5
                  "
                />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="
                  px-4 py-2.5 rounded-xl
                  text-sm font-medium
                  text-text-muted
                  hover:text-primary
                  hover:bg-secondary/30
                  transition-all duration-300
                "
              >
                Login
              </Link>

              <Link
                to="/register"
                className="
                  px-5 py-2.5 rounded-xl
                  bg-primary
                  hover:bg-primary-hover
                  text-white
                  text-sm font-medium
                  shadow-sm
                  hover:shadow-elevated
                  hover:-translate-y-0.5
                  transition-all duration-300
                "
              >
                Sign Up
              </Link>
            </>
          )}
        </div>


        {/* ==================== MOBILE MENU BUTTON ==================== */}
        <button
          className="
            md:hidden
            w-10 h-10
            rounded-xl
            flex items-center justify-center
            text-text-muted
            border border-border
            hover:bg-secondary/30
            hover:text-primary
            hover:scale-105
            transition-all duration-300
          "
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>


      {/* ==================== MOBILE MENU ==================== */}
      {menuOpen && (
        <div
          className="
            md:hidden
            border-t border-border
            bg-background/95
            backdrop-blur-xl
            px-5 py-4
            shadow-card
            animate-slide-up
          "
        >
          {user ? (
            <div className="flex flex-col gap-2">

              <Link
                to="/dashboard"
                onClick={closeMenu}
                className="
                  flex items-center gap-3
                  px-4 py-3 rounded-xl
                  text-sm font-medium
                  text-text-muted
                  hover:text-primary
                  hover:bg-secondary/30
                  transition-all duration-200
                "
              >
                <LayoutDashboard size={18} />
                Dashboard
              </Link>

              <Link
                to="/liked"
                onClick={closeMenu}
                className="
                  flex items-center gap-3
                  px-4 py-3 rounded-xl
                  text-sm font-medium
                  text-text-muted
                  hover:text-primary
                  hover:bg-secondary/30
                  transition-all duration-200
                "
              >
                <Heart size={18} />
                Liked & Favourites
              </Link>

              <Link
                to="/purchases"
                onClick={closeMenu}
                className="
                  flex items-center gap-3
                  px-4 py-3 rounded-xl
                  text-sm font-medium
                  text-text-muted
                  hover:text-primary
                  hover:bg-secondary/30
                  transition-all duration-200
                "
              >
                <ShoppingBag size={18} />
                Purchases
              </Link>

              <Link
                to="/profile"
                onClick={closeMenu}
                className="
                  flex items-center gap-3
                  px-4 py-3 rounded-xl
                  text-sm font-medium
                  text-text-muted
                  hover:text-primary
                  hover:bg-secondary/30
                  transition-all duration-200
                "
              >
                <User size={18} />
                {user.name}
              </Link>

              <button
                onClick={handleLogout}
                className="
                  flex items-center gap-3
                  px-4 py-3 rounded-xl
                  text-sm font-medium
                  text-error
                  hover:bg-error/10
                  transition-all duration-200
                "
              >
                <LogOut size={18} />
                Log out
              </button>

            </div>
          ) : (
            <div className="flex flex-col gap-2">

              <Link
                to="/login"
                onClick={closeMenu}
                className="
                  px-4 py-3 rounded-xl
                  text-sm font-medium
                  text-text-muted
                  hover:text-primary
                  hover:bg-secondary/30
                  transition-all duration-200
                "
              >
                Login
              </Link>

              <Link
                to="/register"
                onClick={closeMenu}
                className="
                  px-4 py-3 rounded-xl
                  bg-primary
                  hover:bg-primary-hover
                  text-white
                  text-sm font-medium
                  text-center
                  transition-all duration-200
                "
              >
                Sign Up
              </Link>

            </div>
          )}
        </div>
      )}
    </nav>
  );
}