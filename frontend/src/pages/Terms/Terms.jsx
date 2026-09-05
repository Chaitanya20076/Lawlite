import {
  FileText,
  ShieldCheck,
  Sparkles,
  UserCheck,
  AlertTriangle,
  Scale,
  Lock,
  Mail,
} from "lucide-react";

import "./Terms.css";

const Terms = () => {
  return (
    <div className="terms-page">

      {/* ========================================
          HERO
      ======================================== */}

      <section className="terms-hero">

        <div className="terms-container">

          <div className="terms-eyebrow">
            <FileText size={15} />
            TERMS & CONDITIONS
          </div>

          <h1>
            The rules for using
            <span> Lawlite.</span>
          </h1>

          <p className="terms-intro">
            These Terms & Conditions explain how you may use
            Lawlite and what you can expect from the service.
            Please read them carefully before using the platform.
          </p>

          <div className="terms-meta">
            <span>
              Last updated: September 2026
            </span>

            <span className="meta-dot" />

            <span>
              Effective immediately
            </span>
          </div>

        </div>

      </section>


      {/* ========================================
          IMPORTANT NOTICE
      ======================================== */}

      <section className="terms-notice-section">

        <div className="terms-container">

          <div className="terms-notice">

            <div className="notice-icon">
              <AlertTriangle size={20} />
            </div>

            <div>
              <span className="notice-label">
                IMPORTANT
              </span>

              <h2>
                Lawlite provides information,
                not legal representation.
              </h2>

              <p>
                Lawlite uses artificial intelligence to help
                explain legal information in simpler language.
                Its responses are for informational and
                educational purposes and should not be treated
                as legal advice or a substitute for advice from
                a qualified legal professional.
              </p>
            </div>

          </div>

        </div>

      </section>


      {/* ========================================
          CONTENT
      ======================================== */}

      <main className="terms-content">

        <div className="terms-container terms-layout">

          {/* Side Navigation */}

          <aside className="terms-sidebar">

            <span>
              ON THIS PAGE
            </span>

            <a href="#acceptance">
              01&nbsp; Acceptance
            </a>

            <a href="#service">
              02&nbsp; Our Service
            </a>

            <a href="#ai-content">
              03&nbsp; AI-Generated Content
            </a>

            <a href="#user-responsibilities">
              04&nbsp; Your Responsibilities
            </a>

            <a href="#documents">
              05&nbsp; Your Documents
            </a>

            <a href="#privacy">
              06&nbsp; Privacy
            </a>

            <a href="#availability">
              07&nbsp; Availability
            </a>

            <a href="#contact">
              08&nbsp; Contact
            </a>

          </aside>


          {/* Main Text */}

          <div className="terms-body">

            {/* 01 */}

            <section id="acceptance" className="terms-section">

              <div className="terms-section-number">
                01
              </div>

              <div className="terms-section-content">

                <h2>
                  Acceptance of Terms
                </h2>

                <p>
                  By accessing or using Lawlite, you agree
                  to be bound by these Terms & Conditions.
                  If you do not agree with these terms,
                  please do not use the service.
                </p>

                <p>
                  These Terms apply to all visitors, users
                  and anyone else who accesses or uses
                  Lawlite.
                </p>

              </div>

            </section>


            {/* 02 */}

            <section id="service" className="terms-section">

              <div className="terms-section-number">
                02
              </div>

              <div className="terms-section-content">

                <h2>
                  What Lawlite Provides
                </h2>

                <p>
                  Lawlite is an AI-powered platform designed
                  to help users understand legal documents,
                  notices, acts, articles and other legal
                  information in simpler language.
                </p>

                <div className="terms-feature-list">

                  <div>
                    <Sparkles size={18} />
                    <span>
                      AI-assisted explanations
                    </span>
                  </div>

                  <div>
                    <FileText size={18} />
                    <span>
                      Simplification of legal content
                    </span>
                  </div>

                  <div>
                    <Scale size={18} />
                    <span>
                      General legal information
                    </span>
                  </div>

                </div>

                <p>
                  Lawlite does not act as your lawyer,
                  represent you in legal proceedings,
                  create an attorney-client relationship,
                  or provide personalised legal representation.
                </p>

              </div>

            </section>


            {/* 03 */}

            <section id="ai-content" className="terms-section">

              <div className="terms-section-number">
                03
              </div>

              <div className="terms-section-content">

                <h2>
                  AI-Generated Content
                </h2>

                <p>
                  Lawlite uses artificial intelligence to
                  generate explanations and responses.
                  Although we aim to provide useful and
                  understandable information, AI-generated
                  content may occasionally be incomplete,
                  inaccurate, outdated or misleading.
                </p>

                <p>
                  You should independently verify important
                  information and consult a qualified legal
                  professional before making decisions that
                  could have legal or financial consequences.
                </p>

                <div className="terms-callout">

                  <ShieldCheck size={19} />

                  <p>
                    Do not rely solely on an AI-generated
                    response when your rights, obligations,
                    finances or legal position are at stake.
                  </p>

                </div>

              </div>

            </section>


            {/* 04 */}

            <section
              id="user-responsibilities"
              className="terms-section"
            >

              <div className="terms-section-number">
                04
              </div>

              <div className="terms-section-content">

                <h2>
                  Your Responsibilities
                </h2>

                <p>
                  When using Lawlite, you agree to use the
                  service responsibly and only for lawful
                  purposes.
                </p>

                <ul className="terms-list">

                  <li>
                    <UserCheck size={17} />
                    Provide accurate information where required.
                  </li>

                  <li>
                    <UserCheck size={17} />
                    Use the platform only for lawful purposes.
                  </li>

                  <li>
                    <UserCheck size={17} />
                    Do not attempt to interfere with or
                    compromise the service.
                  </li>

                  <li>
                    <UserCheck size={17} />
                    Do not use Lawlite as a replacement for
                    professional legal counsel.
                  </li>

                  <li>
                    <UserCheck size={17} />
                    Do not upload content you do not have
                    permission or legal authority to use.
                  </li>

                </ul>

              </div>

            </section>


            {/* 05 */}

            <section id="documents" className="terms-section">

              <div className="terms-section-number">
                05
              </div>

              <div className="terms-section-content">

                <h2>
                  Your Documents & Content
                </h2>

                <p>
                  You retain ownership of documents and
                  content that you upload to Lawlite,
                  subject to the rights and permissions
                  necessary for us to provide the service.
                </p>

                <p>
                  You are responsible for ensuring that you
                  have the necessary rights to upload and
                  process any document or content you provide
                  to Lawlite.
                </p>

                <p>
                  We may process submitted content to provide
                  the requested AI-powered analysis and
                  explanations in accordance with our
                  Privacy Policy.
                </p>

              </div>

            </section>


            {/* 06 */}

            <section id="privacy" className="terms-section">

              <div className="terms-section-number">
                06
              </div>

              <div className="terms-section-content">

                <h2>
                  Privacy
                </h2>

                <p>
                  Your use of Lawlite is also subject to our
                  Privacy Policy, which explains how information
                  may be collected, used and protected.
                </p>

                <a
                  href="/privacy"
                  className="terms-inline-link"
                >
                  Read our Privacy Policy
                  <ArrowIcon />
                </a>

              </div>

            </section>


            {/* 07 */}

            <section id="availability" className="terms-section">

              <div className="terms-section-number">
                07
              </div>

              <div className="terms-section-content">

                <h2>
                  Service Availability
                </h2>

                <p>
                  We aim to keep Lawlite available and
                  reliable, but we cannot guarantee that
                  the service will always be uninterrupted,
                  error-free or available at all times.
                </p>

                <p>
                  We may modify, suspend or discontinue
                  features of the service when necessary,
                  including for maintenance, security,
                  improvements or operational reasons.
                </p>

              </div>

            </section>


            {/* 08 */}

            <section id="contact" className="terms-section">

              <div className="terms-section-number">
                08
              </div>

              <div className="terms-section-content">

                <h2>
                  Contact Us
                </h2>

                <p>
                  If you have questions about these Terms &
                  Conditions or the Lawlite service, you can
                  contact us through the contact details
                  provided on the platform.
                </p>

                <div className="terms-contact">

                  <div className="contact-icon">
                    <Mail size={18} />
                  </div>

                  <div>
                    <span>
                      GENERAL ENQUIRIES
                    </span>

                    <a href="mailto:chaitanya222007@gmail.com">
                      chaitanya222007@gmail.com
                    </a>
                  </div>

                </div>

              </div>

            </section>

          </div>

        </div>

      </main>


      {/* ========================================
          FOOTER NOTE
      ======================================== */}

      <section className="terms-final">

        <div className="terms-container">

          <Lock size={18} />

          <p>
            By continuing to use Lawlite, you acknowledge
            that you have read and understood these Terms &
            Conditions.
          </p>

        </div>

      </section>

    </div>
  );
};


/* Small reusable arrow */

const ArrowIcon = () => {
  return (
    <span className="inline-arrow">
      →
    </span>
  );
};

export default Terms;