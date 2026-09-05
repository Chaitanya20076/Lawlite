import {
  FileText,
  Sparkles,
  MessageSquareText,
  ArrowRight,
  Check,
} from "lucide-react";

import "./HowItWorks.css";

const HowItWorks = () => {
  return (
    <section className="how-it-works">

      <div className="how-it-works-container">

        {/* Section Header */}

        <div className="section-heading">

          <span className="section-eyebrow">
            HOW LAW LITE WORKS
          </span>

          <h2>
            From legal complexity
            <br />
            <span>to clarity.</span>
          </h2>

          <p>
            Give Lawlite the legal content you don't understand.
            We'll help break it down into language that actually
            makes sense.
          </p>

        </div>

        {/* Process */}

        <div className="process">

          {/* Step 01 */}

          <div className="process-step">

            <div className="step-number">
              01
            </div>

            <div className="step-card">

              <div className="step-icon">
                <FileText size={22} />
              </div>

              <span className="step-label">
                YOUR DOCUMENT
              </span>

              <h3>
                Bring the legal stuff.
              </h3>

              <p>
                Upload or provide the legal notice,
                document, act, article or text you want
                to understand.
              </p>

              <div className="document-preview">

                <div className="preview-top">
                  <span>LEGAL DOCUMENT</span>
                  <span>PDF</span>
                </div>

                <div className="preview-lines">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

              </div>

            </div>

          </div>

          {/* Connector */}

          <div className="process-connector">
            <div className="connector-line" />
            <ArrowRight size={18} />
          </div>

          {/* Step 02 */}

          <div className="process-step">

            <div className="step-number">
              02
            </div>

            <div className="step-card">

              <div className="step-icon ai-icon">
                <Sparkles size={22} />
              </div>

              <span className="step-label">
                LAW LITE AI
              </span>

              <h3>
                Let Lawlite break it down.
              </h3>

              <p>
                Lawlite analyses the content and identifies
                the important information hiding behind
                complicated legal language.
              </p>

              <div className="analysis-preview">

                <div className="analysis-header">
                  <div className="analysis-dot" />
                  <span>Understanding document</span>
                </div>

                <div className="analysis-bar">
                  <span />
                </div>

                <div className="analysis-tags">
                  <span>Context</span>
                  <span>Key points</span>
                  <span>Obligations</span>
                </div>

              </div>

            </div>

          </div>

          {/* Connector */}

          <div className="process-connector">
            <div className="connector-line" />
            <ArrowRight size={18} />
          </div>

          {/* Step 03 */}

          <div className="process-step">

            <div className="step-number">
              03
            </div>

            <div className="step-card">

              <div className="step-icon explanation-icon">
                <MessageSquareText size={22} />
              </div>

              <span className="step-label">
                SIMPLE EXPLANATION
              </span>

              <h3>
                Actually understand it.
              </h3>

              <p>
                Get the important parts explained in
                straightforward language, without the
                legal jargon.
              </p>

              <div className="explanation-preview">

                <div className="explanation-preview-header">
                  <span className="mini-logo">L</span>
                  <span>Lawlite says</span>
                </div>

                <p>
                  "In simple terms, this means you
                  may need to respond to this notice
                  within the given time."
                </p>

                <div className="explanation-check">
                  <Check size={13} />
                  <span>Plain-language explanation</span>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
};

export default HowItWorks;