const {
  getGmailAuthorizationUrl,
  exchangeGmailCode,
} = require("../config/gmailOAuth");

const {
  createState,
  verifyState,
} = require("../utils/googleOAuthState");

const { firebaseApp } = require("../config/firebase");

const {
  getFirestore,
} = require("firebase-admin/firestore");

const db = getFirestore(firebaseApp);

const GMAIL_CONNECTOR = "gmail";

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

/*
|--------------------------------------------------------------------------
| FIRESTORE HELPER
|--------------------------------------------------------------------------
*/

const getConnectorRef = (uid) => {
  if (!uid) {
    throw new Error("Firebase user ID is required.");
  }

  return db
    .collection("users")
    .doc(uid)
    .collection("connectors")
    .doc(GMAIL_CONNECTOR);
};

/*
|--------------------------------------------------------------------------
| START GMAIL OAUTH
|--------------------------------------------------------------------------
*/

const startGmailAuth = (req, res) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    /*
     * Reuse the same signed state mechanism as
     * the existing Google Drive OAuth flow.
     */
    const state = createState(uid);

    const authorizationUrl =
      getGmailAuthorizationUrl(state);

    return res.json({
      success: true,
      authorizationUrl,
    });
  } catch (error) {
    console.error(
      "Gmail authorization error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to start Gmail connection.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GMAIL OAUTH CALLBACK
|--------------------------------------------------------------------------
*/

const gmailCallback = async (req, res) => {
  try {
    const {
      code,
      state,
      error,
    } = req.query;

    /*
     * User cancelled or Google returned an OAuth error.
     */
    if (error) {
      console.error(
        "Gmail OAuth returned an error:",
        error
      );

      return res.redirect(
        `${FRONTEND_URL}/chat?connector=gmail&status=cancelled`
      );
    }

    /*
     * Validate callback parameters.
     */
    if (!code || !state) {
      return res.status(400).send(
        "Invalid Gmail OAuth callback."
      );
    }

    /*
     * Verify that the OAuth flow belongs
     * to a valid Firebase user.
     */
    const stateData = verifyState(state);

    if (!stateData?.uid) {
      return res.status(400).send(
        "Invalid or expired OAuth state."
      );
    }

    /*
     * Exchange Google authorization code
     * for Gmail access/refresh tokens.
     */
    const tokens =
      await exchangeGmailCode(code);

    if (
      !tokens?.refresh_token &&
      !tokens?.access_token
    ) {
      return res.status(400).send(
        "Google did not return usable Gmail authentication tokens."
      );
    }

    /*
     * Store Gmail credentials against
     * the authenticated Firebase user.
     */
    await getConnectorRef(stateData.uid).set(
      {
        provider: GMAIL_CONNECTOR,

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

    console.log(
      `✅ Gmail connected for Firebase user: ${stateData.uid}`
    );

    return res.redirect(
      `${FRONTEND_URL}/chat?connector=gmail&status=connected`
    );
  } catch (error) {
    console.error(
      "Gmail callback error:",
      error
    );

    return res.redirect(
      `${FRONTEND_URL}/chat?connector=gmail&status=error`
    );
  }
};

/*
|--------------------------------------------------------------------------
| GMAIL CONNECTION STATUS
|--------------------------------------------------------------------------
*/

const getGmailStatus = async (
  req,
  res
) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const snapshot =
      await getConnectorRef(uid).get();

    if (!snapshot.exists) {
      return res.json({
        success: true,
        connected: false,
      });
    }

    const data =
      snapshot.data() || {};

    const connected = Boolean(
      data.accessToken ||
      data.refreshToken
    );

    return res.json({
      success: true,
      connected,
    });
  } catch (error) {
    console.error(
      "Gmail status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to check Gmail connection status.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| DISCONNECT GMAIL
|--------------------------------------------------------------------------
*/

const disconnectGmail = async (
  req,
  res
) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    await getConnectorRef(uid).delete();

    console.log(
      `✅ Gmail disconnected for Firebase user: ${uid}`
    );

    return res.json({
      success: true,
      message: "Gmail disconnected successfully.",
    });
  } catch (error) {
    console.error(
      "Gmail disconnect error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to disconnect Gmail.",
    });
  }
};

module.exports = {
  startGmailAuth,
  gmailCallback,
  getGmailStatus,
  disconnectGmail,
};