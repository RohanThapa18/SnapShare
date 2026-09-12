import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, LogOut, User, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/login");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary font-display font-medium text-lg" onClick={closeMenu}>
          <Camera size={22} />
          SnapShare
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link to="/dashboard" className="text-text-muted hover:text-text transition">
                Dashboard
              </Link>
              <Link to="/purchases" className="text-text-muted hover:text-text transition">
                Purchases
              </Link>
              <Link to="/profile" className="flex items-center gap-1 text-text-muted hover:text-text transition">
                <User size={16} />
                {user.name}
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-1 text-text-muted hover:text-error transition">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-text-muted hover:text-text transition">
                Login
              </Link>
              <Link to="/register" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition">
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger toggle */}
        <button
          className="md:hidden text-text-muted hover:text-text"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 flex flex-col gap-3 text-sm animate-slide-up">
          {user ? (
            <>
              <Link to="/dashboard" className="text-text-muted hover:text-text transition" onClick={closeMenu}>
                Dashboard
              </Link>
              <Link to="/purchases" className="text-text-muted hover:text-text transition" onClick={closeMenu}>
                Purchases
              </Link>
              <Link to="/profile" className="flex items-center gap-1 text-text-muted hover:text-text transition" onClick={closeMenu}>
                <User size={16} />
                {user.name}
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-1 text-error text-left">
                <LogOut size={16} /> Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-text-muted hover:text-text transition" onClick={closeMenu}>
                Login
              </Link>
              <Link
                to="/register"
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition text-center"
                onClick={closeMenu}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
