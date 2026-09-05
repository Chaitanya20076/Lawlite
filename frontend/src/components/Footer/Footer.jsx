import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Mail,
  ShieldCheck,
} from "lucide-react";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">

        <div className="footer-main">

          {/* Brand */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <span className="footer-logo-mark">L</span>
              <span>Lawlite</span>
            </Link>

            <p>
              Making complex legal information easier
              for everyone to understand.
            </p>

            <div className="footer-trust">
              <ShieldCheck size={17} />
              <span>Built with privacy in mind</span>
            </div>
          </div>

          {/* Product */}
          <div className="footer-column">
            <h4>Product</h4>

            <Link to="/onboarding">
              How It Works
            </Link>

            <Link to="/signup">
              Get Started
            </Link>

            <Link to="/login">
              Login
            </Link>
          </div>

          {/* Company */}
          <div className="footer-column">
            <h4>Company</h4>

            <Link to="/about">
              About Lawlite
            </Link>

            <a
              href="mailto:hello@lawlite.ai"
              className="footer-external"
            >
              Contact
              <ArrowUpRight size={13} />
            </a>
          </div>

          {/* Legal */}
          <div className="footer-column">
            <h4>Legal</h4>

            <Link to="/privacy">
              Privacy Policy
            </Link>

            <Link to="/terms">
              Terms & Conditions
            </Link>
          </div>

        </div>

        <div className="footer-bottom">

          <p>
            © {new Date().getFullYear()} Lawlite. All rights reserved.
          </p>

          <a href="mailto:hello@lawlite.ai">
            <Mail size={15} />
            hello@lawlite.ai
          </a>

        </div>

      </div>
    </footer>
  );
};

export default Footer;