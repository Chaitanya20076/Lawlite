const {
  getNotionAuthorizationUrl,
  exchangeNotionCodeForTokens,
} = require("../config/notionOAuth");

const {
  createState,
  verifyState,
} = require("../utils/googleOAuthState");

const {
  getFirestore,
} = require("firebase-admin/firestore");

const {
  firebaseApp,
} = require("../config/firebase");


/*
|--------------------------------------------------------------------------
| FIRESTORE
|--------------------------------------------------------------------------
*/

const db =
  getFirestore(firebaseApp);


/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const NOTION_CONNECTOR =
  "notion";

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:5173";


/*
|--------------------------------------------------------------------------
| GET NOTION CONNECTOR REFERENCE
|--------------------------------------------------------------------------
*/

const getNotionConnectorRef =
  (uid) => {
    if (!uid) {
      throw new Error(
        "Firebase user ID is required."
      );
    }

    return db
      .collection("users")
      .doc(uid)
      .collection("connectors")
      .doc(NOTION_CONNECTOR);
  };


/*
|--------------------------------------------------------------------------
| START NOTION OAUTH
|--------------------------------------------------------------------------
|
| Called by the authenticated Lawlite frontend.
|
| GET:
| /api/connectors/notion/authorize
|
|--------------------------------------------------------------------------
*/

const startNotionAuth =
  async (req, res) => {
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
      |--------------------------------------------------------------------------
      | CREATE SIGNED STATE
      |--------------------------------------------------------------------------
      */

      const state =
        createState(uid);


      /*
      |--------------------------------------------------------------------------
      | CREATE NOTION AUTH URL
      |--------------------------------------------------------------------------
      */

      const authorizationUrl =
        getNotionAuthorizationUrl({
          state,
        });


      console.log(
        `📝 Starting Notion OAuth for Firebase user ${uid}`
      );


      return res.json({
        success:
          true,

        authorizationUrl,
      });

    } catch (error) {
      console.error(
        "Notion authorization error:",
        error
      );


      return res.status(500).json({
        success:
          false,

        message:
          "Unable to start Notion connection.",
      });
    }
  };


/*
|--------------------------------------------------------------------------
| NOTION OAUTH CALLBACK
|--------------------------------------------------------------------------
|
| Notion redirects the browser here after authorization.
|
| GET:
| /api/connectors/notion/callback
|
|--------------------------------------------------------------------------
*/

const notionCallback =
  async (req, res) => {
    try {
      const {
        code,
        state,
        error,
        error_description,
      } = req.query;


      /*
      |--------------------------------------------------------------------------
      | USER CANCELLED / NOTION RETURNED ERROR
      |--------------------------------------------------------------------------
      */

      if (error) {
        console.error(
          "Notion OAuth returned an error:",
          error,
          error_description ||
            ""
        );


        return res.redirect(
          `${FRONTEND_URL}/chat?connector=notion&status=cancelled`
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
        console.error(
          "Invalid Notion OAuth callback."
        );


        return res.status(400).send(
          "Invalid Notion OAuth callback."
        );
      }


      /*
      |--------------------------------------------------------------------------
      | VERIFY SIGNED STATE
      |--------------------------------------------------------------------------
      */

      const stateData =
        verifyState(state);


      if (!stateData) {
        console.error(
          "Invalid or expired Notion OAuth state."
        );


        return res.status(400).send(
          "Invalid or expired OAuth state."
        );
      }


      /*
      |--------------------------------------------------------------------------
      | EXCHANGE CODE FOR TOKENS
      |--------------------------------------------------------------------------
      */

      const tokenData =
        await exchangeNotionCodeForTokens(
          code
        );


      /*
      |--------------------------------------------------------------------------
      | VALIDATE ACCESS TOKEN
      |--------------------------------------------------------------------------
      */

      if (
        !tokenData?.access_token
      ) {
        console.error(
          "Notion did not return an access token:",
          tokenData
        );


        return res.status(400).send(
          "Notion did not return a usable access token."
        );
      }


      /*
      |--------------------------------------------------------------------------
      | STORE CONNECTOR
      |--------------------------------------------------------------------------
      */

      const connectorRef =
        getNotionConnectorRef(
          stateData.uid
        );


      await connectorRef.set(
        {
          provider:
            NOTION_CONNECTOR,

          accessToken:
            tokenData.access_token,

          refreshToken:
            tokenData.refresh_token ||
            null,

          tokenType:
            tokenData.token_type ||
            "bearer",

          botId:
            tokenData.bot_id ||
            null,

          workspaceId:
            tokenData.workspace_id ||
            null,

          workspaceName:
            tokenData.workspace_name ||
            null,

          workspaceIcon:
            tokenData.workspace_icon ||
            null,

          owner:
            tokenData.owner ||
            null,

          duplicatedTemplateId:
            tokenData.duplicated_template_id ||
            null,

          connectedAt:
            new Date(),

          updatedAt:
            new Date(),
        },
        {
          merge:
            true,
        }
      );


      console.log(
        `📝 Notion connected successfully for Firebase user ${stateData.uid}`
      );


      /*
      |--------------------------------------------------------------------------
      | RETURN TO LAWLITE
      |--------------------------------------------------------------------------
      */

      return res.redirect(
        `${FRONTEND_URL}/chat?connector=notion&status=connected`
      );

    } catch (error) {
      console.error(
        "Notion callback error:",
        error
      );


      return res.redirect(
        `${FRONTEND_URL}/chat?connector=notion&status=error`
      );
    }
  };


/*
|--------------------------------------------------------------------------
| GET NOTION CONNECTION STATUS
|--------------------------------------------------------------------------
|
| GET:
| /api/connectors/notion/status
|
|--------------------------------------------------------------------------
*/

const getNotionStatus =
  async (req, res) => {
    try {
      const uid =
        req.user?.uid;

      if (!uid) {
        return res.status(401).json({
          success:
            false,

          message:
            "Authentication required.",
        });
      }


      const snapshot =
        await getNotionConnectorRef(
          uid
        ).get();


      /*
      |--------------------------------------------------------------------------
      | NOT CONNECTED
      |--------------------------------------------------------------------------
      */

      if (
        !snapshot.exists
      ) {
        return res.json({
          success:
            true,

          connected:
            false,

          provider:
            NOTION_CONNECTOR,
        });
      }


      const data =
        snapshot.data();


      const connected =
        Boolean(
          data?.accessToken ||
          data?.refreshToken
        );


      return res.json({
        success:
          true,

        connected,

        provider:
          data?.provider ||
          NOTION_CONNECTOR,

        workspaceId:
          data?.workspaceId ||
          null,

        workspaceName:
          data?.workspaceName ||
          null,

        workspaceIcon:
          data?.workspaceIcon ||
          null,

        connectedAt:
          data?.connectedAt ||
          null,
      });

    } catch (error) {
      console.error(
        "Notion status error:",
        error
      );


      return res.status(500).json({
        success:
          false,

        message:
          "Unable to check Notion connection.",
      });
    }
  };


/*
|--------------------------------------------------------------------------
| DISCONNECT NOTION
|--------------------------------------------------------------------------
|
| DELETE:
| /api/connectors/notion/disconnect
|
|--------------------------------------------------------------------------
*/

const disconnectNotion =
  async (req, res) => {
    try {
      const uid =
        req.user?.uid;

      if (!uid) {
        return res.status(401).json({
          success:
            false,

          message:
            "Authentication required.",
        });
      }


      await getNotionConnectorRef(
        uid
      ).delete();


      console.log(
        `📝 Notion disconnected for Firebase user ${uid}`
      );


      return res.json({
        success:
          true,

        message:
          "Notion disconnected successfully.",
      });

    } catch (error) {
      console.error(
        "Notion disconnect error:",
        error
      );


      return res.status(500).json({
        success:
          false,

        message:
          "Unable to disconnect Notion.",
      });
    }
  };


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  startNotionAuth,
  notionCallback,
  getNotionStatus,
  disconnectNotion,
};