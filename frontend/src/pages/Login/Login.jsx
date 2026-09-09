import { useEffect, useState } from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { auth } from "../../config/firebase";

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

import "./Login.css";


/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const GOOGLE_LOGIN_CHECK_KEY =
  "lawlite-google-login-check";


/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

const Login = () => {
  const navigate =
    useNavigate();

  const location =
    useLocation();


  // ========================================
  // UI STATE
  // ========================================

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    googleLoading,
    setGoogleLoading,
  ] = useState(false);


  const [
    resetLoading,
    setResetLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  const [
    rememberMe,
    setRememberMe,
  ] = useState(true);


  // ========================================
  // FORM DATA
  // ========================================

  const [
    formData,
    setFormData,
  ] = useState({
    email:
      location.state?.email || "",
    password: "",
  });


  // ========================================
  // ROUTE MESSAGES
  // ========================================

  useEffect(() => {

    /*
     * Account created successfully
     * through the normal signup flow.
     */

    if (
      location.state?.signupSuccess
    ) {
      setSuccess(
        "Your account has been created successfully. You can sign in now."
      );
    }


    /*
     * New Google account attempted
     * to use Login instead of Signup.
     */

    if (
      location.state?.googleSignupRequired
    ) {
      setError(
        location.state?.googleSignupMessage ||
          "Please sign up first before using Google to sign in."
      );
    }


    /*
     * Clear navigation state after reading it.
     */

    if (
      location.state?.signupSuccess ||
      location.state?.googleSignupRequired
    ) {
      window.history.replaceState(
        {},
        document.title
      );
    }

  }, [location.state]);


  // ========================================
  // INPUT HANDLING
  // ========================================

  const handleChange = (
    event
  ) => {

    const {
      name,
      value,
    } = event.target;


    setFormData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );


    setError("");
    setSuccess("");
  };


  // ========================================
  // FIREBASE ERROR MESSAGES
  // ========================================

  const getFirebaseErrorMessage = (
    firebaseError
  ) => {

    switch (
      firebaseError.code
    ) {

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
        return "Firebase configuration is invalid. Please check your Firebase configuration.";


      default:
        return (
          firebaseError.message ||
          "Something went wrong. Please try again."
        );
    }
  };


  // ========================================
  // EMAIL LOGIN
  // ========================================

  const handleSubmit = async (
    event
  ) => {

    event.preventDefault();


    setError("");
    setSuccess("");


    const email =
      formData.email.trim();


    // --------------------------------------
    // VALIDATION
    // --------------------------------------

    if (!email) {

      setError(
        "Please enter your email address."
      );

      return;
    }


    if (!formData.password) {

      setError(
        "Please enter your password."
      );

      return;
    }


    try {

      setLoading(true);


      // ------------------------------------
      // PERSISTENCE
      // ------------------------------------

      await setPersistence(
        auth,
        rememberMe
          ? browserLocalPersistence
          : browserSessionPersistence
      );


      // ------------------------------------
      // EMAIL SIGN IN
      // ------------------------------------

      const result =
        await signInWithEmailAndPassword(
          auth,
          email,
          formData.password
        );


      console.log(
        "Email sign-in successful:",
        {
          uid:
            result.user.uid,

          name:
            result.user.displayName,

          email:
            result.user.email,

          emailVerified:
            result.user.emailVerified,
        }
      );


      setSuccess(
        "Signed in successfully. Welcome back to Lawlite!"
      );


      // ------------------------------------
      // CHAT
      // ------------------------------------

      setTimeout(() => {

        navigate(
          "/chat",
          {
            replace: true,
          }
        );

      }, 500);

    } catch (
      firebaseError
    ) {

      console.error(
        "Email sign-in error:",
        firebaseError
      );


      setError(
        getFirebaseErrorMessage(
          firebaseError
        )
      );

    } finally {

      setLoading(false);

    }
  };


  // ========================================
  // GOOGLE LOGIN
  // ========================================

  const handleGoogleLogin =
    async () => {

      setError("");
      setSuccess("");


      /*
       * IMPORTANT:
       *
       * Set this BEFORE signInWithPopup().
       *
       * Firebase may update auth.currentUser
       * before this function receives the popup
       * result. App.jsx reads this flag and prevents
       * LoginRoute from immediately redirecting
       * to Chat.
       */

      sessionStorage.setItem(
        GOOGLE_LOGIN_CHECK_KEY,
        "true"
      );


      try {

        setGoogleLoading(true);


        // ------------------------------------
        // PERSISTENCE
        // ------------------------------------

        await setPersistence(
          auth,
          rememberMe
            ? browserLocalPersistence
            : browserSessionPersistence
        );


        // ------------------------------------
        // GOOGLE PROVIDER
        // ------------------------------------

        const provider =
          new GoogleAuthProvider();


        provider.setCustomParameters({
          prompt:
            "select_account",
        });


        // ------------------------------------
        // GOOGLE POPUP
        // ------------------------------------

        const result =
          await signInWithPopup(
            auth,
            provider
          );


        const user =
          result.user;


        // ------------------------------------
        // CHECK NEW USER
        // ------------------------------------

        const additionalUserInfo =
          getAdditionalUserInfo(
            result
          );


        const isNewUser =
          Boolean(
            additionalUserInfo?.isNewUser
          );


        console.log(
          "Google sign-in result:",
          {
            uid:
              user.uid,

            email:
              user.email,

            name:
              user.displayName,

            isNewUser,
          }
        );


        // ------------------------------------
        // NEW GOOGLE ACCOUNT
        // ------------------------------------
        //
        // Login must NOT create an account.
        //
        // Firebase created this account as a
        // side effect of Google authentication.
        //
        // Remove it and keep the user on Login.
        // ------------------------------------

        if (isNewUser) {

          console.log(
            "New Google account detected during Login."
          );


          // ----------------------------------
          // DELETE TEMPORARY ACCOUNT
          // ----------------------------------

          try {

            await user.delete();

            console.log(
              "Temporary Google account deleted."
            );

          } catch (
            deleteError
          ) {

            console.error(
              "Unable to delete temporary Google account:",
              deleteError
            );

          }


          // ----------------------------------
          // SIGN OUT
          // ----------------------------------

          try {

            await signOut(
              auth
            );

          } catch (
            signOutError
          ) {

            console.error(
              "Unable to sign out temporary Google account:",
              signOutError
            );

          }


          // ----------------------------------
          // STOP ROUTE GUARD FROM HOLDING
          // LOGIN
          // ----------------------------------

          sessionStorage.removeItem(
            GOOGLE_LOGIN_CHECK_KEY
          );


          // ----------------------------------
          // SHOW THE ACTUAL MESSAGE
          // ----------------------------------

          setError(
            "We couldn't find a Lawlite account for this Google account. Please sign up first."
          );


          setSuccess("");


          /*
           * IMPORTANT:
           *
           * DO NOT navigate to /signup here.
           *
           * The Login page remains visible and
           * the user can click "Create one".
           */

          return;
        }


        // ------------------------------------
        // EXISTING GOOGLE USER
        // ------------------------------------

        console.log(
          "Existing Google Lawlite user detected."
        );


        // Clear the guard BEFORE going to Chat.

        sessionStorage.removeItem(
          GOOGLE_LOGIN_CHECK_KEY
        );


        setSuccess(
          `Welcome back${
            user.displayName
              ? `, ${user.displayName}`
              : ""
          }!`
        );


        // ------------------------------------
        // CHAT
        // ------------------------------------

        setTimeout(() => {

          navigate(
            "/chat",
            {
              replace: true,
            }
          );

        }, 500);

      } catch (
        firebaseError
      ) {

        console.error(
          "Google sign-in error:",
          firebaseError
        );


        /*
         * Always remove the flag when Google
         * authentication fails.
         */

        sessionStorage.removeItem(
          GOOGLE_LOGIN_CHECK_KEY
        );


        setError(
          getFirebaseErrorMessage(
            firebaseError
          )
        );

      } finally {

        setGoogleLoading(false);

      }
    };


  // ========================================
  // FORGOT PASSWORD
  // ========================================

  const handleForgotPassword =
    async () => {

      setError("");
      setSuccess("");


      const email =
        formData.email.trim();


      if (!email) {

        setError(
          "Enter your email address first, then click Forgot password."
        );

        return;
      }


      try {

        setResetLoading(
          true
        );


        await sendPasswordResetEmail(
          auth,
          email
        );


        setSuccess(
          "Password reset instructions have been sent to your email."
        );

      } catch (
        firebaseError
      ) {

        console.error(
          "Password reset error:",
          firebaseError
        );


        setError(
          getFirebaseErrorMessage(
            firebaseError
          )
        );

      } finally {

        setResetLoading(
          false
        );

      }
    };


  // ========================================
  // RENDER
  // ========================================

  return (
    <main className="login-page">

      {/* ========================================
          LEFT VISUAL
      ======================================== */}

      <section className="login-visual">

        <div className="login-grid" />

        <div className="login-glow login-glow-one" />

        <div className="login-glow login-glow-two" />


        <div
          className="login-particles"
          aria-hidden="true"
        >
          <span />
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

            <Scale
              size={21}
              strokeWidth={2.1}
            />

          </div>


          <span>
            LAWLITE
          </span>

        </div>


        {/* VISUAL CONTENT */}

        <div className="login-visual-content">


          {/* EYEBROW */}

          <div className="visual-eyebrow">

            <Sparkles
              size={14}
            />

            <span>
              LEGAL CLARITY, SIMPLIFIED
            </span>

          </div>


          {/* ANIMATED HEADING */}

          <div className="login-animated-heading">

            <span className="heading-static">
              Welcome back.
            </span>


            <div className="heading-rotator">

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

            </div>

          </div>


          {/* DESCRIPTION */}

          <p>
            Your legal documents can be complicated.
            Understanding them doesn&apos;t have to be.
          </p>


          {/* TRANSFORMATION */}

          <div className="login-transform">


            {/* DOCUMENT */}

            <div className="login-document">

              <div className="document-header">

                <FileText
                  size={14}
                />

                <span>
                  LEGAL DOCUMENT
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
                §
              </div>

            </div>


            {/* TRANSFORM ARROW */}

            <div className="transform-arrow">

              <div className="arrow-line" />

              <Sparkles
                size={16}
              />

              <div className="arrow-line" />

            </div>


            {/* EXPLANATION */}

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
                Simple.
              </h3>


              <p>
                Complex legal language,
                explained in everyday words.
              </p>


              <div className="explanation-status">

                <ShieldCheck
                  size={13}
                />

                <span>
                  Made easier to understand
                </span>

              </div>

            </div>

          </div>


          {/* PROCESS */}

          <div className="login-process">


            <div className="login-process-item">

              <span className="login-process-number">
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


            <div className="login-process-line" />


            <div className="login-process-item">

              <span className="login-process-number">
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


            <div className="login-process-line" />


            <div className="login-process-item">

              <span className="login-process-number">
                03
              </span>

              <div>

                <strong>
                  Clarify
                </strong>

                <small>
                  What&apos;s confusing
                </small>

              </div>

            </div>

          </div>

        </div>


        {/* FOOTER */}

        <div className="login-visual-footer">

          <ShieldCheck
            size={15}
          />

          <span>
            AI assistance · Privacy-conscious · Built for understanding
          </span>

        </div>

      </section>


      {/* ========================================
          RIGHT FORM
      ======================================== */}

      <section className="login-form-panel">

        <div className="login-form-wrapper">


          {/* MOBILE BRAND */}

          <div className="login-mobile-brand">

            <div className="login-brand-mark">

              <Scale
                size={19}
                strokeWidth={2.1}
              />

            </div>

            <span>
              LAWLITE
            </span>

          </div>


          {/* FORM HEADING */}

          <div className="login-heading">

            <span className="login-form-label">
              WELCOME BACK
            </span>


            <h2>

              Sign in to

              <span>
                {" "}Lawlite.
              </span>

            </h2>


            <p>
              Continue where you left off.
            </p>

          </div>


          {/* ERROR */}

          {error && (

            <div
              className="login-message login-error"
              role="alert"
            >
              {error}
            </div>

          )}


          {/* SUCCESS */}

          {success && (

            <div
              className="login-message login-success"
              role="status"
            >
              {success}
            </div>

          )}


          {/* LOGIN FORM */}

          <form
            className="login-form"
            onSubmit={
              handleSubmit
            }
          >


            {/* EMAIL */}

            <div className="form-field">

              <label
                htmlFor="login-email"
              >
                Email address
              </label>


              <div className="input-wrapper">

                <Mail
                  size={17}
                />


                <input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={
                    formData.email
                  }
                  onChange={
                    handleChange
                  }
                  autoComplete="email"
                  required
                />

              </div>

            </div>


            {/* PASSWORD */}

            <div className="form-field">

              <div className="password-label-row">

                <label
                  htmlFor="login-password"
                >
                  Password
                </label>


                <button
                  type="button"
                  className="forgot-password"
                  onClick={
                    handleForgotPassword
                  }
                  disabled={
                    resetLoading
                  }
                >

                  {resetLoading
                    ? "Sending..."
                    : "Forgot password?"}

                </button>

              </div>


              <div className="input-wrapper">

                <LockKeyhole
                  size={17}
                />


                <input
                  id="login-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  placeholder="Enter your password"
                  value={
                    formData.password
                  }
                  onChange={
                    handleChange
                  }
                  autoComplete="current-password"
                  required
                />


                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (previous) =>
                        !previous
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >

                  {showPassword ? (
                    <EyeOff
                      size={17}
                    />
                  ) : (
                    <Eye
                      size={17}
                    />
                  )}

                </button>

              </div>

            </div>


            {/* REMEMBER ME */}

            <label className="remember-row">

              <input
                type="checkbox"
                checked={
                  rememberMe
                }
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


            {/* SUBMIT */}

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

                <ArrowRight
                  size={18}
                />

              )}

            </button>

          </form>


          {/* DIVIDER */}

          <div className="login-divider">

            <span />

            <p>
              OR
            </p>

            <span />

          </div>


          {/* GOOGLE */}

          <button
            type="button"
            className="google-button"
            onClick={
              handleGoogleLogin
            }
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
                ? "Checking Google account..."
                : "Continue with Google"}

            </span>

          </button>


          {/* SIGNUP */}

          <div className="login-signup">

            <span>
              Don&apos;t have an account?
            </span>


            <Link to="/signup">
              Create one
            </Link>

          </div>


          {/* DEVELOPER NOTE */}

          <div className="login-developer-note">

            <ShieldCheck
              size={14}
            />


            <div>

              <span>
                LAW LITE
              </span>


              <p>
                A personal project by Chaitanya N.
                AI assistance is informational and
                not a substitute for professional
                legal advice.
              </p>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
};


export default Login;