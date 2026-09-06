import { useEffect, useMemo, useState } from "react";
import { Check, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "./Loading.css";

const loadingMessages = [
  "Preparing your Lawlite experience...",
  "Understanding your interests...",
  "Personalizing your experience...",
  "Organizing your legal space...",
  "Making things feel simpler...",
  "Setting up your workspace...",
  "Adding the finishing touches...",
  "Almost ready...",
];

const STEP_DURATION = 1875;
const TOTAL_DURATION = 15000;

const Loading = () => {
  const navigate = useNavigate();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  /*
   * We duplicate the first few items at the end so the
   * vertical animation has enough content to keep moving.
   */
  const visibleMessages = useMemo(
    () => [...loadingMessages, ...loadingMessages.slice(0, 3)],
    []
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((previous) => {
        const next = previous + 1;

        if (next >= loadingMessages.length) {
          return previous;
        }

        return next;
      });
    }, STEP_DURATION);

    const finishTimer = setTimeout(() => {
      setIsFinishing(true);

      setTimeout(() => {
        navigate("/chat");
      }, 650);
    }, TOTAL_DURATION);

    return () => {
      clearInterval(interval);
      clearTimeout(finishTimer);
    };
  }, [navigate]);

  return (
    <main
      className={`loading-page ${
        isFinishing ? "loading-finishing" : ""
      }`}
    >
      {/* =========================================
          BACKGROUND
      ========================================= */}

      <div className="loading-background" />

      <div className="loading-glow loading-glow-one" />
      <div className="loading-glow loading-glow-two" />

      {/* =========================================
          BRAND
      ========================================= */}

      <div className="loading-brand">
        <div className="loading-brand-mark">
          <span />
          <span />
          <span />
        </div>

        <span className="loading-brand-name">
          LAWLITE
        </span>
      </div>

      {/* =========================================
          MAIN LOADING AREA
      ========================================= */}

      <section className="loading-content">

        <div className="loading-intro">
          <span className="loading-eyebrow">
            YOUR EXPERIENCE
          </span>

          <h1>
            Just a moment<span className="loading-dots">...</span>
          </h1>
        </div>

        {/* =========================================
            MESSAGE WINDOW
        ========================================= */}

        <div className="loading-message-window">

          <div
            className="loading-message-track"
            style={{
              transform: `translateY(-${
                activeIndex * 76
              }px)`,
            }}
          >
            {visibleMessages.map((message, index) => {
              const distance = index - activeIndex;

              const isActive = index === activeIndex;
              const isComplete = index < activeIndex;

              return (
                <div
                  className={`loading-message ${
                    isActive
                      ? "loading-message-active"
                      : ""
                  } ${
                    isComplete
                      ? "loading-message-complete"
                      : ""
                  }`}
                  key={`${message}-${index}`}
                >

                  <div className="loading-status">

                    {isComplete ? (
                      <div className="loading-check">
                        <Check size={15} />
                      </div>
                    ) : isActive ? (
                      <div className="loading-current">
                        <span />
                      </div>
                    ) : (
                      <div className="loading-upcoming">
                        <Circle size={18} />
                      </div>
                    )}

                  </div>

                  <span className="loading-message-text">
                    {message}
                  </span>

                </div>
              );
            })}
          </div>

        </div>

        {/* =========================================
            PROGRESS
        ========================================= */}

        <div className="loading-progress">

          <div className="loading-progress-line">
            <span
              style={{
                width: `${Math.min(
                  ((activeIndex + 1) /
                    loadingMessages.length) *
                    100,
                  100
                )}%`,
              }}
            />
          </div>

          <div className="loading-progress-meta">
            <span>
              LAW LITE AI
            </span>

            <span>
              {Math.min(
                Math.round(
                  ((activeIndex + 1) /
                    loadingMessages.length) *
                    100
                ),
                100
              )}
              %
            </span>
          </div>

        </div>

      </section>

      {/* =========================================
          FOOTER
      ========================================= */}

      <div className="loading-footer">
        <span>
          AI-powered legal understanding
        </span>

        <span className="loading-footer-dot">
          ·
        </span>

        <span>
          Made to keep things simple
        </span>
      </div>

    </main>
  );
};

export default Loading;