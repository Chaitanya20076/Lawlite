import {
  Mail,
  UserRound,
  Code2,
  ArrowRight,
} from "lucide-react";

import "./Contact.css";

const Contact = () => {
  return (
    <div className="contact-page">

      {/* Hero */}

      <section className="contact-hero">

        <div className="contact-container">

          <div className="contact-eyebrow">
            <Mail size={15} />
            CONTACT
          </div>

          <h1>
            Let's talk about
            <span> Lawlite.</span>
          </h1>

          <p className="contact-intro">
            Lawlite is a personal project built by Chaitanya N
            to explore how AI can make complex legal information
            easier for people to understand.
          </p>

        </div>

      </section>


      {/* Main */}

      <main className="contact-content">

        <div className="contact-container contact-layout">

          {/* Developer */}

          <div className="contact-developer">

            <div className="contact-icon">
              <UserRound size={22} />
            </div>

            <span className="contact-label">
              PROJECT DEVELOPER
            </span>

            <h2>
              Chaitanya N
            </h2>

            <p>
              Lawlite is currently a personal project and is
              not a production application or commercial
              legal service.
            </p>

          </div>


          {/* Contact */}

          <div className="contact-card">

            <div className="contact-card-top">

              <div className="contact-card-icon">
                <Mail size={20} />
              </div>

              <span>
                PERSONAL CONTACT
              </span>

            </div>

            <h3>
              Have something to say?
            </h3>

            <p>
              For questions, feedback, suggestions,
              collaboration opportunities or anything
              related to Lawlite, you can reach the developer
              directly.
            </p>

            <a
              href="mailto:chaitanya222007@gmail.com"
              className="contact-email"
            >
              <span>
                chaitanya222007@gmail.com
              </span>

              <ArrowRight size={17} />

            </a>

          </div>

        </div>

      </main>


      {/* Transparency */}

      <section className="contact-note-section">

        <div className="contact-container">

          <div className="contact-note">

            <div className="contact-note-icon">
              <Code2 size={19} />
            </div>

            <div>

              <span>
                A NOTE ABOUT LAWLITE
              </span>

              <p>
                This website and the Lawlite project are
                created and maintained by <strong>Chaitanya N</strong>.
                As this is currently a personal project and
                not a production application, contact details
                throughout this website use the developer's
                personal email address.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* Bottom */}

      <section className="contact-final">

        <div className="contact-container">

          <p>
            Built as a project. Built to make legal
            information easier to understand.
          </p>

        </div>

      </section>

    </div>
  );
};

export default Contact;