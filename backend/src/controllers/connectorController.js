const {
  getGoogleAuthorizationUrl,
  exchangeCodeForTokens,
  listDriveFiles,
} = require("../services/googleDriveService");

const {
  createState,
  verifyState,
} = require("../utils/googleOAuthState");

const { firebaseApp } = require("../config/firebase");
const {
  getFirestore,
} = require("firebase-admin/firestore");

const db = getFirestore(firebaseApp);

const GOOGLE_CONNECTOR = "google-drive";

const getConnectorRef = (uid) => {
  return db
    .collection("users")
    .doc(uid)
    .collection("connectors")
    .doc(GOOGLE_CONNECTOR);
};


// ==========================================
// START GOOGLE DRIVE OAUTH
// ==========================================

const startGoogleDriveAuth = (req, res) => {
  try {
    const uid = req.user.uid;

    const state = createState(uid);

    const authorizationUrl =
      getGoogleAuthorizationUrl(state);

    return res.json({
      success: true,
      authorizationUrl,
    });
  } catch (error) {
    console.error(
      "Google Drive authorization error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to start Google Drive connection.",
    });
  }
};


// ==========================================
// GOOGLE OAUTH CALLBACK
// ==========================================

const googleDriveCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error(
        "Google OAuth returned an error:",
        error
      );

      return res.redirect(
        "http://localhost:5173/chat?connector=google-drive&status=cancelled"
      );
    }

    if (!code || !state) {
      return res.status(400).send(
        "Invalid Google OAuth callback."
      );
    }

    const stateData = verifyState(state);

    if (!stateData) {
      return res.status(400).send(
        "Invalid or expired OAuth state."
      );
    }

    const tokens =
      await exchangeCodeForTokens(code);

    if (!tokens.refresh_token && !tokens.access_token) {
      return res.status(400).send(
        "Google did not return usable authentication tokens."
      );
    }

    await getConnectorRef(stateData.uid).set(
      {
        provider: GOOGLE_CONNECTOR,

        accessToken:
          tokens.access_token || null,

        refreshToken:
          tokens.refresh_token || null,

        expiryDate:
          tokens.expiry_date || null,

        scope:
          tokens.scope || null,

        tokenType:
          tokens.token_type || "Bearer",

        connectedAt:
          new Date(),

        updatedAt:
          new Date(),
      },
      {
        merge: true,
      }
    );

    return res.redirect(
      "http://localhost:5173/chat?connector=google-drive&status=connected"
    );
  } catch (error) {
    console.error(
      "Google Drive callback error:",
      error
    );

    return res.redirect(
      "http://localhost:5173/chat?connector=google-drive&status=error"
    );
  }
};


// ==========================================
// GOOGLE DRIVE CONNECTION STATUS
// ==========================================

const getGoogleDriveStatus = async (
  req,
  res
) => {
  try {
    const uid = req.user.uid;

    const snapshot =
      await getConnectorRef(uid).get();

    if (!snapshot.exists) {
      return res.json({
        success: true,
        connected: false,
      });
    }

    const data = snapshot.data();

    return res.json({
      success: true,
      connected: true,
      provider: data.provider,
      connectedAt:
        data.connectedAt || null,
    });
  } catch (error) {
    console.error(
      "Google Drive status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to check Google Drive connection.",
    });
  }
};


// ==========================================
// LIST GOOGLE DRIVE FILES
// ==========================================

const getGoogleDriveFiles = async (
  req,
  res
) => {
  try {
    const uid = req.user.uid;

    const snapshot =
      await getConnectorRef(uid).get();

    if (!snapshot.exists) {
      return res.status(400).json({
        success: false,
        message:
          "Google Drive is not connected.",
      });
    }

    const data = snapshot.data();

    if (
      !data.accessToken &&
      !data.refreshToken
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Google Drive authentication is incomplete.",
      });
    }

    const files =
      await listDriveFiles({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

    return res.json({
      success: true,
      files,
    });
  } catch (error) {
    console.error(
      "Google Drive files error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve Google Drive files.",
    });
  }
};


// ==========================================
// DISCONNECT GOOGLE DRIVE
// ==========================================

const disconnectGoogleDrive = async (
  req,
  res
) => {
  try {
    const uid = req.user.uid;

    await getConnectorRef(uid).delete();

    return res.json({
      success: true,
      message:
        "Google Drive disconnected successfully.",
    });
  } catch (error) {
    console.error(
      "Google Drive disconnect error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to disconnect Google Drive.",
    });
  }
};


module.exports = {
  startGoogleDriveAuth,
  googleDriveCallback,
  getGoogleDriveStatus,
  getGoogleDriveFiles,
  disconnectGoogleDrive,
};