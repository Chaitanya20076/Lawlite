import { useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import "./Navbar.css";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="navbar">
      <div className="navbar-container">

        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <span className="logo-mark">L</span>
          <span className="logo-text">Lawlite</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="navbar-links">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/onboarding">How It Works</Link>
        </nav>

        {/* Desktop Actions */}
        <div className="navbar-actions">
          <ThemeToggle />

          <Link to="/login" className="login-button">
            Login
          </Link>

          <Link to="/signup" className="signup-button">
            Get Started
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Mobile Actions */}
        <div className="mobile-actions">
          <ThemeToggle />

          <button
            className="menu-button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <nav>
          <Link to="/" onClick={closeMenu}>
            Home
          </Link>

          <Link to="/about" onClick={closeMenu}>
            About
          </Link>

          <Link to="/onboarding" onClick={closeMenu}>
            How It Works
          </Link>

          <div className="mobile-menu-divider" />

          <Link to="/login" onClick={closeMenu} className="mobile-login">
            Login
          </Link>

          <Link to="/signup" onClick={closeMenu} className="mobile-signup">
            Get Started
            <ArrowRight size={16} />
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;