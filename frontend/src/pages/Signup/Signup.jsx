import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  User,
  ShieldCheck,
  Sparkles,
  Scale,
  FileText,
  Check,
} from "lucide-react";

import "./Signup.css";

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // Account creation will be connected later.
    console.log(
      "Signup submitted:",
      formData
    );
  };

  return (
    <div className="signup-page">

      {/* ========================================
          LEFT VISUAL PANEL
      ======================================== */}

      <section className="signup-visual">

        {/* Background */}

        <div className="signup-grid" />

        <div className="signup-glow signup-glow-one" />
        <div className="signup-glow signup-glow-two" />


        {/* Particles */}

        <div className="signup-particles">

          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />

        </div>


        {/* Brand */}

        <div className="signup-brand">

          <div className="signup-brand-mark">
            L
          </div>

          <span>
            Lawlite
          </span>

        </div>


        {/* Main Content */}

        <div className="signup-visual-content">

          <div className="signup-eyebrow">

            <Sparkles size={14} />

            <span>
              AI-POWERED LEGAL UNDERSTANDING
            </span>

          </div>


          {/* ========================================
              ANIMATED HEADING
          ======================================== */}

          <h1 className="signup-animated-heading">

            <span className="signup-heading-static">
              Legal understanding
            </span>

            <span className="signup-heading-rotator">

              <span className="signup-heading-phrase">
                starts here.
              </span>

              <span className="signup-heading-phrase">
                shouldn't feel complicated.
              </span>

              <span className="signup-heading-phrase">
                should be for everyone.
              </span>

              <span className="signup-heading-phrase">
                begins with clarity.
              </span>

            </span>

          </h1>


          <p>
            Create your Lawlite account and turn
            complicated legal language into something
            you can actually understand.
          </p>


          {/* ========================================
              TRANSFORMATION VISUAL
          ======================================== */}

          <div className="signup-transform">

            {/* Document */}

            <div className="signup-document">

              <div className="signup-document-header">

                <FileText size={14} />

                <span>
                  LEGAL DOCUMENT
                </span>

              </div>


              <div className="signup-document-lines">

                <span />
                <span />
                <span className="short" />
                <span />
                <span />
                <span className="medium" />
                <span />

              </div>


              <div className="signup-document-mark">
                §
              </div>

            </div>


            {/* Arrow */}

            <div className="signup-transform-arrow">

              <div />

              <Sparkles size={16} />

              <div />

            </div>


            {/* Explanation */}

            <div className="signup-explanation">

              <div className="signup-explanation-top">

                <div className="signup-explanation-logo">
                  L
                </div>

                <span>
                  LAW LITE
                </span>

              </div>


              <h3>
                Simple.
              </h3>


              <p>
                Complex legal language,
                explained in everyday words.
              </p>


              <div className="signup-explanation-status">

                <ShieldCheck size={13} />

                <span>
                  Made easier to understand
                </span>

              </div>

            </div>

          </div>


          {/* ========================================
              PROCESS
          ======================================== */}

          <div className="signup-process">

            <div className="signup-process-item">

              <span className="signup-process-number">
                01
              </span>

              <div>
                <strong>
                  Upload
                </strong>

                <small>
                  Your document
                </small>
              </div>

            </div>


            <div className="signup-process-line" />


            <div className="signup-process-item">

              <span className="signup-process-number">
                02
              </span>

              <div>
                <strong>
                  Understand
                </strong>

                <small>
                  What it means
                </small>
              </div>

            </div>


            <div className="signup-process-line" />


            <div className="signup-process-item">

              <span className="signup-process-number">
                03
              </span>

              <div>
                <strong>
                  Clarify
                </strong>

                <small>
                  What's confusing
                </small>
              </div>

            </div>

          </div>

        </div>


        {/* Footer */}

        <div className="signup-visual-footer">

          <Scale size={15} />

          <span>
            Understand first. Then decide what comes next.
          </span>

        </div>

      </section>


      {/* ========================================
          RIGHT FORM PANEL
      ======================================== */}

      <section className="signup-form-panel">

        <div className="signup-form-wrapper">


          {/* ========================================
              MOBILE BRAND
          ======================================== */}

          <div className="signup-mobile-brand">

            <div className="signup-brand-mark">
              L
            </div>

            <span>
              Lawlite
            </span>

          </div>


          {/* ========================================
              HEADING
          ======================================== */}

          <div className="signup-heading">

            <span className="signup-form-label">
              GET STARTED
            </span>

            <h2>
              Create your
              <span> Lawlite.</span>
            </h2>

            <p>
              Start making sense of the law.
            </p>

          </div>


          {/* ========================================
              FORM
          ======================================== */}

          <form
            className="signup-form"
            onSubmit={handleSubmit}
          >


            {/* Full Name */}

            <div className="signup-form-field">

              <label htmlFor="signup-name">
                Full name
              </label>

              <div className="signup-input-wrapper">

                <User size={17} />

                <input
                  id="signup-name"
                  type="text"
                  name="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                />

              </div>

            </div>


            {/* Email */}

            <div className="signup-form-field">

              <label htmlFor="signup-email">
                Email address
              </label>

              <div className="signup-input-wrapper">

                <Mail size={17} />

                <input
                  id="signup-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />

              </div>

            </div>


            {/* Password */}

            <div className="signup-form-field">

              <label htmlFor="signup-password">
                Password
              </label>

              <div className="signup-input-wrapper">

                <LockKeyhole size={17} />

                <input
                  id="signup-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />

                <button
                  type="button"
                  className="signup-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (prev) => !prev
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >

                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}

                </button>

              </div>

            </div>


            {/* Confirm Password */}

            <div className="signup-form-field">

              <label htmlFor="signup-confirm-password">
                Confirm password
              </label>

              <div className="signup-input-wrapper">

                <LockKeyhole size={17} />

                <input
                  id="signup-confirm-password"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  name="confirmPassword"
                  placeholder="Repeat your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />

                <button
                  type="button"
                  className="signup-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (prev) => !prev
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >

                  {showConfirmPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}

                </button>

              </div>

            </div>


            {/* Terms */}

            <label className="signup-terms-row">

              <input
                type="checkbox"
                name="terms"
                checked={formData.terms}
                onChange={handleChange}
                required
              />

              <span className="signup-custom-checkbox">

                <Check size={12} />

              </span>

              <span>
                I agree to the{" "}
                <a
                  href="/terms"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  Terms & Conditions
                </a>{" "}
                and acknowledge the{" "}
                <a
                  href="/privacy"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  Privacy Policy
                </a>
                .
              </span>

            </label>


            {/* Submit */}

            <button
              type="submit"
              className="signup-submit"
            >

              <span>
                Create account
              </span>

              <ArrowRight size={17} />

            </button>


            {/* Divider */}

            <div className="signup-divider">

              <span />

              <p>
                OR
              </p>

              <span />

            </div>


            {/* Google */}

            <button
              type="button"
              className="signup-google-button"
            >

              <span className="signup-google-icon">
                G
              </span>

              <span>
                Continue with Google
              </span>

            </button>

          </form>


          {/* ========================================
              LOGIN LINK
          ======================================== */}

          <div className="signup-login">

            <span>
              Already have an account?
            </span>

            <a href="/login">

              Sign in

              <ArrowRight size={14} />

            </a>

          </div>


          {/* ========================================
              DEVELOPER NOTE
          ======================================== */}

          <div className="signup-developer-note">

            <ShieldCheck size={14} />

            <span>
              Lawlite is a personal project by Chaitanya N.
            </span>

          </div>

        </div>

      </section>

    </div>
  );
};

export default Signup;