const {
  getGitHubAuthorizationUrl,
  exchangeGitHubCode,
} = require("../config/githubOAuth");

const {
  createState,
  verifyState,
} = require("../utils/googleOAuthState");

const {
  firebaseApp,
} = require("../config/firebase");

const {
  getFirestore,
} = require("firebase-admin/firestore");

const db = getFirestore(firebaseApp);

const GITHUB_CONNECTOR = "github";

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

/*
|--------------------------------------------------------------------------
| FIRESTORE HELPER
|--------------------------------------------------------------------------
*/

const getConnectorRef = (uid) => {
  if (!uid) {
    throw new Error(
      "Firebase user ID is required."
    );
  }

  return db
    .collection("users")
    .doc(uid)
    .collection("connectors")
    .doc(GITHUB_CONNECTOR);
};


/*
|--------------------------------------------------------------------------
| START GITHUB OAUTH
|--------------------------------------------------------------------------
*/

const startGitHubAuth = (
  req,
  res
) => {
  try {
    const uid =
      req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    /*
     * We reuse the same state mechanism already
     * used by the Google Drive connector.
     *
     * This associates the OAuth callback with the
     * currently logged-in Firebase user.
     */
    const state =
      createState(uid);

    const authorizationUrl =
      getGitHubAuthorizationUrl(
        state
      );

    return res.json({
      success: true,
      authorizationUrl,
    });
  } catch (error) {
    console.error(
      "GitHub authorization error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to start GitHub connection.",
    });
  }
};


/*
|--------------------------------------------------------------------------
| GITHUB OAUTH CALLBACK
|--------------------------------------------------------------------------
*/

const githubCallback =
  async (
    req,
    res
  ) => {
    try {
      const {
        code,
        state,
        error,
      } = req.query;

      /*
      |--------------------------------------------------------------------------
      | USER CANCELLED / GITHUB ERROR
      |--------------------------------------------------------------------------
      */

      if (error) {
        console.error(
          "GitHub OAuth returned an error:",
          error
        );

        return res.redirect(
          `${FRONTEND_URL}/chat?connector=github&status=cancelled`
        );
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDATE CALLBACK
      |--------------------------------------------------------------------------
      */

      if (
        !code ||
        !state
      ) {
        return res.status(400).send(
          "Invalid GitHub OAuth callback."
        );
      }

      /*
      |--------------------------------------------------------------------------
      | VERIFY STATE
      |--------------------------------------------------------------------------
      */

      const stateData =
        verifyState(state);

      if (
        !stateData?.uid
      ) {
        return res.status(400).send(
          "Invalid or expired OAuth state."
        );
      }

      /*
      |--------------------------------------------------------------------------
      | EXCHANGE CODE FOR ACCESS TOKEN
      |--------------------------------------------------------------------------
      */

      const tokenData =
        await exchangeGitHubCode(
          code
        );

      if (
        !tokenData?.access_token
      ) {
        return res.status(400).send(
          "GitHub did not return a usable access token."
        );
      }

      /*
      |--------------------------------------------------------------------------
      | STORE CONNECTOR
      |--------------------------------------------------------------------------
      */

      await getConnectorRef(
        stateData.uid
      ).set(
        {
          provider:
            GITHUB_CONNECTOR,

          accessToken:
            tokenData.access_token,

          tokenType:
            tokenData.token_type ||
            "bearer",

          scope:
            tokenData.scope ||
            null,

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
        `✅ GitHub connected for Firebase user: ${stateData.uid}`
      );

      return res.redirect(
        `${FRONTEND_URL}/chat?connector=github&status=connected`
      );
    } catch (error) {
      console.error(
        "GitHub callback error:",
        error
      );

      return res.redirect(
        `${FRONTEND_URL}/chat?connector=github&status=error`
      );
    }
  };


/*
|--------------------------------------------------------------------------
| GITHUB CONNECTION STATUS
|--------------------------------------------------------------------------
*/

const getGitHubStatus =
  async (
    req,
    res
  ) => {
    try {
      const uid =
        req.user?.uid;

      if (!uid) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });
      }

      const snapshot =
        await getConnectorRef(
          uid
        ).get();

      if (
        !snapshot.exists
      ) {
        return res.json({
          success: true,
          connected: false,
        });
      }

      const data =
        snapshot.data() || {};

      const connected =
        Boolean(
          data.accessToken
        );

      return res.json({
        success: true,
        connected,
      });
    } catch (error) {
      console.error(
        "GitHub status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to check GitHub connection status.",
      });
    }
  };


/*
|--------------------------------------------------------------------------
| DISCONNECT GITHUB
|--------------------------------------------------------------------------
*/

const disconnectGitHub =
  async (
    req,
    res
  ) => {
    try {
      const uid =
        req.user?.uid;

      if (!uid) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });
      }

      await getConnectorRef(
        uid
      ).delete();

      console.log(
        `✅ GitHub disconnected for Firebase user: ${uid}`
      );

      return res.json({
        success: true,
        message:
          "GitHub disconnected successfully.",
      });
    } catch (error) {
      console.error(
        "GitHub disconnect error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to disconnect GitHub.",
      });
    }
  };


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  startGitHubAuth,
  githubCallback,
  getGitHubStatus,
  disconnectGitHub,
};