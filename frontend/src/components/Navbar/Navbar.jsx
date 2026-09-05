import { useState } from "react";
import {
  Menu,
  X,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import ThemeToggle from "../ThemeToggle/ThemeToggle";

import "./Navbar.css";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const closeMenu = () => {
    setMenuOpen(false);
    setMoreOpen(false);
  };

  const scrollToSection = (sectionId) => {
    closeMenu();

    // Already on homepage
    if (location.pathname === "/") {
      const section = document.getElementById(sectionId);

      if (section) {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }

      return;
    }

    // Go to homepage first
    navigate("/");

    // Wait for homepage to render
    setTimeout(() => {
      const section = document.getElementById(sectionId);

      if (section) {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  const scrollToTop = () => {
    closeMenu();

    if (location.pathname === "/") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    navigate("/");
  };

  return (
    <header className="navbar">

      <div className="navbar-container">

        {/* ========================================
            LOGO
        ======================================== */}

        <button
          className="navbar-logo"
          onClick={scrollToTop}
          aria-label="Go to Lawlite homepage"
        >
          <span className="logo-mark">
            L
          </span>

          <span className="logo-text">
            Lawlite
          </span>
        </button>


        {/* ========================================
            DESKTOP NAVIGATION
        ======================================== */}

        <nav className="navbar-links">

          {/* Home */}

          <button
            className="nav-link"
            onClick={scrollToTop}
          >
            Home
          </button>


          {/* About */}

          <button
            className="nav-link"
            onClick={() =>
              scrollToSection("why-lawlite")
            }
          >
            About
          </button>


          {/* How It Works */}

          <button
            className="nav-link"
            onClick={() =>
              scrollToSection("how-it-works")
            }
          >
            How It Works
          </button>


          {/* ========================================
              MORE DROPDOWN
          ======================================== */}

          <div
            className="nav-dropdown"
            onMouseEnter={() =>
              setMoreOpen(true)
            }
            onMouseLeave={() =>
              setMoreOpen(false)
            }
          >

            <button
              className="nav-link more-button"
              onClick={() =>
                setMoreOpen((prev) => !prev)
              }
              aria-expanded={moreOpen}
            >
              <span>
                More
              </span>

              <ChevronDown
                size={15}
                className={`more-chevron ${
                  moreOpen ? "rotate" : ""
                }`}
              />
            </button>


            {/* Dropdown */}

            <div
              className={`more-dropdown ${
                moreOpen ? "show" : ""
              }`}
            >

              {/* Terms */}

              <Link
                to="/terms"
                onClick={closeMenu}
                className="dropdown-item"
              >
                <span>
                  Terms & Conditions
                </span>
              </Link>


              {/* Privacy */}

              <Link
                to="/privacy"
                onClick={closeMenu}
                className="dropdown-item"
              >
                <span>
                  Privacy Policy
                </span>
              </Link>


              {/* Contact */}

              <Link
                to="/contact"
                onClick={closeMenu}
                className="dropdown-item"
              >
                <span>
                  Contact
                </span>
              </Link>


              {/* Partners */}

              <Link
                to="/partners"
                onClick={closeMenu}
                className="dropdown-item"
              >
                <span>
                  Partners
                </span>
              </Link>

            </div>

          </div>

        </nav>


        {/* ========================================
            DESKTOP ACTIONS
        ======================================== */}

        <div className="navbar-actions">

          <ThemeToggle />

          {/* Login */}

          <Link
            to="/login"
            className="login-button"
          >
            Login
          </Link>


          {/* Get Started */}

          <Link
            to="/signup"
            className="signup-button"
          >
            <span>
              Get Started
            </span>

            <ArrowRight size={16} />
          </Link>

        </div>


        {/* ========================================
            MOBILE ACTIONS
        ======================================== */}

        <div className="mobile-actions">

          <ThemeToggle />

          <button
            className="menu-button"
            onClick={() =>
              setMenuOpen((prev) => !prev)
            }
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X size={23} />
            ) : (
              <Menu size={23} />
            )}
          </button>

        </div>

      </div>


      {/* ========================================
          MOBILE MENU
      ======================================== */}

      <div
        className={`mobile-menu ${
          menuOpen ? "open" : ""
        }`}
      >

        <nav>

          {/* Home */}

          <button
            onClick={scrollToTop}
            className="mobile-nav-link"
          >
            Home
          </button>


          {/* About */}

          <button
            onClick={() =>
              scrollToSection("why-lawlite")
            }
            className="mobile-nav-link"
          >
            About
          </button>


          {/* How It Works */}

          <button
            onClick={() =>
              scrollToSection("how-it-works")
            }
            className="mobile-nav-link"
          >
            How It Works
          </button>


          {/* ========================================
              MOBILE MORE
          ======================================== */}

          <button
            className="mobile-nav-link mobile-more-button"
            onClick={() =>
              setMoreOpen((prev) => !prev)
            }
            aria-expanded={moreOpen}
          >
            <span>
              More
            </span>

            <ChevronDown
              size={17}
              className={`more-chevron ${
                moreOpen ? "rotate" : ""
              }`}
            />
          </button>


          {/* Mobile More Items */}

          <div
            className={`mobile-more-menu ${
              moreOpen ? "open" : ""
            }`}
          >

            {/* Terms */}

            <Link
              to="/terms"
              onClick={closeMenu}
            >
              Terms & Conditions
            </Link>


            {/* Privacy */}

            <Link
              to="/privacy"
              onClick={closeMenu}
            >
              Privacy Policy
            </Link>


            {/* Contact */}

            <Link
              to="/contact"
              onClick={closeMenu}
            >
              Contact
            </Link>


            {/* Partners */}

            <Link
              to="/partners"
              onClick={closeMenu}
            >
              Partners
            </Link>

          </div>


          {/* Divider */}

          <div className="mobile-menu-divider" />


          {/* Login */}

          <Link
            to="/login"
            onClick={closeMenu}
            className="mobile-login"
          >
            Login
          </Link>


          {/* Get Started */}

          <Link
            to="/signup"
            onClick={closeMenu}
            className="mobile-signup"
          >
            <span>
              Get Started
            </span>

            <ArrowRight size={16} />
          </Link>

        </nav>

      </div>

    </header>
  );
};

export default Navbar;