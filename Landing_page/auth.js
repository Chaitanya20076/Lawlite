// ── Lawlite Auth (Firebase) ──────────────────────────────────────────────────
// Requires Firebase compat SDK loaded before this script.

const firebaseConfig = {
  apiKey: "AIzaSyCgQ89hLbS0b1xDFFEqe1whzVPA3AvIufY",
  authDomain: "lawlite-auth.firebaseapp.com",
  projectId: "lawlite-auth",
  storageBucket: "lawlite-auth.firebasestorage.app",
  messagingSenderId: "1024876192416",
  appId: "1:1024876192416:web:c3befd9811cae26d85dfc5"
};

// Initialise only once (guard for multi-page reuse)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

window.Auth = (() => {

  // ── Sign Up ────────────────────────────────────────────────────────────────
  function signup(name, email, password) {
    return firebase.auth()
      .createUserWithEmailAndPassword(email, password)
      .then(userCred => {
        return userCred.user.updateProfile({ displayName: name })
          .then(() => userCred.user.sendEmailVerification())
          .then(() => ({ success: true }));
      })
      .catch(err => ({ success: false, error: _friendlyError(err) }));
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  function login(email, password) {
    return firebase.auth()
      .signInWithEmailAndPassword(email, password)
      .then(userCred => {
        if (!userCred.user.emailVerified) {
          firebase.auth().signOut();
          return {
            success: false,
            error: 'Please verify your email first. Check your inbox for the verification link.'
          };
        }
        return { success: true };
      })
      .catch(err => ({ success: false, error: _friendlyError(err) }));
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  function logout() {
    // Clear onboarding flag so they go through it again if they want
    // (remove next line if you want onboarding to be one-time ever)
    // localStorage.removeItem('lawlite_onboarded');
    firebase.auth().signOut().then(() => {
      window.location.href = 'index.html';
    });
  }

  // ── Auth State ─────────────────────────────────────────────────────────────
  function isLoggedIn() {
    const user = firebase.auth().currentUser;
    return !!(user && user.emailVerified);
  }

  function currentUser() {
    return firebase.auth().currentUser;
  }

  // ── Post-auth redirect ─────────────────────────────────────────────────────
  // Call this after a successful login/signup to route to onboarding OR analyzer
  function postAuthRedirect(fallback) {
    const onboarded = localStorage.getItem('lawlite_onboarded');
    if (onboarded) {
      window.location.href = fallback || 'http://localhost:3000';
    } else {
      window.location.href = 'onboarding.html';
    }
  }

  // ── Password Reset ─────────────────────────────────────────────────────────
  function resetPassword(email) {
    return firebase.auth()
      .sendPasswordResetEmail(email)
      .then(() => ({ success: true }))
      .catch(err => ({ success: false, error: _friendlyError(err) }));
  }

  // ── Resend Verification ────────────────────────────────────────────────────
  function resendVerification(email, password) {
    return firebase.auth()
      .signInWithEmailAndPassword(email, password)
      .then(userCred => {
        if (userCred.user.emailVerified) {
          return { success: false, error: 'This email is already verified. You can log in.' };
        }
        return userCred.user.sendEmailVerification()
          .then(() => {
            firebase.auth().signOut();
            return { success: true };
          });
      })
      .catch(err => ({ success: false, error: _friendlyError(err) }));
  }

  // ── onAuthStateChanged wrapper ─────────────────────────────────────────────
  function onAuthChange(cb) {
    return firebase.auth().onAuthStateChanged(cb);
  }

  // ── Friendly error messages ────────────────────────────────────────────────
  function _friendlyError(err) {
    const map = {
      'auth/user-not-found':         'No account found with that email address.',
      'auth/wrong-password':         'Incorrect password. Please try again.',
      'auth/invalid-credential':     'Incorrect email or password. Please try again.',
      'auth/email-already-in-use':   'An account with this email already exists.',
      'auth/weak-password':          'Password must be at least 6 characters.',
      'auth/invalid-email':          'Please enter a valid email address.',
      'auth/too-many-requests':      'Too many attempts. Please wait a moment and try again.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/user-disabled':          'This account has been disabled. Contact support.',
    };
    return map[err.code] || err.message;
  }

  return { signup, login, logout, isLoggedIn, currentUser, postAuthRedirect, resetPassword, resendVerification, onAuthChange };

})();