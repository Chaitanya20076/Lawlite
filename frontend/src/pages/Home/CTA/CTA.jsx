import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

import { Link } from "react-router-dom";

import "./CTA.css";

const CTA = () => {
  return (
    <section className="cta">

      {/* Ambient background */}

      <div className="cta-background">
        <div className="cta-glow" />
        <div className="cta-grid" />

        <span className="cta-particle particle-a" />
        <span className="cta-particle particle-b" />
        <span className="cta-particle particle-c" />
        <span className="cta-particle particle-d" />
        <span className="cta-particle particle-e" />
        <span className="cta-particle particle-f" />
      </div>


      <div className="cta-container">

        {/* Small label */}

        <div className="cta-label">
          <Sparkles size={14} />
          <span>LEGAL CLARITY, ONE DOCUMENT AT A TIME</span>
        </div>


        {/* Main heading */}

        <h2>
          Don't just read
          <br />
          the law.
          <br />
          <span>Understand it.</span>
        </h2>


        <p className="cta-description">
          Give Lawlite the legal language that feels
          impossible to understand. We'll help you
          make sense of it.
        </p>


        {/* CTA buttons */}

        <div className="cta-actions">

          <Link
            to="/signup"
            className="cta-primary"
          >
            Start with Lawlite
            <ArrowRight size={17} />
          </Link>

          <Link
            to="/onboarding"
            className="cta-secondary"
          >
            Learn how it works
          </Link>

        </div>


        {/* Trust */}

        <div className="cta-trust">

          <ShieldCheck size={15} />

          <span>
            AI-powered explanations · Privacy-conscious ·
            Not a substitute for professional legal advice
          </span>

        </div>


        {/* Floating document visual */}

        <div className="cta-visual">

          <div className="cta-document">

            <div className="cta-document-top">
              <span>LEGAL TEXT</span>
              <span>01</span>
            </div>

            <div className="cta-document-lines">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>

          </div>


          <div className="cta-arrow">
            <ArrowRight size={20} />
          </div>


          <div className="cta-result">

            <div className="cta-result-top">

              <div className="cta-logo">
                L
              </div>

              <div>
                <span>LAW LITE</span>
                <strong>Simple explanation</strong>
              </div>

            </div>

            <p>
              Here's what this actually means
              in everyday language.
            </p>

          </div>

        </div>

      </div>

    </section>
  );
};

export default CTA;