import {
  ShieldCheck,
  Database,
  FileText,
  Lock,
  Brain,
  UserRound,
  Eye,
  Trash2,
  Mail,
} from "lucide-react";

import "./Privacy.css";

const Privacy = () => {
  return (
    <div className="privacy-page">

      {/* ========================================
          HERO
      ======================================== */}

      <section className="privacy-hero">

        <div className="privacy-container">

          <div className="privacy-eyebrow">
            <ShieldCheck size={15} />
            PRIVACY POLICY
          </div>

          <h1>
            Your documents are
            <span> yours.</span>
          </h1>

          <p className="privacy-intro">
            We believe understanding the law shouldn't
            require giving up control over your information.
            This policy explains what information Lawlite
            collects, why we use it and how we work to
            protect it.
          </p>

          <div className="privacy-meta">

            <span>
              Last updated: September 2026
            </span>

            <span className="privacy-meta-dot" />

            <span>
              Effective immediately
            </span>

          </div>

        </div>

      </section>


      {/* ========================================
          PRIVACY PROMISE
      ======================================== */}

      <section className="privacy-promise-section">

        <div className="privacy-container">

          <div className="privacy-promise">

            <div className="promise-icon">
              <Lock size={21} />
            </div>

            <div>

              <span className="promise-label">
                OUR APPROACH
              </span>

              <h2>
                Privacy should be part of the product,
                not an afterthought.
              </h2>

              <p>
                Lawlite is designed with privacy in mind.
                We aim to collect only the information
                necessary to provide, maintain and improve
                the service.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* ========================================
          CONTENT
      ======================================== */}

      <main className="privacy-content">

        <div className="privacy-container privacy-layout">

          {/* Sidebar */}

          <aside className="privacy-sidebar">

            <span>
              ON THIS PAGE
            </span>

            <a href="#information">
              01&nbsp; Information We Collect
            </a>

            <a href="#documents">
              02&nbsp; Documents You Provide
            </a>

            <a href="#ai-processing">
              03&nbsp; AI Processing
            </a>

            <a href="#usage">
              04&nbsp; How We Use Information
            </a>

            <a href="#sharing">
              05&nbsp; Sharing Information
            </a>

            <a href="#security">
              06&nbsp; Security
            </a>

            <a href="#retention">
              07&nbsp; Data Retention
            </a>

            <a href="#rights">
              08&nbsp; Your Choices
            </a>

            <a href="#children">
              09&nbsp; Children
            </a>

            <a href="#changes">
              10&nbsp; Policy Changes
            </a>

            <a href="#contact">
              11&nbsp; Contact
            </a>

          </aside>


          {/* Main Content */}

          <div className="privacy-body">

            {/* 01 */}

            <section
              id="information"
              className="privacy-section"
            >

              <div className="privacy-section-number">
                01
              </div>

              <div className="privacy-section-content">

                <div className="privacy-section-icon">
                  <Database size={18} />
                </div>

                <h2>
                  Information We Collect
                </h2>

                <p>
                  Depending on how you use Lawlite, we may
                  collect information needed to create and
                  manage your account and provide the service.
                </p>

                <div className="privacy-info-grid">

                  <div className="privacy-info-item">

                    <span className="info-title">
                      ACCOUNT INFORMATION
                    </span>

                    <p>
                      Such as your name, email address and
                      account credentials.
                    </p>

                  </div>

                  <div className="privacy-info-item">

                    <span className="info-title">
                      USAGE INFORMATION
                    </span>

                    <p>
                      Information about how you interact
                      with Lawlite, such as features used
                      and basic activity information.
                    </p>

                  </div>

                  <div className="privacy-info-item">

                    <span className="info-title">
                      TECHNICAL INFORMATION
                    </span>

                    <p>
                      Information such as browser type,
                      device information, IP address and
                      diagnostic data where applicable.
                    </p>

                  </div>

                </div>

              </div>

            </section>


            {/* 02 */}

            <section
              id="documents"
              className="privacy-section"
            >

              <div className="privacy-section-number">
                02
              </div>

              <div className="privacy-section-content">

                <div className="privacy-section-icon">
                  <FileText size={18} />
                </div>

                <h2>
                  Documents You Provide
                </h2>

                <p>
                  Lawlite may allow you to upload legal
                  notices, documents, acts, articles or
                  other text for analysis and explanation.
                </p>

                <p>
                  These documents may contain personal,
                  financial, professional or other sensitive
                  information. You should only provide
                  information that you are comfortable
                  processing through the service and that
                  you have the right to provide.
                </p>

                <div className="privacy-warning">

                  <Eye size={18} />

                  <div>

                    <strong>
                      Think before you upload.
                    </strong>

                    <p>
                      Avoid uploading unnecessary passwords,
                      payment information, government
                      identification numbers or other
                      highly sensitive information unless
                      it is genuinely required for your
                      intended use of Lawlite.
                    </p>

                  </div>

                </div>

              </div>

            </section>


            {/* 03 */}

            <section
              id="ai-processing"
              className="privacy-section"
            >

              <div className="privacy-section-number">
                03
              </div>

              <div className="privacy-section-content">

                <div className="privacy-section-icon">
                  <Brain size={18} />
                </div>

                <h2>
                  AI Processing
                </h2>

                <p>
                  Lawlite uses artificial intelligence to
                  analyse submitted content and generate
                  plain-language explanations.
                </p>

                <p>
                  To provide this functionality, information
                  submitted to Lawlite may be processed by
                  technology and AI service providers that
                  support our platform.
                </p>

                <p>
                  We aim to use appropriate contractual,
                  technical and organisational safeguards
                  when working with service providers.
                </p>

                <div className="privacy-ai-note">

                  <Brain size={18} />

                  <p>
                    We will clearly document our relevant
                    AI service providers and processing
                    practices as the Lawlite product
                    architecture is finalised.
                  </p>

                </div>

              </div>

            </section>


            {/* 04 */}

            <section
              id="usage"
              className="privacy-section"
            >

              <div className="privacy-section-number">
                04
              </div>

              <div className="privacy-section-content">

                <div className="privacy-section-icon">
                  <UserRound size={18} />
                </div>

                <h2>
                  How We Use Information
                </h2>

                <p>
                  We may use information we collect to:
                </p>

                <ul className="privacy-list">

                  <li>
                    <span />
                    Provide and operate Lawlite.
                  </li>

                  <li>
                    <span />
                    Process documents and generate requested
                    explanations.
                  </li>

                  <li>
                    <span />
                    Create and manage user accounts.
                  </li>

                  <li>
                    <span />
                    Maintain security and prevent misuse.
                  </li>

                  <li>
                    <span />
                    Troubleshoot technical issues.
                  </li>

                  <li>
                    <span />
                    Improve the reliability and functionality
                    of the service.
                  </li>

                  <li>
                    <span />
                    Communicate important service-related
                    information.
                  </li>

                </ul>

              </div>

            </section>


            {/* 05 */}

            <section
              id="sharing"
              className="privacy-section"
            >

              <div className="privacy-section-number">
                05
              </div>

              <div className="privacy-section-content">

                <div className="privacy-section-icon">
                  <ShieldCheck size={18} />
                </div>

                <h2>
                  Sharing Information
                </h2>

                <p>
                  We do not intend to sell your personal
                  information.
                </p>

                <p>
                  Information may be shared with trusted
                  service providers when necessary to operate
                  Lawlite, such as infrastructure, storage,
                  authentication, analytics or AI processing
                  providers.
                </p>

                <p>
                  We may also disclose information where
                  required by applicable law, legal process,
                  or when reasonably necessary to protect
                  the rights, safety or security of Lawlite,
                  our users or others.
                </p>

              </div>

            </section>


            {/* 06 */}

            <section
              id="security"
              className="privacy-section"
            >

              <div className="privacy-section-number">
                06
              </div>

              <div className="privacy-section-content">

                <div className="privacy-section-icon">
                  <Lock size={18} />
                </div>

                <h2>
                  Security
                </h2>

                <p>
                  We take reasonable technical and
                  organisational measures to protect
                  information handled through Lawlite.
                </p>

                <p>
                  However, no internet-based service or
                  method of electronic storage can be
                  guaranteed to be completely secure.
                  We therefore cannot promise absolute
                  security.
                </p>

                <div className="privacy-security-grid">

                  <div>
                    <Lock size={17} />
                    <span>
                      Access controls
                    </span>
                  </div>

                  <div>
                    <ShieldCheck size={17} />
                    <span>
                      Security practices
                    </span>
                  </div>

                  <div>
                    <Database size={17} />
                    <span>
                      Protected infrastructure
                    </span>
                  </div>

                </div>

              </div>

            </section>


            {/* 07 */}

            <section
              id="retention"
              className="privacy-section"
            >

              <div className="privacy-section-number">
                07
              </div>

              <div className="privacy-section-content">

                <div className="privacy-section-icon">
                  <Trash2 size={18} />
                </div>

                <h2>
                  Data Retention
                </h2>

                <p>
                  We retain information only for as long
                  as reasonably necessary for the purposes
                  described in this policy, unless a longer
                  retention period is required or permitted
                  by law.
                </p>

                <p>
                  The exact retention period for uploaded
                  documents and analysis history will depend
                  on the features you use and the settings
                  available in your Lawlite account.
                </p>

                <div className="privacy-retention-note">

                  <Trash2 size={18} />

                  <p>
                    We intend to provide users with clear
                    controls over stored documents and
                    analysis history wherever technically
                    feasible.
                  </p>

                </div>

              </div>

            </section>


            {/* 08 */}

            <section
              id="rights"
              className="privacy-section"
            >

              <div className="privacy-section-number">
                08
              </div>

              <div className="privacy-section-content">

                <div className="privacy-section-icon">
                  <UserRound size={18} />
                </div>

                <h2>
                  Your Choices
                </h2>

                <p>
                  Depending on applicable law and the
                  features available to you, you may have
                  rights regarding your personal information,
                  including rights to access, correct or
                  delete certain information.
                </p>

                <p>
                  You may also be able to manage or delete
                  documents and account information through
                  your Lawlite account.
                </p>

                <p>
                  If you have a privacy-related request,
                  contact us using the details below.
                </p>

              </div>

            </section>


            {/* 09 */}

            <section
              id="children"
              className="privacy-section"
            >

              <div className="privacy-section-number">
                09
              </div>

              <div className="privacy-section-content">

                <div className="privacy-section-icon">
                  <UserRound size={18} />
                </div>

                <h2>
                  Children
                </h2>

                <p>
                  Lawlite is not intended to be used by
                  children without appropriate supervision
                  or authorisation where required by law.
                </p>

                <p>
                  If you believe that a child has provided
                  personal information to us inappropriately,
                  please contact us so that we can review
                  the situation.
                </p>

              </div>

            </section>


            {/* 10 */}

            <section
              id="changes"
              className="privacy-section"
            >

              <div className="privacy-section-number">
                10
              </div>

              <div className="privacy-section-content">

                <div className="privacy-section-icon">
                  <FileText size={18} />
                </div>

                <h2>
                  Changes to This Policy
                </h2>

                <p>
                  We may update this Privacy Policy from
                  time to time as Lawlite evolves, our
                  practices change or legal requirements
                  develop.
                </p>

                <p>
                  When we make material changes, we will
                  take reasonable steps to notify users
                  through the service or other appropriate
                  channels.
                </p>

                <p>
                  The updated policy will include a revised
                  "Last updated" date.
                </p>

              </div>

            </section>


            {/* 11 */}

            <section
              id="contact"
              className="privacy-section"
            >

              <div className="privacy-section-number">
                11
              </div>

              <div className="privacy-section-content">

                <div className="privacy-section-icon">
                  <Mail size={18} />
                </div>

                <h2>
                  Contact Us
                </h2>

                <p>
                  If you have questions about this Privacy
                  Policy, your information, or how Lawlite
                  handles data, please contact us.
                </p>

                <div className="privacy-contact">

                  <div className="privacy-contact-icon">
                    <Mail size={18} />
                  </div>

                  <div>

                    <span>
                      PRIVACY ENQUIRIES
                    </span>

                    <a href="mailto:hello@lawlite.ai">
                      hello@lawlite.ai
                    </a>

                  </div>

                </div>

              </div>

            </section>

          </div>

        </div>

      </main>


      {/* ========================================
          FINAL NOTE
      ======================================== */}

      <section className="privacy-final">

        <div className="privacy-container">

          <ShieldCheck size={18} />

          <p>
            We believe privacy and simplicity should
            go together. That's the standard we're
            building Lawlite around.
          </p>

        </div>

      </section>

    </div>
  );
};

export default Privacy;