import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import "./Hero.css";

const Hero = () => {
  return (
    <section className="hero">

      {/* Ambient Background */}
      <div className="hero-background">
        <div className="ambient-glow glow-one" />
        <div className="ambient-glow glow-two" />
        <div className="ambient-glow glow-three" />

        <div className="particle particle-one" />
        <div className="particle particle-two" />
        <div className="particle particle-three" />
        <div className="particle particle-four" />
        <div className="particle particle-five" />
        <div className="particle particle-six" />
        <div className="particle particle-seven" />
        <div className="particle particle-eight" />
        <div className="particle particle-nine" />
        <div className="particle particle-ten" />
        <div className="particle particle-eleven" />
        <div className="particle particle-twelve" />

        <div className="grid-overlay" />
      </div>

      <div className="hero-container">

        <div className="hero-content">

          <div className="hero-badge">
            <Sparkles size={14} />
            <span>AI-powered legal understanding</span>
          </div>

          <h1>
            Legal language,
            <br />
            <span>finally made simple.</span>
          </h1>

          <p className="hero-description">
            Lawlite helps you understand complex legal notices,
            documents, acts and articles in simple, everyday language.
          </p>

          <div className="hero-actions">

            <Link to="/signup" className="hero-primary-button">
              Understand your document
              <ArrowRight size={17} />
            </Link>

            <Link to="/onboarding" className="hero-secondary-button">
              See how it works
            </Link>

          </div>

          <div className="hero-trust">

            <div className="hero-trust-icon">
              <ShieldCheck size={16} />
            </div>

            <div>
              <span>Designed with privacy in mind</span>
              <small>
                AI assistance, not a replacement for legal counsel
              </small>
            </div>

          </div>

        </div>

        <div className="hero-visual">

          <div className="legal-card">

            <div className="legal-card-header">
              <div>
                <span className="document-label">LEGAL NOTICE</span>
                <h3>Notice of Proceedings</h3>
              </div>

              <div className="document-status">
                <span />
                Analysing
              </div>
            </div>

            <div className="legal-text">
              <div className="text-line long" />
              <div className="text-line medium" />
              <div className="text-line long" />
              <div className="text-line short" />
              <div className="text-line medium" />
            </div>

            <div className="legal-divider" />

            <div className="lawlite-explanation">

              <div className="explanation-header">
                <div className="explanation-icon">
                  L
                </div>

                <span>Lawlite explains</span>
              </div>

              <p>
                This notice basically means that a legal proceeding
                has been initiated and you may need to respond within
                the specified time.
              </p>

            </div>

            <div className="legal-card-footer">
              <span>Complex legal text</span>
              <ArrowRight size={15} />
              <strong>Simple explanation</strong>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default Hero;