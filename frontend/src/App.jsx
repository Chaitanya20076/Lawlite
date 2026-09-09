import {
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
} from "firebase/auth";

import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";

import Contact from "./pages/Contact/Contact";
import Home from "./pages/Home/Home";
import Terms from "./pages/Terms/Terms";
import Privacy from "./pages/Privacy/Privacy";
import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";
import Onboarding from "./pages/Onboarding/Onboarding";
import Loading from "./pages/Loading/Loading";
import Chat from "./pages/Chat/Chat";

import { auth } from "./config/firebase";


/*
|--------------------------------------------------------------------------
| AUTH LOADING
|--------------------------------------------------------------------------
*/

const AuthLoading = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "var(--bg-color)",
        color:
          "var(--text-primary)",
      }}
    >
      <div
        style={{
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            margin: "0 auto 14px",
            borderRadius: "50%",
            border:
              "2px solid rgba(201, 162, 39, 0.2)",
            borderTopColor:
              "var(--gold)",
            animation:
              "lawliteAuthSpin 0.8s linear infinite",
          }}
        />

        <p
          style={{
            margin: 0,
            fontSize: 12,
            opacity: 0.65,
          }}
        >
          Preparing Lawlite...
        </p>
      </div>

      <style>
        {`
          @keyframes lawliteAuthSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
};


/*
|--------------------------------------------------------------------------
| PROTECTED ROUTE
|--------------------------------------------------------------------------
|
| Used for:
| - /onboarding
| - /chat
|
| If Firebase says there is no authenticated user,
| send the visitor to /login.
|
*/

const ProtectedRoute = ({
  user,
  loading,
  children,
}) => {
  if (loading) {
    return <AuthLoading />;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
};


/*
|--------------------------------------------------------------------------
| LOGIN ROUTE
|--------------------------------------------------------------------------
|
| Logged-out user:
|   /login
|
| Already logged-in user:
|   /chat
|
*/

const LoginRoute = ({
  user,
  loading,
}) => {
  if (loading) {
    return <AuthLoading />;
  }

  if (user) {
    return (
      <Navigate
        to="/chat"
        replace
      />
    );
  }

  return <Login />;
};


/*
|--------------------------------------------------------------------------
| SIGNUP ROUTE
|--------------------------------------------------------------------------
|
| If already authenticated, don't let the user start
| another signup flow.
|
*/

const SignupRoute = ({
  user,
  loading,
}) => {
  if (loading) {
    return <AuthLoading />;
  }

  if (user) {
    return (
      <Navigate
        to="/chat"
        replace
      />
    );
  }

  return <Signup />;
};


/*
|--------------------------------------------------------------------------
| APP
|--------------------------------------------------------------------------
*/

const App = () => {
  const location =
    useLocation();

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  const [
    user,
    setUser,
  ] = useState(null);


  /*
  |--------------------------------------------------------------------------
  | FIREBASE AUTH STATE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          console.log(
            "Lawlite auth state:",
            currentUser
              ? {
                  uid:
                    currentUser.uid,
                  email:
                    currentUser.email,
                }
              : "Logged out"
          );

          setUser(
            currentUser
          );

          setAuthLoading(
            false
          );
        }
      );

    return () =>
      unsubscribe();
  }, []);


  /*
  |--------------------------------------------------------------------------
  | FULL SCREEN APP PAGES
  |--------------------------------------------------------------------------
  */

  const isAppPage =
    location.pathname ===
      "/loading" ||
    location.pathname ===
      "/chat" ||
    location.pathname ===
      "/onboarding";


  return (
    <>
      {!isAppPage && (
        <Navbar />
      )}

      <main>
        <Routes>

          {/* =====================================================
              PUBLIC PAGES
          ===================================================== */}

          <Route
            path="/"
            element={
              <Home />
            }
          />

          <Route
            path="/terms"
            element={
              <Terms />
            }
          />

          <Route
            path="/privacy"
            element={
              <Privacy />
            }
          />

          <Route
            path="/contact"
            element={
              <Contact />
            }
          />


          {/* =====================================================
              AUTH PAGES
          ===================================================== */}

          <Route
            path="/login"
            element={
              <LoginRoute
                user={user}
                loading={authLoading}
              />
            }
          />

          <Route
            path="/signup"
            element={
              <SignupRoute
                user={user}
                loading={authLoading}
              />
            }
          />


          {/* =====================================================
              ONBOARDING
          ===================================================== */}

          <Route
            path="/onboarding"
            element={
              <ProtectedRoute
                user={user}
                loading={authLoading}
              >
                <Onboarding />
              </ProtectedRoute>
            }
          />


          {/* =====================================================
              LOADING
          ===================================================== */}

          <Route
            path="/loading"
            element={
              <ProtectedRoute
                user={user}
                loading={authLoading}
              >
                <Loading />
              </ProtectedRoute>
            }
          />


          {/* =====================================================
              CHAT
          ===================================================== */}

          <Route
            path="/chat"
            element={
              <ProtectedRoute
                user={user}
                loading={authLoading}
              >
                <Chat />
              </ProtectedRoute>
            }
          />


          {/* =====================================================
              UNKNOWN ROUTE
          ===================================================== */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>
      </main>

      {!isAppPage && (
        <Footer />
      )}
    </>
  );
};

export default App;