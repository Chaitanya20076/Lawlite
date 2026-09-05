import {
  Languages,
  FileStack,
  Lightbulb,
  ArrowDown,
} from "lucide-react";

import "./WhyLawlite.css";

const WhyLawlite = () => {
  return (
    <section className="why-lawlite">

      <div className="why-lawlite-container">

        {/* Header */}

        <div className="why-header">

          <div className="why-label">
            <span />
            WHY LAWLITE
          </div>

          <div className="why-heading">

            <h2>
              Legal information
              <br />
              wasn't written
              <br />
              <span>for everyone.</span>
            </h2>

            <div className="why-heading-side">
              <p>
                Legal documents are precise by design.
                But precision doesn't always mean
                accessibility.
              </p>

              <div className="scroll-indicator">
                <ArrowDown size={15} />
                <span>SCROLL TO UNDERSTAND</span>
              </div>
            </div>

          </div>

        </div>


        {/* Problem Cards */}

        <div className="problem-grid">

          <article className="problem-item">

            <div className="problem-number">
              01
            </div>

            <div className="problem-icon">
              <Languages size={21} />
            </div>

            <h3>
              Legal jargon
            </h3>

            <p>
              Words and phrases that make perfect sense
              to legal professionals can be confusing
              to everyone else.
            </p>

            <div className="problem-word">
              <span>“HEREINABOVE”</span>
              <span>“PURSUANT TO”</span>
              <span>“AFORESAID”</span>
            </div>

          </article>


          <article className="problem-item">

            <div className="problem-number">
              02
            </div>

            <div className="problem-icon">
              <FileStack size={21} />
            </div>

            <h3>
              Information overload
            </h3>

            <p>
              Important details can get buried inside
              pages of formal language, references
              and clauses.
            </p>

            <div className="document-stack">

              <div />
              <div />
              <div />

              <span>30+ PAGES</span>

            </div>

          </article>


          <article className="problem-item">

            <div className="problem-number">
              03
            </div>

            <div className="problem-icon">
              <Lightbulb size={21} />
            </div>

            <h3>
              Missing context
            </h3>

            <p>
              Knowing what a sentence says isn't always
              enough. Understanding what it means is
              what really matters.
            </p>

            <div className="context-preview">

              <span>WHAT IT SAYS</span>

              <div className="context-line" />

              <ArrowDown size={14} />

              <span className="context-simple">
                WHAT IT MEANS
              </span>

            </div>

          </article>

        </div>


        {/* Transformation */}

        <div className="why-transform">

          <div className="transform-line">
            <span />
          </div>

          <div className="transform-content">

            <span className="transform-label">
              THE LAWLITE APPROACH
            </span>

            <h3>
              Complexity in.
              <br />
              <span>Clarity out.</span>
            </h3>

            <p>
              Lawlite doesn't simply shorten legal text.
              It helps explain the meaning behind it,
              so you can approach the information
              with greater clarity.
            </p>

          </div>

          <div className="transform-visual">

            <div className="transform-circle circle-one">
              <span>LEGAL</span>
            </div>

            <div className="transform-circle circle-two">
              <span>LAW LITE</span>
            </div>

            <div className="transform-circle circle-three">
              <span>HUMAN</span>
            </div>

          </div>

        </div>


        {/* Bottom note */}

        <div className="why-note">

          <span className="why-note-line" />

          <p>
            <strong>Understand first.</strong>{" "}
            Then decide what comes next.
          </p>

          <span className="why-note-line" />

        </div>

      </div>

    </section>
  );
};

export default WhyLawlite;