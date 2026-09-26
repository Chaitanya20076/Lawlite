import {
  ArrowDown,
  ArrowUpRight,
  Database,
  Mail,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

import "./Partners.css";


// ============================================================
// LOGOS
// ============================================================

import brevoLogo from "../../assets/partners/brevo.jpg";
import dropboxLogo from "../../assets/partners/dropbox.webp";
import firebaseLogo from "../../assets/partners/firebase.png";
import firestoreLogo from "../../assets/partners/firestore.png";
import githubLogo from "../../assets/partners/github.webp";
import gmailLogo from "../../assets/partners/gmail.webp";
import googleDriveLogo from "../../assets/partners/google-drive.png";
import notionLogo from "../../assets/partners/notion.png";
import sarvamLogo from "../../assets/partners/sarvam.avif";
import serperLogo from "../../assets/partners/serper.png";


// ============================================================
// PARTNER DATA
// ============================================================

const partnerGroups = [
  {
    id: "intelligence",
    index: "01",
    eyebrow: "AI INTELLIGENCE",
    title: "The intelligence\nlayer.",
    description:
      "The AI and search technologies that help Lawlite understand questions, explain legal information and bring relevant information into the conversation.",
    accent: "gold",
    icon: Sparkles,

    partners: [
      {
        name: "Sarvam AI",
        role: "AI Intelligence",
        description:
          "Powers Lawlite's conversational intelligence and natural-language legal explanations.",
        logo: sarvamLogo,
        tag: "CORE AI",
      },

      {
        name: "Serper",
        role: "Search Intelligence",
        description:
          "Provides web-search infrastructure when Lawlite needs fresh or time-sensitive information.",
        logo: serperLogo,
        tag: "WEB SEARCH",
      },
    ],
  },


  {
    id: "infrastructure",
    index: "02",
    eyebrow: "CLOUD INFRASTRUCTURE",
    title: "The infrastructure\nlayer.",
    description:
      "Authentication and cloud data infrastructure supporting the foundation of the Lawlite application.",
    accent: "blue",
    icon: Database,

    partners: [
      {
        name: "Firebase",
        role: "Authentication",
        description:
          "Handles authentication and account sign-in for the Lawlite experience.",
        logo: firebaseLogo,
        tag: "AUTH",
      },

      {
        name: "Firestore",
        role: "Cloud Database",
        description:
          "Provides cloud database infrastructure for persistent application data.",
        logo: firestoreLogo,
        tag: "DATA",
      },
    ],
  },


  {
    id: "communication",
    index: "03",
    eyebrow: "COMMUNICATION",
    title: "The communication\nlayer.",
    description:
      "The service that keeps important account communication moving behind the scenes.",
    accent: "coral",
    icon: Mail,

    partners: [
      {
        name: "Brevo",
        role: "Transactional Email",
        description:
          "Handles account verification and transactional email communication.",
        logo: brevoLogo,
        tag: "EMAIL",
      },
    ],
  },


  {
    id: "workspace",
    index: "04",
    eyebrow: "CONNECTED WORKSPACE",
    title: "The workspace\nlayer.",
    description:
      "Lawlite can connect with the tools people already use, bringing relevant information into a single legal workspace.",
    accent: "green",
    icon: Network,

    partners: [
      {
        name: "Google Drive",
        role: "Document Integration",
        description:
          "Connect documents and PDFs stored in Google Drive.",
        logo: googleDriveLogo,
        tag: "DOCUMENTS",
      },

      {
        name: "Gmail",
        role: "Email Integration",
        description:
          "Connect relevant emails and attachments to Lawlite.",
        logo: gmailLogo,
        tag: "COMMUNICATION",
      },

      {
        name: "Dropbox",
        role: "File Integration",
        description:
          "Connect files stored inside Dropbox.",
        logo: dropboxLogo,
        tag: "FILES",
      },

      {
        name: "Notion",
        role: "Knowledge Integration",
        description:
          "Connect pages and databases from a Notion workspace.",
        logo: notionLogo,
        tag: "KNOWLEDGE",
      },

      {
        name: "GitHub",
        role: "Developer Integration",
        description:
          "Bring relevant repository and code context into Lawlite.",
        logo: githubLogo,
        tag: "DEVELOPER",
      },
    ],
  },
];


// ============================================================
// STATS
// ============================================================

const ecosystemStats = [
  {
    value: "10",
    label: "TECHNOLOGIES",
  },

  {
    value: "04",
    label: "ECOSYSTEM LAYERS",
  },

  {
    value: "01",
    label: "CONNECTED WORKSPACE",
  },
];


// ============================================================
// PARTNER CARD
// ============================================================

const PartnerCard = ({
  partner,
  index,
}) => {

  return (
    <article className="partner-card">

      {/* TOP */}

      <div className="partner-card-top">

        <span className="partner-card-number">
          {String(index + 1).padStart(2, "0")}
        </span>

        <span className="partner-card-tag">
          {partner.tag}
        </span>

      </div>


      {/* ======================================================
          LARGE LOGO AREA
      ====================================================== */}

      <div className="partner-card-logo-shell">

        <div className="partner-card-glow" />

        <div className="partner-card-logo">

          <img
            src={partner.logo}
            alt={`${partner.name} logo`}
          />

        </div>

      </div>


      {/* CONTENT */}

      <div className="partner-card-content">

        <span className="partner-card-role">
          {partner.role}
        </span>

        <h3>
          {partner.name}
        </h3>

        <p>
          {partner.description}
        </p>

      </div>


      {/* FOOTER */}

      <div className="partner-card-footer">

        <span>
          LAWLITE ECOSYSTEM
        </span>

        <span className="partner-card-arrow">
          <ArrowUpRight size={15} />
        </span>

      </div>

    </article>
  );
};


// ============================================================
// PARTNERS PAGE
// ============================================================

const Partners = () => {

  const totalPartners =
    partnerGroups.reduce(
      (sum, group) =>
        sum + group.partners.length,
      0
    );


  return (
    <main className="partners-page">


      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="partners-hero">

        <div
          className="partners-hero-grid"
          aria-hidden="true"
        />

        <div
          className="partners-hero-glow partners-hero-glow-one"
          aria-hidden="true"
        />

        <div
          className="partners-hero-glow partners-hero-glow-two"
          aria-hidden="true"
        />


        <div className="partners-hero-inner">


          <div className="partners-hero-eyebrow">

            <span />

            <Sparkles size={13} />

            <span>
              THE LAWLITE ECOSYSTEM
            </span>

            <span />

          </div>


          <h1>

            <span className="partners-hero-line">
              Built by
            </span>

            <span className="partners-hero-line partners-hero-line-highlight">
              connection.
            </span>

            <span className="partners-hero-line partners-hero-line-soft">
              Powered by
            </span>

            <span className="partners-hero-line">
              intelligence.
            </span>

          </h1>


          <p className="partners-hero-description">
            Lawlite brings together AI,
            infrastructure, communication
            and the tools you already use —
            creating one connected space
            for understanding legal information.
          </p>


          <div className="partners-hero-actions">

            <a
              href="#ecosystem"
              className="partners-primary-button"
            >

              <span>
                Explore the ecosystem
              </span>

              <ArrowDown size={16} />

            </a>

            <span className="partners-hero-note">
              {totalPartners} technologies
              working together
            </span>

          </div>


          {/* STATS */}

          <div className="partners-stats">

            {ecosystemStats.map(
              (stat) => (
                <div
                  className="partners-stat"
                  key={stat.label}
                >

                  <strong>
                    {stat.value}
                  </strong>

                  <span>
                    {stat.label}
                  </span>

                </div>
              )
            )}

          </div>

        </div>


        {/* HERO BOTTOM */}

        <div className="partners-hero-bottom">

  <span>
    10 TECHNOLOGIES
  </span>

  <div className="partners-hero-bottom-line" />

  <span>
    04 ECOSYSTEM LAYERS
  </span>

  <div className="partners-hero-bottom-line" />

  <span>
    01 CONNECTED WORKSPACE
  </span>

</div>

      </section>


      {/* ======================================================
          MARQUEE
      ====================================================== */}

     {/* ======================================================
    ECOSYSTEM TICKER
====================================================== */}

<section className="partners-marquee">

  <div className="partners-marquee-track">

    <div className="partners-marquee-group">

      <span>AI INTELLIGENCE</span>
      <i />
      <span>INFRASTRUCTURE</span>
      <i />
      <span>COMMUNICATION</span>
      <i />
      <span>CONNECTED WORKSPACE</span>
      <i />

    </div>


    {/* EXACT DUPLICATE FOR SEAMLESS LOOP */}

    <div className="partners-marquee-group">

      <span>AI INTELLIGENCE</span>
      <i />
      <span>INFRASTRUCTURE</span>
      <i />
      <span>COMMUNICATION</span>
      <i />
      <span>CONNECTED WORKSPACE</span>
      <i />

    </div>

  </div>

</section>


      {/* ======================================================
          INTRO
      ====================================================== */}

      <section
        className="partners-intro"
        id="ecosystem"
      >

        <div className="partners-intro-index">
          00
        </div>


        <div className="partners-intro-copy">

          <span className="partners-section-eyebrow">
            ONE ECOSYSTEM
          </span>

          <h2>

            Different roles.
            <br />

            <em>
              One purpose.
            </em>

          </h2>

          <p>
            Every technology in the Lawlite
            ecosystem exists for a reason.
            Together they create the systems
            behind the experience — while
            keeping the user and their
            information at the centre.
          </p>

        </div>


        <div className="partners-intro-symbol">

          <div className="partners-symbol-ring ring-one" />

          <div className="partners-symbol-ring ring-two" />

          <div className="partners-symbol-core">
            <Network size={22} />
          </div>

        </div>

      </section>


      {/* ======================================================
          PARTNER GROUPS
      ====================================================== */}

      <section className="partners-groups">

        {partnerGroups.map(
          (group) => {

            const GroupIcon =
              group.icon;

            return (
              <section
                className={`partners-group partners-group-${group.accent}`}
                key={group.id}
              >

                {/* GROUP HEADER */}

                <div className="partners-group-header">

                  <div className="partners-group-index">

                    <span>
                      {group.index}
                    </span>

                    <div />

                  </div>


                  <div className="partners-group-main">

                    <div className="partners-group-eyebrow">

                      <GroupIcon size={14} />

                      <span>
                        {group.eyebrow}
                      </span>

                    </div>


                    <h2>

                      {group.title
                        .split("\n")
                        .map(
                          (
                            line,
                            index
                          ) => (
                            <span
                              key={index}
                            >
                              {line}
                            </span>
                          )
                        )}

                    </h2>


                    <p>
                      {group.description}
                    </p>

                  </div>


                  <div className="partners-group-side">

                    <span>
                      ROLE
                    </span>

                    <strong>
                      {group.partners.length}
                    </strong>

                    <small>
                      {group.partners.length === 1
                        ? "technology"
                        : "technologies"}
                    </small>

                  </div>

                </div>


                {/* CARD GRID */}

                <div
                  className={`partners-card-grid partners-card-grid-${group.partners.length}`}
                >

                  {group.partners.map(
                    (
                      partner,
                      index
                    ) => (
                      <PartnerCard
                        key={partner.name}
                        partner={partner}
                        index={index}
                      />
                    )
                  )}

                </div>

              </section>
            );
          }
        )}

      </section>


      {/* ======================================================
          NETWORK
      ====================================================== */}

      <section className="partners-network-section">

        <div className="partners-network-bg" />


        <div className="partners-network-copy">

          <span className="partners-section-eyebrow">
            THE CONNECTION
          </span>

          <h2>

            Many systems.

            <br />

            <em>
              One Lawlite.
            </em>

          </h2>

          <p>
            AI intelligence sits at the centre.
            Search, data, communication and
            connected workspaces orbit around it.
          </p>

        </div>


        <div className="partners-network-visual">

          <div className="network-ring network-ring-one" />
          <div className="network-ring network-ring-two" />
          <div className="network-ring network-ring-three" />


          <div className="network-center">

            <div className="network-center-glow" />

            <div className="network-center-mark">
              L
            </div>

            <span>
              LAWLITE
            </span>

          </div>


          <div className="network-node network-node-one">

            <Sparkles size={15} />

            <span>
              AI
            </span>

          </div>


          <div className="network-node network-node-two">

            <Search size={15} />

            <span>
              SEARCH
            </span>

          </div>


          <div className="network-node network-node-three">

            <Database size={15} />

            <span>
              DATA
            </span>

          </div>


          <div className="network-node network-node-four">

            <Mail size={15} />

            <span>
              COMMUNICATION
            </span>

          </div>


          <div className="network-node network-node-five">

            <Network size={15} />

            <span>
              WORKSPACE
            </span>

          </div>


          <div className="network-node network-node-six">

            <ShieldCheck size={15} />

            <span>
              TRUST
            </span>

          </div>


          <span className="network-line network-line-one" />
          <span className="network-line network-line-two" />
          <span className="network-line network-line-three" />
          <span className="network-line network-line-four" />
          <span className="network-line network-line-five" />
          <span className="network-line network-line-six" />

        </div>

      </section>


      {/* ======================================================
          PHILOSOPHY
      ====================================================== */}

      <section className="partners-philosophy">

        <div className="partners-philosophy-number">
          05
        </div>


        <div className="partners-philosophy-content">

          <span className="partners-section-eyebrow">
            THE IDEA
          </span>

          <h2>

            Technology should
            <br />

            <em>
              disappear into the experience.
            </em>

          </h2>


          <p>
            You do not need to think about
            which system is retrieving your
            document, which service handles
            authentication or which layer
            delivers the answer.
          </p>


          <p>
            You ask a question.
            Lawlite brings the right pieces
            together.
          </p>

        </div>


        <div className="partners-philosophy-symbol">

          <Workflow size={30} />

        </div>

      </section>


      {/* ======================================================
          FINAL BRAND
      ====================================================== */}

      <section className="partners-closing">

        <div className="partners-closing-grid" />

        <div className="partners-closing-glow" />


        <div className="partners-closing-content">

          <span className="partners-section-eyebrow">
            THIS IS THE ECOSYSTEM
          </span>


          <h2>

            Built with
            <br />

            <em>
              technology.
            </em>

            <br />

            Designed for
            <br />

            <span>
              understanding.
            </span>

          </h2>


          <p>
            A personal project by Chaitanya N,
            bringing modern AI and connected
            technology together for one simple
            purpose — making legal information
            easier to understand.
          </p>


          <div className="partners-final-brand">

            <span>
              L
            </span>

            <strong>
              LAWLITE
            </strong>

          </div>


          <div className="partners-final-footer">

            <span>
              UNDERSTAND FIRST.
            </span>

            <span className="partners-final-footer-line" />

            <span>
              DECIDE WHAT COMES NEXT.
            </span>

          </div>

        </div>

      </section>

    </main>
  );
};


export default Partners;