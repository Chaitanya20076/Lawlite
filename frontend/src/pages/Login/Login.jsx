import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Scale,
  FileText,
} from "lucide-react";

import "./Login.css";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // Authentication will be connected later.
    console.log("Login submitted:", formData);
  };

  return (
    <div className="login-page">

      {/* ========================================
          LEFT VISUAL PANEL
      ======================================== */}

      <section className="login-visual">

        {/* Background */}

        <div className="login-grid" />

        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />


        {/* Floating particles */}

        <div className="login-particles">

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

        <div className="login-brand">

          <div className="login-brand-mark">
            L
          </div>

          <span>
            Lawlite
          </span>

        </div>


        {/* Main Visual */}

        <div className="login-visual-content">

          <div className="visual-eyebrow">

            <Sparkles size={14} />

            <span>
              AI-POWERED LEGAL UNDERSTANDING
            </span>

          </div>


          {/* ========================================
              ANIMATED HEADING
          ======================================== */}

          <h1 className="login-animated-heading">

            <span className="heading-static">
              Welcome back.
            </span>

            <span className="heading-rotator">

              <span className="heading-phrase">
                Let's make sense of the law.
              </span>

              <span className="heading-phrase">
                Let's decode the legal jargon.
              </span>

              <span className="heading-phrase">
                Let's simplify the fine print.
              </span>

              <span className="heading-phrase">
                Let's understand what it means.
              </span>

            </span>

          </h1>


          <p>
            Your legal documents, explanations and
            understanding — all in one place.
          </p>


          {/* ========================================
              LEGAL TRANSFORMATION VISUAL
          ======================================== */}

          <div className="login-transform">

            {/* Document */}

            <div className="login-document">

              <div className="document-header">

                <FileText size={14} />

                <span>
                  LEGAL NOTICE
                </span>

              </div>


              <div className="document-lines">

                <span />
                <span />
                <span className="short" />
                <span />
                <span />
                <span className="medium" />
                <span />

              </div>


              <div className="document-stamp">
                PURSUANT TO
              </div>

            </div>


            {/* Transformation Arrow */}

            <div className="transform-arrow">

              <div className="arrow-line" />

              <Sparkles size={16} />

              <div className="arrow-line" />

            </div>


            {/* Explanation */}

            <div className="login-explanation">

              <div className="explanation-top">

                <div className="explanation-logo">
                  L
                </div>

                <span>
                  LAW LITE
                </span>

              </div>


              <h3>
                In simple terms
              </h3>


              <p>
                This section explains what
                the notice actually means
                for you.
              </p>


              <div className="explanation-status">

                <ShieldCheck size={13} />

                <span>
                  Plain-language explanation
                </span>

              </div>

            </div>

          </div>

        </div>


        {/* ========================================
            BOTTOM QUOTE
        ======================================== */}

        <div className="login-visual-footer">

          <Scale size={15} />

          <span>
            Understand first. Then decide what comes next.
          </span>

        </div>

      </section>


      {/* ========================================
          RIGHT LOGIN PANEL
      ======================================== */}

      <section className="login-form-panel">

        <div className="login-form-wrapper">

          {/* ========================================
              MOBILE BRAND
          ======================================== */}

          <div className="login-mobile-brand">

            <div className="login-brand-mark">
              L
            </div>

            <span>
              Lawlite
            </span>

          </div>


          {/* ========================================
              HEADING
          ======================================== */}

          <div className="login-heading">

            <span className="login-form-label">
              WELCOME BACK
            </span>

            <h2>
              Sign in to
              <span> Lawlite.</span>
            </h2>

            <p>
              Continue where you left off.
            </p>

          </div>


          {/* ========================================
              LOGIN FORM
          ======================================== */}

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >

            {/* Email */}

            <div className="form-field">

              <label htmlFor="email">
                Email address
              </label>

              <div className="input-wrapper">

                <Mail size={17} />

                <input
                  id="email"
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

            <div className="form-field">

              <div className="password-label-row">

                <label htmlFor="password">
                  Password
                </label>

                <button
                  type="button"
                  className="forgot-password"
                >
                  Forgot password?
                </button>

              </div>


              <div className="input-wrapper">

                <LockKeyhole size={17} />

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />


                <button
                  type="button"
                  className="password-toggle"
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


            {/* Remember Me */}

            <label className="remember-row">

              <input
                type="checkbox"
                name="remember"
                checked={formData.remember}
                onChange={handleChange}
              />

              <span className="custom-checkbox">
                <span />
              </span>

              <span>
                Remember me
              </span>

            </label>


            {/* Submit */}

            <button
              type="submit"
              className="login-submit"
            >

              <span>
                Sign in
              </span>

              <ArrowRight size={17} />

            </button>


            {/* Divider */}

            <div className="login-divider">

              <span />

              <p>
                OR
              </p>

              <span />

            </div>


            {/* Google */}

            <button
              type="button"
              className="google-button"
            >

              <span className="google-icon">
                G
              </span>

              <span>
                Continue with Google
              </span>

            </button>

          </form>


          {/* ========================================
              SIGNUP
          ======================================== */}

          <div className="login-signup">

            <span>
              Don't have an account?
            </span>

            <a href="/signup">

              Create one

              <ArrowRight size={14} />

            </a>

          </div>


          {/* ========================================
              LEGAL
          ======================================== */}

          <p className="login-legal">

            By continuing, you agree to Lawlite's{" "}

            <a href="/terms">
              Terms & Conditions
            </a>{" "}

            and acknowledge our{" "}

            <a href="/privacy">
              Privacy Policy
            </a>
            .

          </p>


          {/* ========================================
              DEVELOPER NOTE
          ======================================== */}

          <div className="login-developer-note">

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

export default Login;