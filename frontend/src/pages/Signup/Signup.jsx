import { useState } from "react";
import { useNavigate } from "react-router-dom";

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

import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../config/firebase";

import "./Signup.css";

const API_URL = "http://localhost:5000/api";

const Signup = () => {
  const navigate = useNavigate();

  // ========================================
  // UI STATE
  // ========================================

  const [step, setStep] = useState("signup");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // ========================================
  // FORM DATA
  // ========================================

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  const [otp, setOtp] = useState("");

  // ========================================
  // INPUT HANDLING
  // ========================================

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    setError("");
    setSuccess("");
  };

  // ========================================
  // OTP INPUT
  // ========================================

  const handleOtpChange = (event) => {
    const value = event.target.value
      .replace(/\D/g, "")
      .slice(0, 6);

    setOtp(value);

    setError("");
    setSuccess("");
  };

  // ========================================
  // SEND OTP
  // ========================================

  const sendOtp = async () => {
    const response = await fetch(
      `${API_URL}/auth/send-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Unable to send verification code."
      );
    }

    return data;
  };

  // ========================================
  // NORMAL SIGNUP
  // ========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    // Name validation
    if (!formData.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    // Email validation
    if (!formData.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    // Password validation
    if (formData.password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    // Confirm password validation
    if (
      formData.password !==
      formData.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    // Terms validation
    if (!formData.terms) {
      setError(
        "Please accept the Terms & Conditions to continue."
      );
      return;
    }

    try {
      setLoading(true);

      await sendOtp();

      setOtp("");

      setStep("otp");

      setSuccess(
        "We've sent a 6-digit verification code to your email."
      );
    } catch (err) {
      console.error(
        "Send OTP error:",
        err
      );

      setError(
        err.message ||
          "Unable to send the verification code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // VERIFY OTP
  // ========================================

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (otp.length !== 6) {
      setError(
        "Please enter the 6-digit verification code."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/auth/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email.trim(),
            otp,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to verify the code."
        );
      }

      setSuccess(
        "Email verified successfully. Your account has been created."
      );

      /*
       * The backend has now created the Firebase
       * account with emailVerified: true.
       *
       * For now, send the user to Login.
       *
       * Later we'll add the proper Firebase
       * session/token flow here.
       */

      setTimeout(() => {
        navigate("/login", {
          state: {
            email: formData.email.trim(),
            signupSuccess: true,
          },
        });
      }, 1000);
    } catch (err) {
      console.error(
        "OTP verification error:",
        err
      );

      setError(
        err.message ||
          "Unable to verify the code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // RESEND OTP
  // ========================================

  const handleResendOtp = async () => {
    setError("");
    setSuccess("");

    try {
      setLoading(true);

      await sendOtp();

      setOtp("");

      setSuccess(
        "A new verification code has been sent to your email."
      );
    } catch (err) {
      console.error(
        "Resend OTP error:",
        err
      );

      setError(
        err.message ||
          "Unable to resend the verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // GOOGLE SIGNUP
  // ========================================

  const handleGoogleSignup = async () => {
    setError("");
    setSuccess("");

    // User must accept terms before
    // starting Google authentication.
    if (!formData.terms) {
      setError(
        "Please accept the Terms & Conditions to continue."
      );

      return;
    }

    try {
      setGoogleLoading(true);

      const result = await signInWithPopup(
        auth,
        googleProvider
      );

      const user = result.user;

      console.log(
        "Google signup successful:",
        {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          emailVerified:
            user.emailVerified,
        }
      );

      setSuccess(
        `Welcome to Lawlite${
          user.displayName
            ? `, ${user.displayName}`
            : ""
        }!`
      );

      /*
       * Firebase has successfully authenticated
       * the Google account.
       *
       * For now we redirect to the homepage.
       *
       * Later we'll send the Firebase ID token
       * to the Lawlite backend so both Google
       * users and OTP users use the same backend
       * authentication/session system.
       */

      setTimeout(() => {
        navigate("/");
      }, 800);
    } catch (err) {
      console.error(
        "Google signup error:",
        err
      );

      if (
        err.code ===
        "auth/popup-closed-by-user"
      ) {
        setError(
          "Google sign-up was cancelled."
        );
      } else if (
        err.code ===
        "auth/popup-blocked"
      ) {
        setError(
          "Your browser blocked the Google sign-up popup."
        );
      } else if (
        err.code ===
        "auth/account-exists-with-different-credential"
      ) {
        setError(
          "An account already exists with this email using another sign-in method."
        );
      } else if (
        err.code ===
        "auth/network-request-failed"
      ) {
        setError(
          "Network error. Please check your internet connection."
        );
      } else {
        setError(
          err.message ||
            "Google sign-up failed. Please try again."
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

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

          {/* Eyebrow */}

          <div className="signup-eyebrow">

            <Sparkles size={14} />

            <span>
              AI-POWERED LEGAL UNDERSTANDING
            </span>

          </div>

          {/* ====================================
              ANIMATED HEADING
          ==================================== */}

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

          {/* Description */}

          <p>
            Create your Lawlite account and turn
            complicated legal language into something
            you can actually understand.
          </p>

          {/* ====================================
              TRANSFORMATION VISUAL
          ==================================== */}

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

          {/* ====================================
              PROCESS
          ==================================== */}

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

          {/* ====================================
              MOBILE BRAND
          ==================================== */}

          <div className="signup-mobile-brand">

            <div className="signup-brand-mark">
              L
            </div>

            <span>
              Lawlite
            </span>

          </div>


          {/* ====================================
              SIGNUP STEP
          ==================================== */}

          {step === "signup" && (
            <>
              {/* ==================================
                  HEADING
              ================================== */}

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


              {/* ==================================
                  FORM
              ================================== */}

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
                      value={
                        formData.confirmPassword
                      }
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


                {/* ==================================
                    TERMS
                ================================== */}

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
                      Terms &amp; Conditions
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


                {/* ==================================
                    ERROR / SUCCESS
                ================================== */}

                {error && (
                  <div
                    className="signup-message signup-error"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                {success && (
                  <div
                    className="signup-message signup-success"
                    role="status"
                  >
                    {success}
                  </div>
                )}


                {/* ==================================
                    CREATE ACCOUNT
                ================================== */}

                <button
                  type="submit"
                  className="signup-submit"
                  disabled={
                    loading ||
                    googleLoading
                  }
                >

                  <span>
                    {loading
                      ? "Sending code..."
                      : "Create account"}
                  </span>

                  {!loading && (
                    <ArrowRight size={17} />
                  )}

                </button>


                {/* ==================================
                    DIVIDER
                ================================== */}

                <div className="signup-divider">

                  <span />

                  <p>
                    OR
                  </p>

                  <span />

                </div>


                {/* ==================================
                    GOOGLE
                ================================== */}

                <button
                  type="button"
                  className="signup-google-button"
                  onClick={handleGoogleSignup}
                  disabled={
                    loading ||
                    googleLoading
                  }
                >

                  <span className="signup-google-icon">
                    G
                  </span>

                  <span>
                    {googleLoading
                      ? "Connecting to Google..."
                      : "Continue with Google"}
                  </span>

                </button>

              </form>


              {/* ==================================
                  LOGIN LINK
              ================================== */}

              <div className="signup-login">

                <span>
                  Already have an account?
                </span>

                <a href="/login">

                  Sign in

                  <ArrowRight size={14} />

                </a>

              </div>

            </>
          )}


          {/* ========================================
              OTP STEP
          ======================================== */}

          {step === "otp" && (
            <div className="signup-otp-screen">

              {/* OTP Icon */}

              <div className="signup-otp-icon">

                <ShieldCheck size={27} />

              </div>


              {/* OTP Heading */}

              <div className="signup-heading">

                <span className="signup-form-label">
                  VERIFY EMAIL
                </span>

                <h2>
                  Check your
                  <span> inbox.</span>
                </h2>

                <p>
                  We've sent a 6-digit verification
                  code to
                </p>

                <strong className="signup-otp-email">
                  {formData.email}
                </strong>

              </div>


              {/* OTP FORM */}

              <form
                className="signup-form signup-otp-form"
                onSubmit={handleVerifyOtp}
              >

                <div className="signup-form-field">

                  <label htmlFor="signup-otp">
                    Verification code
                  </label>

                  <input
                    id="signup-otp"
                    className="signup-otp-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={otp}
                    onChange={handleOtpChange}
                    maxLength={6}
                    autoFocus
                  />

                </div>


                {/* Messages */}

                {error && (
                  <div
                    className="signup-message signup-error"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                {success && (
                  <div
                    className="signup-message signup-success"
                    role="status"
                  >
                    {success}
                  </div>
                )}


                {/* Verify */}

                <button
                  type="submit"
                  className="signup-submit"
                  disabled={loading}
                >

                  <span>
                    {loading
                      ? "Verifying..."
                      : "Verify & continue"}
                  </span>

                  {!loading && (
                    <ArrowRight size={17} />
                  )}

                </button>

              </form>


              {/* OTP ACTIONS */}

              <div className="signup-otp-actions">

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                >
                  Resend code
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("signup");
                    setOtp("");
                    setError("");
                    setSuccess("");
                  }}
                >
                  Use a different email
                </button>

              </div>


              {/* Security Note */}

              <div className="signup-security-note">

                <ShieldCheck size={15} />

                <span>
                  Your verification code expires
                  in 5 minutes.
                </span>

              </div>

            </div>
          )}


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