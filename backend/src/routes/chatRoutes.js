const express = require("express");

const {
  shouldSearchWeb,
  generateChatResponse,
  generateChatTitle,
} = require("../services/sarvamService");

const {
  searchWeb,
} = require("../services/serperService");

const {
  getRelevantDriveContext,
  listDriveTree,
  findDriveFoldersByName,
  listDriveFolderContents,
} = require("../services/googleDriveService");

const {
  requireAuth,
} = require("../middleware/authMiddleware");

const {
  getFirestore,
} = require("firebase-admin/firestore");

const {
  firebaseApp,
} = require("../config/firebase");

const router = express.Router();

const db = getFirestore(firebaseApp);


/*
|--------------------------------------------------------------------------
| GOOGLE DRIVE HELPERS
|--------------------------------------------------------------------------
*/

/**
 * Decide whether the user's question is likely asking
 * about their own documents.
 */
const shouldSearchDrive = (message = "") => {
  const text = String(message)
    .toLowerCase()
    .trim();

  const driveTriggers = [
    "my document",
    "my documents",
    "my file",
    "my files",
    "my pdf",

    "my agreement",
    "my contract",
    "my rental agreement",
    "my employment contract",
    "my offer letter",
    "my appointment letter",

    "my resume",
    "my cv",

    "my notice",
    "my legal notice",
    "my lease",
    "my deed",
    "my invoice",

    "my tax document",
    "my tax documents",
    "my insurance",
    "my policy",
    "my application",

    "my drive",
    "google drive",
    "in my drive",
    "from my drive",

    "in my documents",
    "from my documents",

    "in the document",
    "from the document",

    "in the pdf",
    "from the pdf",

    "according to my",
    "according to the document",
    "according to the agreement",
    "according to the contract",

    "what does my",
    "what does the document",
    "what does the agreement",
    "what does the contract",

    "check my",
    "look at my",
    "read my",
    "find my",
  ];

  return driveTriggers.some((trigger) =>
    text.includes(trigger)
  );
};


/**
 * Decide whether the user wants to browse
 * the structure of Google Drive.
 */
const shouldBrowseDrive = (message = "") => {
  const text = String(message)
    .toLowerCase()
    .trim();

  if (!text) {
    return false;
  }

  const browseTriggers = [
    "list my files",
    "list my file",
    "list my folders",
    "list my folder",

    "show my files",
    "show my file",
    "show my folders",
    "show my folder",

    "what files do i have",
    "what folders do i have",

    "what files are in my drive",
    "what folders are in my drive",

    "show my drive",
    "list my drive",
    "browse my drive",

    "go through my drive",
    "go through my google drive",

    "check my drive",
    "check my google drive",

    "look through my drive",
    "look through my google drive",

    "search my drive",
    "search my google drive",

    "everything in my drive",
    "all files in my drive",
    "all folders in my drive",

    "files and folders",
    "files / folders",
    "files/folders",
  ];

  return browseTriggers.some((trigger) =>
    text.includes(trigger)
  );
};


/**
 * Decide whether the user is asking about
 * a specific Drive folder.
 */
const shouldUseDriveFolder = (message = "") => {
  const text = String(message)
    .toLowerCase()
    .trim();

  if (!text) {
    return false;
  }

  return (
    text.includes("folder") &&
    (
      text.includes("check") ||
      text.includes("search") ||
      text.includes("find") ||
      text.includes("look") ||
      text.includes("inside") ||
      text.includes("in my") ||
      text.includes("from my")
    )
  );
};


/**
 * Try to extract a folder name from the user's message.
 *
 * Examples:
 *
 * "check my Legal folder"
 * → Legal
 *
 * "find my certificate in Certifications folder"
 * → Certifications
 */
const extractFolderName = (message = "") => {
  const text = String(message).trim();

  const patterns = [
    /\bin\s+["']?([^"'?.]+?)["']?\s+folder\b/i,

    /\bfrom\s+["']?([^"'?.]+?)["']?\s+folder\b/i,

    /\bcheck\s+(?:my\s+)?["']?([^"'?.]+?)["']?\s+folder\b/i,

    /\bthe\s+["']?([^"'?.]+?)["']?\s+folder\b/i,

    /\binside\s+(?:my\s+)?["']?([^"'?.]+?)["']?\s+folder\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1]
        .trim()
        .replace(/\s+/g, " ");
    }
  }

  return null;
};


/**
 * Format a Drive tree into a readable text response.
 */
const formatDriveTree = (
  node,
  depth = 0
) => {
  if (!node) {
    return "";
  }

  const indent = "  ".repeat(depth);

  let output = "";

  if (node.type === "folder") {
    output += `${indent}📁 ${node.name}\n`;
  } else {
    output += `${indent}📄 ${node.name}`;

    if (node.mimeType) {
      output += ` — ${node.mimeType}`;
    }

    output += "\n";

    return output;
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      output += formatDriveTree(
        child,
        depth + 1
      );
    }
  }

  return output;
};


/**
 * Format direct folder contents.
 */
const formatFolderContents = (
  folder,
  contents = []
) => {
  let output =
    `📁 ${folder.name}\n\n`;

  const folders = contents.filter(
    (item) =>
      item.mimeType ===
      "application/vnd.google-apps.folder"
  );

  const files = contents.filter(
    (item) =>
      item.mimeType !==
      "application/vnd.google-apps.folder"
  );

  if (folders.length > 0) {
    output += "Folders:\n";

    folders.forEach((item) => {
      output += `- 📁 ${item.name}\n`;
    });

    output += "\n";
  }

  if (files.length > 0) {
    output += "Files:\n";

    files.forEach((item) => {
      output += `- 📄 ${item.name}\n`;
    });
  }

  if (
    folders.length === 0 &&
    files.length === 0
  ) {
    output +=
      "This folder is currently empty.";
  }

  return output.trim();
};


/*
|--------------------------------------------------------------------------
| GET USER'S GOOGLE DRIVE CONNECTOR
|--------------------------------------------------------------------------
*/

const getGoogleDriveConnector = async (uid) => {
  if (!uid) {
    return null;
  }

  const connectorRef = db
    .collection("users")
    .doc(uid)
    .collection("connectors")
    .doc("google-drive");

  const snapshot =
    await connectorRef.get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();

  if (
    !data?.accessToken &&
    !data?.refreshToken
  ) {
    return null;
  }

  return data;
};


/*
|--------------------------------------------------------------------------
| CHAT RESPONSE
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  requireAuth,
  async (req, res) => {
    try {
      const {
        conversation = [],
      } = req.body;


      /*
      |--------------------------------------------------------------------------
      | VALIDATE CONVERSATION
      |--------------------------------------------------------------------------
      */

      if (!Array.isArray(conversation)) {
        return res.status(400).json({
          success: false,
          message:
            "Conversation must be an array.",
        });
      }

      if (conversation.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Conversation cannot be empty.",
        });
      }


      const cleanConversation =
        conversation
          .filter(
            (message) =>
              message &&
              ["user", "assistant"].includes(
                message.role
              ) &&
              typeof message.content ===
                "string"
          )
          .map((message) => ({
            role: message.role,

            content:
              message.content.trim(),
          }))
          .filter(
            (message) =>
              message.content.length > 0
          );


      if (cleanConversation.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "No valid messages were provided.",
        });
      }


      /*
      |--------------------------------------------------------------------------
      | FIND LATEST USER MESSAGE
      |--------------------------------------------------------------------------
      */

      const latestUserMessage =
        [...cleanConversation]
          .reverse()
          .find(
            (message) =>
              message.role === "user"
          );

      if (!latestUserMessage) {
        return res.status(400).json({
          success: false,
          message:
            "A user message is required.",
        });
      }

      const userMessage =
        latestUserMessage.content;


      /*
      |--------------------------------------------------------------------------
      | GOOGLE DRIVE CONNECTOR
      |--------------------------------------------------------------------------
      */

      let connector = null;

      try {
        connector =
          await getGoogleDriveConnector(
            req.user?.uid
          );
      } catch (connectorError) {
        console.error(
          "Google Drive connector lookup error:",
          connectorError
        );
      }


      /*
      |--------------------------------------------------------------------------
      | GOOGLE DRIVE BROWSE
      |--------------------------------------------------------------------------
      *
      * Example:
      *
      * "List all files and folders in my Drive"
      */

      if (shouldBrowseDrive(userMessage)) {
        console.log(
          "📁 Lawlite Drive browse:",
          userMessage
        );

        if (!connector) {
          return res.status(400).json({
            success: false,
            message:
              "Google Drive is not connected. Please connect your Google Drive first.",
          });
        }

        try {
          const driveTree =
            await listDriveTree({
              accessToken:
                connector.accessToken,

              refreshToken:
                connector.refreshToken,

              maxFiles: 500,
            });

          const driveMessage =
            formatDriveTree(
              driveTree.tree
            );

          return res.json({
            success: true,

            message:
              driveMessage ||
              "I couldn't find any files or folders in your Google Drive.",

            driveBrowseUsed: true,

            driveTotalFiles:
              driveTree.totalFiles,

            driveSources: [],
          });
        } catch (driveError) {
          console.error(
            "Google Drive browse error:",
            driveError
          );

          return res.status(500).json({
            success: false,
            message:
              "I couldn't browse your Google Drive right now.",
          });
        }
      }


      /*
      |--------------------------------------------------------------------------
      | GOOGLE DRIVE FOLDER REQUEST
      |--------------------------------------------------------------------------
      *
      * Examples:
      *
      * "Check my Certifications folder"
      *
      * "Find my certificate in Certifications folder"
      */

      if (
        shouldUseDriveFolder(userMessage)
      ) {
        const folderName =
          extractFolderName(
            userMessage
          );

        console.log(
          "📁 Lawlite folder request:",
          userMessage
        );

        console.log(
          "📁 Extracted folder:",
          folderName
        );

        if (
          folderName &&
          connector
        ) {
          try {
            const folders =
              await findDriveFoldersByName({
                accessToken:
                  connector.accessToken,

                refreshToken:
                  connector.refreshToken,

                folderName,
              });

            if (folders.length === 0) {
              return res.json({
                success: true,

                message:
                  `I couldn't find a folder named "${folderName}" in your Google Drive.`,

                driveFolderUsed: true,

                driveSources: [],
              });
            }


            const folder =
              folders[0];


            const contents =
              await listDriveFolderContents({
                accessToken:
                  connector.accessToken,

                refreshToken:
                  connector.refreshToken,

                folderId:
                  folder.id,
              });


            const folderMessage =
              formatFolderContents(
                folder,
                contents
              );


            return res.json({
              success: true,

              message:
                folderMessage,

              driveFolderUsed: true,

              driveFolder: {
                id: folder.id,
                name: folder.name,
              },

              driveSources:
                contents.map(
                  (item) => ({
                    id: item.id,

                    name:
                      item.name,

                    mimeType:
                      item.mimeType,

                    size:
                      item.size ||
                      null,

                    modifiedTime:
                      item.modifiedTime ||
                      null,

                    webViewLink:
                      item.webViewLink ||
                      null,
                  })
                ),
            });
          } catch (folderError) {
            console.error(
              "Google Drive folder error:",
              folderError
            );

            return res.status(500).json({
              success: false,
              message:
                "I couldn't access that Google Drive folder right now.",
            });
          }
        }

        /**
         * If the user mentions a folder but
         * Drive isn't connected.
         */
        if (!connector) {
          return res.status(400).json({
            success: false,
            message:
              "Google Drive is not connected. Please connect your Google Drive first.",
          });
        }
      }


      /*
      |--------------------------------------------------------------------------
      | WEB SEARCH
      |--------------------------------------------------------------------------
      */

      const needsWebSearch =
        shouldSearchWeb(
          userMessage
        );

      let webContext = null;


      if (needsWebSearch) {
        console.log(
          "🌐 Lawlite web search:",
          userMessage
        );

        try {
          const searchResults =
            await searchWeb({
              query: userMessage,
              num: 5,
            });

          const organicResults =
            searchResults?.organic || [];

          webContext =
            organicResults
              .map(
                (result, index) =>
                  `SOURCE ${index + 1}
Title: ${result.title || ""}
URL: ${result.link || ""}
Snippet: ${result.snippet || ""}`
              )
              .join("\n\n");

          if (!webContext) {
            webContext =
              "No useful web results were found.";
          }
        } catch (webError) {
          console.error(
            "Web search error:",
            webError
          );

          webContext =
            "Web search was unavailable for this request.";
        }
      }


      /*
      |--------------------------------------------------------------------------
      | GOOGLE DRIVE DOCUMENT SEARCH
      |--------------------------------------------------------------------------
      */

      const needsDriveSearch =
        shouldSearchDrive(
          userMessage
        );

      let driveContext = null;

      let driveSources = [];


      if (needsDriveSearch) {
        console.log(
          "📁 Lawlite Drive search:",
          userMessage
        );


        if (connector) {
          try {
            const driveResult =
              await getRelevantDriveContext({
                accessToken:
                  connector.accessToken,

                refreshToken:
                  connector.refreshToken,

                query:
                  userMessage,

                maxFiles: 3,

                maxCharsPerFile: 12000,
              });


            driveContext =
              driveResult?.context ||
              null;


            /**
             * IMPORTANT:
             *
             * googleDriveService returns
             * `sources`, not `files`.
             *
             * This fixes the previous:
             *
             * "Drive sources found: 0"
             *
             * even when the PDF was successfully loaded.
             */
            driveSources =
              driveResult?.sources ||
              [];


            console.log(
              `📁 Drive sources found: ${driveSources.length}`
            );


            if (driveSources.length > 0) {
              console.log(
                "📄 Drive sources:",
                driveSources.map(
                  (source) =>
                    source.name
                )
              );
            }
          } catch (driveError) {
            console.error(
              "Google Drive context error:",
              driveError
            );

            /**
             * Drive failure should NOT
             * break normal chat.
             */
            driveContext = null;

            driveSources = [];
          }
        } else {
          console.log(
            "📁 Google Drive is not connected."
          );
        }
      }


      /*
      |--------------------------------------------------------------------------
      | GENERATE FINAL SARVAM RESPONSE
      |--------------------------------------------------------------------------
      */

      const answer =
        await generateChatResponse({
          conversation:
            cleanConversation,

          webResults:
            webContext,

          driveContext:
            driveContext,
        });


      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      return res.json({
        success: true,

        message:
          answer,

        webSearchUsed:
          needsWebSearch,

        driveSearchUsed:
          needsDriveSearch &&
          driveSources.length > 0,

        driveSources:
          driveSources.map(
            (file) => ({
              id:
                file.id,

              name:
                file.name,

              mimeType:
                file.mimeType,

              modifiedTime:
                file.modifiedTime,

              webViewLink:
                file.webViewLink ||
                null,
            })
          ),

        driveBrowseUsed:
          false,

        driveFolderUsed:
          false,
      });
    } catch (error) {
      console.error(
        "Chat route error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to generate a response right now.",
      });
    }
  }
);


/*
|--------------------------------------------------------------------------
| CHAT TITLE
|--------------------------------------------------------------------------
*/

router.post(
  "/title",
  requireAuth,
  async (req, res) => {
    try {
      const {
        message,
      } = req.body;


      if (
        !message ||
        typeof message !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Message is required.",
        });
      }


      const title =
        await generateChatTitle(
          message.trim()
        );


      return res.json({
        success: true,
        title,
      });
    } catch (error) {
      console.error(
        "Chat title error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to generate chat title.",
      });
    }
  }
);


/*
|--------------------------------------------------------------------------
| TEMPORARY WEB SEARCH TEST
|--------------------------------------------------------------------------
|
| Keep this for development/testing.
| We can remove it once the normal chat web-search
| flow has been fully verified.
|
*/

router.post(
  "/web-search",
  async (req, res) => {
    try {
      const {
        query,
      } = req.body;


      if (
        !query ||
        typeof query !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Search query is required.",
        });
      }


      const results =
        await searchWeb({
          query:
            query.trim(),

          num: 5,
        });


      return res.json({
        success: true,
        results,
      });
    } catch (error) {
      console.error(
        "Web search route error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to search the web right now.",
      });
    }
  }
);


module.exports = router;