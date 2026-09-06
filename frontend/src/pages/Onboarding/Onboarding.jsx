import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Car,
  Heart,
  Home,
  Scale,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from "lucide-react";

import "./Onboarding.css";

const interestOptions = [
  {
    id: "property",
    label: "Property & Housing",
    icon: Home,
  },
  {
    id: "work",
    label: "Work & Employment",
    icon: BriefcaseBusiness,
  },
  {
    id: "finance",
    label: "Finance & Taxes",
    icon: CircleDollarSign,
  },
  {
    id: "family",
    label: "Family & Relationships",
    icon: Heart,
  },
  {
    id: "consumer",
    label: "Consumer Rights",
    icon: ShieldCheck,
  },
  {
    id: "traffic",
    label: "Traffic & Vehicles",
    icon: Car,
  },
  {
    id: "business",
    label: "Business & Startups",
    icon: Building2,
  },
  {
    id: "general",
    label: "General Law",
    icon: Scale,
  },
];

const steps = [
  {
    number: "01",
    label: "ABOUT YOU",
  },
  {
    number: "02",
    label: "YOUR BIRTHDAY",
  },
  {
    number: "03",
    label: "YOUR INTERESTS",
  },
  {
    number: "04",
    label: "GET STARTED",
  },
];

const Onboarding = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    interests: [],
  });

  const [error, setError] = useState("");

  const handleNameChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      name: event.target.value,
    }));

    setError("");
  };

  const handleDobChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      dob: event.target.value,
    }));

    setError("");
  };

  const toggleInterest = (interestId) => {
    setFormData((previous) => {
      const alreadySelected =
        previous.interests.includes(interestId);

      return {
        ...previous,
        interests: alreadySelected
          ? previous.interests.filter(
              (item) => item !== interestId
            )
          : [...previous.interests, interestId],
      };
    });

    setError("");
  };

  const validateCurrentStep = () => {
    if (step === 1) {
      if (!formData.name.trim()) {
        setError("Tell us what we can call you.");
        return false;
      }

      if (formData.name.trim().length < 2) {
        setError("Please enter at least 2 characters.");
        return false;
      }
    }

    if (step === 2) {
      if (!formData.dob) {
        setError("Please enter your date of birth.");
        return false;
      }

      const selectedDate = new Date(formData.dob);
      const today = new Date();

      if (selectedDate > today) {
        setError("Your date of birth can't be in the future.");
        return false;
      }

      const minimumDate = new Date();
      minimumDate.setFullYear(
        minimumDate.getFullYear() - 120
      );

      if (selectedDate < minimumDate) {
        setError("Please enter a valid date of birth.");
        return false;
      }
    }

    if (step === 3) {
      if (formData.interests.length === 0) {
        setError("Choose at least one interest to continue.");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }

    setError("");

    if (step < 4) {
      setStep((previous) => previous + 1);
    }
  };

  const handleBack = () => {
    setError("");

    if (step > 1) {
      setStep((previous) => previous - 1);
    }
  };

  const handleStart = () => {
  const onboardingData = {
    name: formData.name.trim(),
    dob: formData.dob,
    interests: formData.interests,
  };

  localStorage.setItem(
    "lawlite-onboarding",
    JSON.stringify(onboardingData)
  );

  navigate("/loading");
};

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "What can we call you?";

      case 2:
        return "When's your birthday?";

      case 3:
        return "What are you interested in?";

      case 4:
        return `You're all set, ${formData.name.trim() || "there"}.`;

      default:
        return "";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1:
        return "Let's make your Lawlite experience feel a little more personal.";

      case 2:
        return "A little more about you before we get started.";

      case 3:
        return "Pick a few topics you'd like Lawlite to understand you better.";

      case 4:
        return "Your Lawlite experience is ready. Let's make legal information easier to understand.";

      default:
        return "";
    }
  };

  return (
    <main className="onboarding-page">

      {/* ========================================
          BACKGROUND
      ======================================== */}

      <div className="onboarding-background" />

      <div className="onboarding-glow onboarding-glow-one" />
      <div className="onboarding-glow onboarding-glow-two" />

      <div
        className="onboarding-particles"
        aria-hidden="true"
      >
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* ========================================
          TOP BAR
      ======================================== */}

      <header className="onboarding-header">

        <button
          type="button"
          className="onboarding-logo"
          onClick={() => navigate("/")}
        >
          <span className="onboarding-logo-mark">
            <Scale size={18} />
          </span>

          <span>LAWLITE</span>
        </button>

        <div className="onboarding-header-label">
          SETTING UP YOUR EXPERIENCE
        </div>

      </header>

      {/* ========================================
          MAIN
      ======================================== */}

      <section className="onboarding-main">

        {/* ========================================
            PROGRESS
        ======================================== */}

        <div className="onboarding-progress">

          {steps.map((item, index) => {
            const stepNumber = index + 1;

            const isActive = step === stepNumber;
            const isComplete = step > stepNumber;

            return (
              <div
                className={`onboarding-progress-step ${
                  isActive ? "active" : ""
                } ${isComplete ? "complete" : ""}`}
                key={item.number}
              >

                <div className="onboarding-progress-number">
                  {isComplete ? (
                    <Check size={12} />
                  ) : (
                    item.number
                  )}
                </div>

                <span>
                  {item.label}
                </span>

                {index < steps.length - 1 && (
                  <div className="onboarding-progress-line">
                    <span
                      className={
                        isComplete
                          ? "filled"
                          : ""
                      }
                    />
                  </div>
                )}

              </div>
            );
          })}

        </div>

        {/* ========================================
            CONTENT
        ======================================== */}

        <div className="onboarding-content">

          {/* EYEBROW */}

          <div className="onboarding-eyebrow">

            <Sparkles size={15} />

            <span>
              {step === 4
                ? "WELCOME TO LAWLITE"
                : `STEP ${String(step).padStart(2, "0")}`}
            </span>

          </div>

          {/* TITLE */}

          <h1 className="onboarding-title">
            {getStepTitle()}
          </h1>

          <p className="onboarding-description">
            {getStepDescription()}
          </p>

          {/* ========================================
              STEP 1 — NAME
          ======================================== */}

          {step === 1 && (
            <div className="onboarding-step onboarding-name-step">

              <div className="onboarding-input-container">

                <label htmlFor="onboarding-name">
                  Your name
                </label>

                <div className="onboarding-input-wrapper">

                  <input
                    id="onboarding-name"
                    type="text"
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="What should we call you?"
                    autoFocus
                    autoComplete="name"
                    maxLength={60}
                  />

                  <span className="onboarding-input-icon">
                    <Users size={18} />
                  </span>

                </div>

                <span className="onboarding-input-hint">
                  You can always change this later.
                </span>

              </div>

            </div>
          )}

          {/* ========================================
              STEP 2 — DOB
          ======================================== */}

          {step === 2 && (
            <div className="onboarding-step onboarding-dob-step">

              <div className="onboarding-input-container">

                <label htmlFor="onboarding-dob">
                  Date of birth
                </label>

                <div className="onboarding-input-wrapper">

                  <input
                    id="onboarding-dob"
                    type="date"
                    value={formData.dob}
                    onChange={handleDobChange}
                    autoFocus
                  />

                </div>

                <span className="onboarding-input-hint">
                  Your birthday stays part of your personal
                  profile.
                </span>

              </div>

            </div>
          )}

          {/* ========================================
              STEP 3 — INTERESTS
          ======================================== */}

          {step === 3 && (
            <div className="onboarding-step onboarding-interests-step">

              <div className="onboarding-interest-grid">

                {interestOptions.map((interest) => {
                  const Icon = interest.icon;

                  const selected =
                    formData.interests.includes(
                      interest.id
                    );

                  return (
                    <button
                      type="button"
                      key={interest.id}
                      className={`onboarding-interest ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        toggleInterest(
                          interest.id
                        )
                      }
                    >

                      <span className="onboarding-interest-icon">
                        <Icon size={19} />
                      </span>

                      <span className="onboarding-interest-label">
                        {interest.label}
                      </span>

                      <span className="onboarding-interest-check">
                        {selected && (
                          <Check size={13} />
                        )}
                      </span>

                    </button>
                  );
                })}

              </div>

              <div className="onboarding-interest-count">

                <span>
                  {formData.interests.length}
                </span>

                {formData.interests.length === 1
                  ? " interest selected"
                  : " interests selected"}

              </div>

            </div>
          )}

          {/* ========================================
              STEP 4 — START
          ======================================== */}

          {step === 4 && (
            <div className="onboarding-step onboarding-final-step">

              <div className="onboarding-final-mark">

                <div className="onboarding-final-ring">
                  <Scale size={38} />
                </div>

                <span className="onboarding-final-spark spark-one">
                  ✦
                </span>

                <span className="onboarding-final-spark spark-two">
                  ·
                </span>

                <span className="onboarding-final-spark spark-three">
                  ✦
                </span>

              </div>

              <div className="onboarding-final-summary">

                <div>
                  <span>YOUR NAME</span>
                  <strong>
                    {formData.name}
                  </strong>
                </div>

                <div>
                  <span>INTERESTS</span>
                  <strong>
                    {formData.interests.length} selected
                  </strong>
                </div>

              </div>

            </div>
          )}

          {/* ========================================
              ERROR
          ======================================== */}

          {error && (
            <div className="onboarding-error">
              {error}
            </div>
          )}

          {/* ========================================
              ACTIONS
          ======================================== */}

          <div className="onboarding-actions">

            {step > 1 ? (
              <button
                type="button"
                className="onboarding-back"
                onClick={handleBack}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                className="onboarding-next"
                onClick={handleNext}
              >
                <span>
                  Continue
                </span>

                <ArrowRight size={17} />
              </button>
            ) : (
              <button
                type="button"
                className="onboarding-start"
                onClick={handleStart}
              >
                <span>
                  Start using Lawlite
                </span>

                <ArrowRight size={18} />
              </button>
            )}

          </div>

        </div>

        {/* ========================================
            FOOTER
        ======================================== */}

        <footer className="onboarding-footer">

          <ShieldCheck size={14} />

          <span>
            Your information helps personalize your
            Lawlite experience.
          </span>

        </footer>

      </section>

    </main>
  );
};

export default Onboarding;