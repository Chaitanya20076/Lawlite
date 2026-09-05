
import {
  FileText,
  Scale,
  Languages,
  ListChecks,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

import "./Features.css";

const Features = () => {
  return (
    <section className="features">

      <div className="features-container">

        {/* Heading */}

        <div className="features-intro">

          <div className="features-intro-label">
            <span />
            WHAT LAW LITE UNDERSTANDS
          </div>

          <h2>
            You shouldn't need
            <br />
            <span>a law degree</span> to
            <br />
            understand the law.
          </h2>

          <p>
            Legal information can be difficult to navigate.
            Lawlite helps you make sense of the language,
            context and important details — without making
            you decode every sentence yourself.
          </p>

        </div>


        {/* Main visual */}

        <div className="features-showcase">

          {/* Left visual */}

          <div className="document-stage">

            <div className="stage-orbit orbit-one" />
            <div className="stage-orbit orbit-two" />

            <div className="document-sheet">

              <div className="sheet-top">
                <span>LEGAL DOCUMENT</span>

                <div className="sheet-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              <div className="sheet-title">
                NOTICE OF
                <br />
                PROCEEDINGS
              </div>

              <div className="sheet-meta">
                <span>REF. NO. 2847/26</span>
                <span>06 SEP 2026</span>
              </div>

              <div className="sheet-content">

                <div className="sheet-line full" />
                <div className="sheet-line large" />
                <div className="sheet-line full" />
                <div className="sheet-line medium" />
                <div className="sheet-line full" />
                <div className="sheet-line short" />

              </div>

              <div className="sheet-highlight">
                <span />
                <span />
              </div>

              <div className="sheet-footer">
                <Scale size={13} />
                <span>Complex legal language</span>
              </div>

            </div>


            {/* AI transformation */}

            <div className="ai-transform">

              <div className="transform-icon">
                <Sparkles size={16} />
              </div>

              <div>
                <span>LAW LITE AI</span>
                <strong>Making sense of it...</strong>
              </div>

              <div className="transform-pulse" />

            </div>


            {/* Simple explanation */}

            <div className="simple-card">

              <div className="simple-card-header">
                <div className="simple-logo">L</div>

                <div>
                  <span>LAW LITE EXPLAINS</span>
                  <strong>In simple terms</strong>
                </div>
              </div>

              <p>
                This notice means that a legal proceeding
                has started and you may need to respond
                within the specified period.
              </p>

              <div className="simple-card-bottom">
                <span>Plain-language explanation</span>
                <ArrowUpRight size={14} />
              </div>

            </div>

          </div>


          {/* Right feature list */}

          <div className="feature-list">

            <div className="feature-list-intro">
              <span>BUILT FOR REAL PEOPLE</span>

              <p>
                Whether you're looking at a legal notice,
                an unfamiliar Act or simply trying to
                understand what something means.
              </p>
            </div>


            <div className="feature-item active">

              <div className="feature-item-number">
                01
              </div>

              <div className="feature-item-icon">
                <FileText size={19} />
              </div>

              <div className="feature-item-content">
                <h3>Legal Notices</h3>

                <p>
                  Understand what a notice is saying,
                  why you've received it and the important
                  information within it.
                </p>
              </div>

              <ArrowUpRight className="feature-item-arrow" size={17} />

            </div>


            <div className="feature-item">

              <div className="feature-item-number">
                02
              </div>

              <div className="feature-item-icon">
                <Scale size={19} />
              </div>

              <div className="feature-item-content">
                <h3>Acts & Articles</h3>

                <p>
                  Explore complicated sections and
                  articles without getting lost in
                  legal terminology.
                </p>
              </div>

              <ArrowUpRight className="feature-item-arrow" size={17} />

            </div>


            <div className="feature-item">

              <div className="feature-item-number">
                03
              </div>

              <div className="feature-item-icon">
                <ListChecks size={19} />
              </div>

              <div className="feature-item-content">
                <h3>Key Information</h3>

                <p>
                  Surface important points, dates,
                  obligations and details hidden
                  inside lengthy text.
                </p>
              </div>

              <ArrowUpRight className="feature-item-arrow" size={17} />

            </div>


            <div className="feature-item">

              <div className="feature-item-number">
                04
              </div>

              <div className="feature-item-icon">
                <Languages size={19} />
              </div>

              <div className="feature-item-content">
                <h3>Human Language</h3>

                <p>
                  Turn complicated legal wording into
                  explanations that are easier to read,
                  understand and remember.
                </p>
              </div>

              <ArrowUpRight className="feature-item-arrow" size={17} />

            </div>

          </div>

        </div>


        {/* Bottom statement */}

        <div className="features-statement">

          <div className="statement-mark">
            “
          </div>

          <p>
            The goal isn't to make you a lawyer.
            <br />
            <strong>It's to help you understand what you're reading.</strong>
          </p>

          <div className="statement-line" />

        </div>

      </div>

    </section>
  );
};

export default Features;
