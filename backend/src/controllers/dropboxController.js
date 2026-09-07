const {
  getDropboxAuthorizationUrl,
  exchangeDropboxCodeForTokens,
} = require("../config/dropboxOAuth");

const {
  createState,
  verifyState,
} = require("../utils/googleOAuthState");

const { firebaseApp } = require("../config/firebase");

const {
  getFirestore,
} = require("firebase-admin/firestore");

const db = getFirestore(firebaseApp);

const DROPBOX_CONNECTOR = "dropbox";

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

const getDropboxConnectorRef = (uid) => {
  return db
    .collection("users")
    .doc(uid)
    .collection("connectors")
    .doc(DROPBOX_CONNECTOR);
};

/*
|--------------------------------------------------------------------------
| START DROPBOX OAUTH
|--------------------------------------------------------------------------
*/

const startDropboxAuth = async (req, res) => {
  try {
    const uid = req.user.uid;

    const state = createState(uid);

    const authorizationUrl =
      await getDropboxAuthorizationUrl(state);

    return res.json({
      success: true,
      authorizationUrl,
    });
  } catch (error) {
    console.error(
      "Dropbox authorization error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to start Dropbox connection.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| DROPBOX OAUTH CALLBACK
|--------------------------------------------------------------------------
*/

const dropboxCallback = async (req, res) => {
  try {
    const {
      code,
      state,
      error,
      error_description,
    } = req.query;

    if (error) {
      console.error(
        "Dropbox OAuth returned an error:",
        error,
        error_description || ""
      );

      return res.redirect(
        `${FRONTEND_URL}/chat?connector=dropbox&status=cancelled`
      );
    }

    if (!code || !state) {
      return res.status(400).send(
        "Invalid Dropbox OAuth callback."
      );
    }

    const stateData = verifyState(state);

    if (!stateData) {
      return res.status(400).send(
        "Invalid or expired OAuth state."
      );
    }

    const tokens =
      await exchangeDropboxCodeForTokens(code);

    if (
      !tokens.access_token &&
      !tokens.refresh_token
    ) {
      return res.status(400).send(
        "Dropbox did not return usable authentication tokens."
      );
    }

    await getDropboxConnectorRef(
      stateData.uid
    ).set(
      {
        provider: DROPBOX_CONNECTOR,

        accessToken:
          tokens.access_token || null,

        refreshToken:
          tokens.refresh_token || null,

        expiresIn:
          tokens.expires_in || null,

        tokenType:
          tokens.token_type || "bearer",

        scope:
          tokens.scope || null,

        accountId:
          tokens.account_id || null,

        uid:
          tokens.uid || null,

        connectedAt: new Date(),
        updatedAt: new Date(),
      },
      {
        merge: true,
      }
    );

    console.log(
      `Dropbox connected successfully for Firebase user ${stateData.uid}`
    );

    return res.redirect(
      `${FRONTEND_URL}/chat?connector=dropbox&status=connected`
    );
  } catch (error) {
    console.error(
      "Dropbox callback error:",
      error
    );

    return res.redirect(
      `${FRONTEND_URL}/chat?connector=dropbox&status=error`
    );
  }
};

/*
|--------------------------------------------------------------------------
| DROPBOX CONNECTION STATUS
|--------------------------------------------------------------------------
*/

const getDropboxStatus = async (req, res) => {
  try {
    const uid = req.user.uid;

    const snapshot =
      await getDropboxConnectorRef(uid).get();

    if (!snapshot.exists) {
      return res.json({
        success: true,
        connected: false,
      });
    }

    const data = snapshot.data();

    const connected =
      Boolean(
        data?.accessToken ||
        data?.refreshToken
      );

    return res.json({
      success: true,
      connected,
      provider: data.provider || DROPBOX_CONNECTOR,
      connectedAt:
        data.connectedAt || null,
    });
  } catch (error) {
    console.error(
      "Dropbox status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to check Dropbox connection.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| DISCONNECT DROPBOX
|--------------------------------------------------------------------------
*/

const disconnectDropbox = async (req, res) => {
  try {
    const uid = req.user.uid;

    await getDropboxConnectorRef(uid).delete();

    return res.json({
      success: true,
      message:
        "Dropbox disconnected successfully.",
    });
  } catch (error) {
    console.error(
      "Dropbox disconnect error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to disconnect Dropbox.",
    });
  }
};

module.exports = {
  startDropboxAuth,
  dropboxCallback,
  getDropboxStatus,
  disconnectDropbox,
};