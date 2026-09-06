import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  Mail,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

import { auth } from "../../config/firebase";

import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [rememberMe, setRememberMe] = useState(true);

  const [formData, setFormData] = useState({
    email: location.state?.email || "",
    password: "",
  });

  /* ========================================
     SHOW SIGNUP SUCCESS MESSAGE
  ======================================== */

  useEffect(() => {
    if (location.state?.signupSuccess) {
      setSuccess(
        "Your account has been created successfully. You can sign in now."
      );

      navigate("/login", {
        replace: true,
        state: {
          email: location.state?.email || "",
        },
      });
    }
  }, [location.state, navigate]);

  /* ========================================
     INPUT CHANGE
  ======================================== */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  /* ========================================
     FIREBASE ERROR HANDLER
  ======================================== */

  const getFirebaseErrorMessage = (firebaseError) => {
    switch (firebaseError.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Incorrect email or password.";

      case "auth/invalid-email":
        return "Please enter a valid email address.";

      case "auth/user-disabled":
        return "This account has been disabled.";

      case "auth/too-many-requests":
        return "Too many unsuccessful attempts. Please try again later.";

      case "auth/network-request-failed":
        return "Network error. Please check your internet connection.";

      case "auth/popup-closed-by-user":
        return "Google sign-in was cancelled.";

      case "auth/popup-blocked":
        return "Your browser blocked the Google sign-in popup.";

      case "auth/account-exists-with-different-credential":
        return "An account already exists with this email using another sign-in method.";

      case "auth/api-key-not-valid":
        return "Firebase configuration is invalid. Please check your Firebase web configuration.";

      case "auth/operation-not-allowed":
        return "This sign-in method is not enabled in Firebase.";

      default:
        return (
          firebaseError.message ||
          "Something went wrong. Please try again."
        );
    }
  };

  /* ========================================
     EMAIL / PASSWORD LOGIN
  ======================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const email = formData.email.trim();

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!formData.password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      await setPersistence(
        auth,
        rememberMe
          ? browserLocalPersistence
          : browserSessionPersistence
      );

      const result = await signInWithEmailAndPassword(
        auth,
        email,
        formData.password
      );

      console.log("Email sign-in successful:", {
        uid: result.user.uid,
        name: result.user.displayName,
        email: result.user.email,
        emailVerified: result.user.emailVerified,
      });

      setSuccess("Signed in successfully. Welcome back to Lawlite!");

      setTimeout(() => {
        navigate("/");
      }, 700);
    } catch (firebaseError) {
      console.error("Email sign-in error:", firebaseError);

      setError(getFirebaseErrorMessage(firebaseError));
    } finally {
      setLoading(false);
    }
  };

  /* ========================================
     GOOGLE LOGIN
  ======================================== */

  const handleGoogleLogin = async () => {
    setError("");
    setSuccess("");

    try {
      setGoogleLoading(true);

      const provider = new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account",
      });

      await setPersistence(
        auth,
        rememberMe
          ? browserLocalPersistence
          : browserSessionPersistence
      );

      const result = await signInWithPopup(auth, provider);

      console.log("Google sign-in successful:", {
        uid: result.user.uid,
        name: result.user.displayName,
        email: result.user.email,
        emailVerified: result.user.emailVerified,
      });

      setSuccess(
        `Welcome back${
          result.user.displayName
            ? `, ${result.user.displayName}`
            : ""
        }!`
      );

      setTimeout(() => {
        navigate("/");
      }, 700);
    } catch (firebaseError) {
      console.error("Google sign-in error:", firebaseError);

      setError(getFirebaseErrorMessage(firebaseError));
    } finally {
      setGoogleLoading(false);
    }
  };

  /* ========================================
     FORGOT PASSWORD
  ======================================== */

  const handleForgotPassword = async () => {
    setError("");
    setSuccess("");

    const email = formData.email.trim();

    if (!email) {
      setError(
        "Enter your email address first, then click Forgot password."
      );
      return;
    }

    try {
      setResetLoading(true);

      await sendPasswordResetEmail(auth, email);

      setSuccess(
        "Password reset instructions have been sent to your email."
      );
    } catch (firebaseError) {
      console.error("Password reset error:", firebaseError);

      setError(getFirebaseErrorMessage(firebaseError));
    } finally {
      setResetLoading(false);
    }
  };

  /* ========================================
     RENDER
  ======================================== */

  return (
    <main className="login-page">

      {/* ========================================
          LEFT VISUAL PANEL
      ======================================== */}

      <section className="login-visual">

        <div className="login-grid" />

        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />

        <div className="login-particles" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        {/* BRAND */}

        <div className="login-brand">
          <div className="login-brand-mark">
            <Scale size={21} strokeWidth={2.1} />
          </div>

          <span>LAWLITE</span>
        </div>

        {/* VISUAL CONTENT */}

        <div className="login-visual-content">

          <div className="visual-eyebrow">
            <Sparkles size={14} />
            <span>LEGAL CLARITY, SIMPLIFIED</span>
          </div>

          {/* ANIMATED HEADING */}

          <h1 className="login-animated-heading">

            <span className="heading-static">
              Welcome back.
            </span>

            <span className="heading-rotator">

              <span className="heading-phrase">
                Let&apos;s make sense of the law.
              </span>

              <span className="heading-phrase">
                Let&apos;s decode the legal jargon.
              </span>

              <span className="heading-phrase">
                Let&apos;s simplify the fine print.
              </span>

              <span className="heading-phrase">
                Let&apos;s understand what it means.
              </span>

            </span>

          </h1>

          <p>
            Your legal documents can be complicated.
            Understanding them doesn&apos;t have to be.
          </p>

          {/* DOCUMENT → LAWLITE */}

          <div className="login-transform">

            {/* DOCUMENT */}

            <div className="login-document">

              <div className="document-header">
                <FileText size={15} />
                <span>LEGAL DOCUMENT</span>
              </div>

              <div className="document-lines">
                <span />
                <span />
                <span className="short" />
                <span />
                <span className="medium" />
                <span className="short" />
              </div>

              <div className="document-stamp">
                COMPLEX
              </div>

            </div>

            {/* ARROW */}

            <div className="transform-arrow">

              <div className="arrow-line" />

              <ArrowRight size={18} />

            </div>

            {/* EXPLANATION */}

            <div className="login-explanation">

              <div className="explanation-top">

                <div className="explanation-logo">
                  <Scale size={13} />
                </div>

                <span>LAW LITE AI</span>

              </div>

              <h3>
                Here&apos;s what it means.
              </h3>

              <p>
                Key information explained in
                simple, everyday language.
              </p>

              <div className="explanation-status">
                <Check size={12} />
                <span>UNDERSTOOD</span>
              </div>

            </div>

          </div>

        </div>

        {/* VISUAL FOOTER */}

        <div className="login-visual-footer">
          <ShieldCheck size={15} />

          <span>
            AI assistance · Privacy-conscious ·
            Built for understanding
          </span>
        </div>

      </section>

      {/* ========================================
          RIGHT LOGIN PANEL
      ======================================== */}

      <section className="login-form-panel">

        <div className="login-form-wrapper">

          {/* MOBILE BRAND */}

          <div className="login-mobile-brand">

            <div className="login-brand-mark">
              <Scale size={19} />
            </div>

            <span>LAWLITE</span>

          </div>

          {/* HEADING */}

          <div className="login-heading">

            <span className="login-form-label">
              WELCOME BACK
            </span>

            <h2>
              Sign in to <span>Lawlite.</span>
            </h2>

            <p>
              Continue where you left off and
              make sense of the law.
            </p>

          </div>

          {/* ERROR */}

          {error && (
            <div className="login-message login-error">
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="login-message login-success">
              {success}
            </div>
          )}

          {/* LOGIN FORM */}

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >

            {/* EMAIL */}

            <div className="form-field">

              <label htmlFor="login-email">
                Email address
              </label>

              <div className="input-wrapper">

                <Mail size={17} />

                <input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />

              </div>

            </div>

            {/* PASSWORD */}

            <div className="form-field">

              <div className="password-label-row">

                <label htmlFor="login-password">
                  Password
                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                >
                  {resetLoading
                    ? "Sending..."
                    : "Forgot password?"}
                </button>

              </div>

              <div className="input-wrapper">

                <LockKeyhole size={17} />

                <input
                  id="login-password"
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
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous
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

            {/* REMEMBER ME */}

            <label className="remember-row">

              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) =>
                  setRememberMe(
                    event.target.checked
                  )
                }
              />

              <span className="custom-checkbox">
                <span />
              </span>

              <span>
                Remember me
              </span>

            </label>

            {/* SIGN IN */}

            <button
              type="submit"
              className="login-submit"
              disabled={
                loading ||
                googleLoading
              }
            >

              <span>
                {loading
                  ? "Signing in..."
                  : "Sign in"}
              </span>

              {!loading && (
                <ArrowRight size={18} />
              )}

            </button>

          </form>

          {/* DIVIDER */}

          <div className="login-divider">

            <span />

            <p>OR</p>

            <span />

          </div>

          {/* GOOGLE */}

          <button
            type="button"
            className="google-button"
            onClick={handleGoogleLogin}
            disabled={
              loading ||
              googleLoading
            }
          >

            <span className="google-icon">
              G
            </span>

            <span>
              {googleLoading
                ? "Connecting to Google..."
                : "Continue with Google"}
            </span>

          </button>

          {/* SIGNUP */}

          <p className="login-signup">

            <span>
              Don&apos;t have an account?
            </span>

            <a
              href="/signup"
              onClick={(event) => {
                event.preventDefault();
                navigate("/signup");
              }}
            >
              Create one
              <ArrowRight size={13} />
            </a>

          </p>

          {/* LEGAL */}

          <p className="login-legal">
            By continuing, you agree to Lawlite&apos;s{" "}
            <a
              href="/terms"
              onClick={(event) => {
                event.preventDefault();
                navigate("/terms");
              }}
            >
              Terms &amp; Conditions
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              onClick={(event) => {
                event.preventDefault();
                navigate("/privacy");
              }}
            >
              Privacy Policy
            </a>
            .
          </p>

          {/* DEVELOPER NOTE */}

          <div className="login-developer-note">

            <ShieldCheck size={13} />

            <span>
              A personal project by Chaitanya N.
            </span>

          </div>

        </div>

      </section>

    </main>
  );
};

export default Login;