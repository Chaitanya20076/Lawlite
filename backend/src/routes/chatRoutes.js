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
  listDropboxTree,
  findDropboxFoldersByName,
  listDropboxFolderContents,
  findRelevantDropboxFiles,
  downloadDropboxFile,
} = require("../services/dropboxService");

const {
  getRelevantNotionContext,
} = require("../services/notionService");

const {
  getRelevantGmailContext,
} = require("../services/gmailService");
const {
  getRelevantGitHubContext,
} = require("../services/githubService");

const {
  requireAuth,
} = require("../middleware/authMiddleware");
const {
  classifyLawliteQuery,
  getLawliteRefusalMessage,
} = require("../services/connectorIntelligenceService");

const {
  getFirestore,
} = require("firebase-admin/firestore");

const {
  firebaseApp,
} = require("../config/firebase");

const router = express.Router();

const db = getFirestore(firebaseApp);

let pdfParse = null;

try {
  pdfParse = require("pdf-parse");
} catch (error) {
  console.warn(
    "pdf-parse is not available. Dropbox PDF text extraction will be unavailable."
  );
}


/*
|--------------------------------------------------------------------------
| GOOGLE DRIVE HELPERS
|--------------------------------------------------------------------------
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

const formatDriveTree = (
  node,
  depth = 0
) => {
  if (!node) {
    return "";
  }

  const indent =
    "  ".repeat(depth);

  let output = "";

  if (node.type === "folder") {
    output +=
      `${indent}📁 ${node.name}\n`;
  } else {
    output +=
      `${indent}📄 ${node.name}`;

    if (node.mimeType) {
      output +=
        ` — ${node.mimeType}`;
    }

    output += "\n";

    return output;
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      output +=
        formatDriveTree(
          child,
          depth + 1
        );
    }
  }

  return output;
};

const formatFolderContents = (
  folder,
  contents = []
) => {
  let output =
    `📁 ${folder.name}\n\n`;

  const folders =
    contents.filter(
      (item) =>
        item.mimeType ===
        "application/vnd.google-apps.folder"
    );

  const files =
    contents.filter(
      (item) =>
        item.mimeType !==
        "application/vnd.google-apps.folder"
    );

  if (folders.length > 0) {
    output +=
      "Folders:\n";

    folders.forEach(
      (item) => {
        output +=
          `- 📁 ${item.name}\n`;
      }
    );

    output += "\n";
  }

  if (files.length > 0) {
    output +=
      "Files:\n";

    files.forEach(
      (item) => {
        output +=
          `- 📄 ${item.name}\n`;
      }
    );
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

const getGoogleDriveConnector =
  async (uid) => {
    if (!uid) {
      return null;
    }

    const connectorRef =
      db
        .collection("users")
        .doc(uid)
        .collection("connectors")
        .doc("google-drive");

    const snapshot =
      await connectorRef.get();

    if (!snapshot.exists) {
      return null;
    }

    const data =
      snapshot.data();

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
| NOTION HELPERS
|--------------------------------------------------------------------------
*/

const getNotionConnector =
  async (uid) => {
    if (!uid) {
      return null;
    }

    const connectorRef =
      db
        .collection("users")
        .doc(uid)
        .collection("connectors")
        .doc("notion");

    const snapshot =
      await connectorRef.get();

    if (!snapshot.exists) {
      return null;
    }

    const data =
      snapshot.data();

    if (!data?.accessToken) {
      return null;
    }

    return data;
  };

const shouldSearchNotion =
  (message = "") => {
    const text =
      String(message)
        .toLowerCase()
        .trim();

    if (!text) {
      return false;
    }

    const notionTriggers = [
      "notion",
      "my notion",
      "in notion",
      "from notion",
      "my notion page",
      "my notion pages",
      "my notion document",
      "my notion documents",
      "my notion notes",
      "my notion note",
      "according to my notion",
      "according to the notion",
      "what does my notion",
      "check my notion",
      "read my notion",
      "find my notion",
      "look at my notion",
      "search my notion",
    ];

    return notionTriggers.some(
      (trigger) =>
        text.includes(trigger)
    );
  };


/*
|--------------------------------------------------------------------------
| GMAIL HELPERS
|--------------------------------------------------------------------------
*/

const getGmailConnector =
  async (uid) => {
    if (!uid) {
      return null;
    }

    const connectorRef =
      db
        .collection("users")
        .doc(uid)
        .collection("connectors")
        .doc("gmail");

    const snapshot =
      await connectorRef.get();

    if (!snapshot.exists) {
      return null;
    }

    const data =
      snapshot.data();

    if (
      !data?.accessToken &&
      !data?.refreshToken
    ) {
      return null;
    }

    return data;
  };

const shouldSearchGmail =
  (message = "") => {
    const text =
      String(message)
        .toLowerCase()
        .trim();

    if (!text) {
      return false;
    }

    const gmailTriggers = [
      "gmail",
      "my gmail",

      "my email",
      "my emails",
      "my mail",
      "my mails",

      "in gmail",
      "from gmail",

      "in my email",
      "in my emails",
      "in my inbox",

      "from my email",
      "from my emails",
      "from my inbox",

      "check my email",
      "check my emails",
      "check my inbox",

      "search my email",
      "search my emails",
      "search my inbox",

      "find in my email",
      "find in my emails",
      "find in my inbox",

      "look through my email",
      "look through my emails",
      "look through my inbox",

      "read my email",
      "read my emails",
      "read my inbox",
    ];

    return gmailTriggers.some(
      (trigger) =>
        text.includes(trigger)
    );
  };

/*
|--------------------------------------------------------------------------
| GITHUB HELPERS
|--------------------------------------------------------------------------
*/

const getGitHubConnector =
  async (uid) => {
    if (!uid) {
      return null;
    }

    const connectorRef =
      db
        .collection("users")
        .doc(uid)
        .collection("connectors")
        .doc("github");

    const snapshot =
      await connectorRef.get();

    if (!snapshot.exists) {
      return null;
    }

    const data =
      snapshot.data();

    if (!data?.accessToken) {
      return null;
    }

    return data;
  };

const shouldSearchGitHub =
  (message = "") => {
    const text =
      String(message)
        .toLowerCase()
        .trim();

    if (!text) {
      return false;
    }

    const githubTriggers = [
      "github",
      "my github",
      "in github",
      "from github",
      "my repository",
      "my repositories",
      "my repo",
      "my repos",
      "in my repository",
      "in my repositories",
      "in my repo",
      "in my repos",
      "from my repository",
      "from my repositories",
      "from my repo",
      "from my repos",
      "search my github",
      "search github",
      "find my github",
      "find my repository",
      "find my repositories",
      "find my repo",
      "look through my github",
      "look through my repository",
      "look through my repositories",
      "look through my repo",
      "my code",
      "my source code",
      "my project code",
    ];

    return githubTriggers.some(
      (trigger) =>
        text.includes(trigger)
    );
  };
/*
|--------------------------------------------------------------------------
| DROPBOX HELPERS
|--------------------------------------------------------------------------
*/

const mentionsDropbox =
  (message = "") => {
    const text =
      String(message)
        .toLowerCase();

    return (
      text.includes("dropbox") ||
      text.includes("drop box")
    );
  };

const shouldBrowseDropbox =
  (message = "") => {
    const text =
      String(message)
        .toLowerCase()
        .trim();

    if (
      !mentionsDropbox(text)
    ) {
      return false;
    }

    const browseTriggers = [
      "list",
      "show",
      "browse",
      "files",
      "folders",
      "everything",
      "all files",
      "all folders",
      "what do i have",
      "what's in",
      "whats in",
    ];

    return browseTriggers.some(
      (trigger) =>
        text.includes(trigger)
    );
  };

const shouldUseDropboxFolder =
  (message = "") => {
    const text =
      String(message)
        .toLowerCase()
        .trim();

    if (
      !mentionsDropbox(text) ||
      !text.includes("folder")
    ) {
      return false;
    }

    return [
      "check",
      "search",
      "find",
      "look",
      "inside",
      "in",
      "from",
      "show",
      "what",
    ].some(
      (trigger) =>
        text.includes(trigger)
    );
  };

const extractDropboxFolderName =
  (message = "") => {
    const text =
      String(message).trim();

    const patterns = [
      /\bin\s+(?:my\s+)?["']?([^"'?.]+?)["']?\s+folder\b/i,

      /\bfrom\s+(?:my\s+)?["']?([^"'?.]+?)["']?\s+folder\b/i,

      /\bcheck\s+(?:my\s+)?["']?([^"'?.]+?)["']?\s+folder\b/i,

      /\binside\s+(?:my\s+)?["']?([^"'?.]+?)["']?\s+folder\b/i,

      /\bthe\s+["']?([^"'?.]+?)["']?\s+folder\b/i,
    ];

    for (
      const pattern of patterns
    ) {
      const match =
        text.match(pattern);

      if (match?.[1]) {
        return match[1]
          .trim()
          .replace(
            /\s+/g,
            " "
          );
      }
    }

    return null;
  };

const formatDropboxTree =
  (
    node,
    depth = 0
  ) => {
    if (!node) {
      return "";
    }

    const indent =
      "  ".repeat(depth);

    if (
      node.type === "folder"
    ) {
      let output =
        `${indent}📁 ${node.name}\n`;

      if (
        Array.isArray(
          node.children
        )
      ) {
        for (
          const child of
            node.children
        ) {
          output +=
            formatDropboxTree(
              child,
              depth + 1
            );
        }
      }

      return output;
    }

    return (
      `${indent}📄 ${node.name}\n`
    );
  };

const formatDropboxFolderContents =
  (
    folder,
    contents = []
  ) => {
    let output =
      `📁 ${folder.name}\n\n`;

    const folders =
      contents.filter(
        (item) =>
          item.type ===
          "folder"
      );

    const files =
      contents.filter(
        (item) =>
          item.type ===
          "file"
      );

    if (
      folders.length > 0
    ) {
      output +=
        "Folders:\n";

      folders.forEach(
        (item) => {
          output +=
            `- 📁 ${item.name}\n`;
        }
      );

      output += "\n";
    }

    if (
      files.length > 0
    ) {
      output +=
        "Files:\n";

      files.forEach(
        (item) => {
          output +=
            `- 📄 ${item.name}\n`;
        }
      );
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

const getDropboxConnector =
  async (uid) => {
    if (!uid) {
      return null;
    }

    const connectorRef =
      db
        .collection("users")
        .doc(uid)
        .collection("connectors")
        .doc("dropbox");

    const snapshot =
      await connectorRef.get();

    if (!snapshot.exists) {
      return null;
    }

    const data =
      snapshot.data();

    if (
      !data?.accessToken &&
      !data?.refreshToken
    ) {
      return null;
    }

    return data;
  };

const extractDropboxFileText =
  async ({
    buffer,
    fileName = "",
  } = {}) => {
    if (
      !buffer ||
      !Buffer.isBuffer(buffer)
    ) {
      return null;
    }

    const extension =
      String(fileName)
        .toLowerCase()
        .split(".")
        .pop();

    if (
      extension === "pdf"
    ) {
      if (!pdfParse) {
        throw new Error(
          "PDF extraction requires pdf-parse."
        );
      }

      const parsed =
        await pdfParse(
          buffer
        );

      return (
        parsed?.text?.trim() ||
        null
      );
    }

    const textExtensions = [
      "txt",
      "md",
      "csv",
      "json",
      "js",
      "jsx",
      "ts",
      "tsx",
      "css",
      "html",
      "xml",
      "log",
    ];

    if (
      textExtensions.includes(
        extension
      )
    ) {
      return buffer
        .toString("utf8")
        .trim();
    }

    return null;
  };

const getRelevantDropboxContext =
  async ({
    connector,
    query,
    maxFiles = 3,
    maxCharsPerFile = 12000,
  } = {}) => {
    if (
      !connector ||
      !query?.trim()
    ) {
      return {
        context: null,
        sources: [],
      };
    }

    const files =
      await findRelevantDropboxFiles({
        accessToken:
          connector.accessToken,

        refreshToken:
          connector.refreshToken,

        query,

        maxFiles,
      });

    const sources = [];
    const contextParts = [];

    for (
      const file of files
    ) {
      try {
        const downloaded =
          await downloadDropboxFile({
            accessToken:
              connector.accessToken,

            refreshToken:
              connector.refreshToken,

            path:
              file.path,
          });

        const text =
          await extractDropboxFileText({
            buffer:
              downloaded.buffer,

            fileName:
              file.name,
          });

        sources.push({
          id:
            file.id,

          name:
            file.name,

          path:
            file.path,

          size:
            file.size ||
            null,

          modifiedTime:
            file.modifiedTime ||
            null,
        });

        if (!text) {
          continue;
        }

        contextParts.push(
          `DROPBOX SOURCE
Name: ${file.name}
Path: ${file.path}
Content:
${text.slice(
  0,
  maxCharsPerFile
)}`
        );
      } catch (
        fileError
      ) {
        console.error(
          `Dropbox file read error for "${file.name}":`,
          fileError
        );
      }
    }

    return {
      context:
        contextParts.length >
        0
          ? contextParts.join(
              "\n\n---\n\n"
            )
          : null,

      sources,
    };
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

      if (
        !Array.isArray(
          conversation
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Conversation must be an array.",
        });
      }

      if (
        conversation.length ===
        0
      ) {
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
              [
                "user",
                "assistant",
              ].includes(
                message.role
              ) &&
              typeof message.content ===
                "string"
          )
          .map(
            (message) => ({
              role:
                message.role,

              content:
                message.content.trim(),
            })
          )
          .filter(
            (message) =>
              message.content.length >
              0
          );

      if (
        cleanConversation.length ===
        0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No valid messages were provided.",
        });
      }

      const latestUserMessage =
        [
          ...cleanConversation,
        ]
          .reverse()
          .find(
            (message) =>
              message.role ===
              "user"
          );

      if (
        !latestUserMessage
      ) {
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
| LAWLITE DOMAIN GUARD
|--------------------------------------------------------------------------
|
| Lawlite is a specialized legal assistant.
|
| Clearly off-topic requests are refused BEFORE:
|
| - connector retrieval
| - web search
| - Sarvam
|
| This keeps Lawlite from behaving like a general-purpose chatbot.
|
*/

const lawliteClassification =
  classifyLawliteQuery(
    userMessage
  );

console.log(
  "🧠 Lawlite query classification:",
  {
    domain:
      lawliteClassification.domain,

    confidence:
      lawliteClassification.confidence,

    connectors:
      lawliteClassification.connectors,
  }
);


if (
  !lawliteClassification.allowed
) {
  console.log(
    "🛑 Lawlite refused off-topic request:",
    userMessage
  );

  return res.json({
    success: true,

    message:
      getLawliteRefusalMessage(),

    lawliteRefused:
      true,

    lawliteDomain:
      lawliteClassification.domain,

    lawliteConfidence:
      lawliteClassification.confidence,

    webSearchUsed:
      false,

    driveSearchUsed:
      false,

    driveSources: [],

    dropboxSearchUsed:
      false,

    dropboxSources: [],

    notionSearchUsed:
      false,

    notionSources: [],

    gmailSearchUsed:
      false,

    gmailSources: [],

    githubSearchUsed:
      false,

    githubSources: [],

    driveBrowseUsed:
      false,

    driveFolderUsed:
      false,

    dropboxBrowseUsed:
      false,

    dropboxFolderUsed:
      false,
  });
}

      /*
      |--------------------------------------------------------------------------
      | GET CONNECTORS
      |--------------------------------------------------------------------------
      */

      let driveConnector = null;
let dropboxConnector = null;
let notionConnector = null;
let gmailConnector = null;
let githubConnector = null;

      try {
        driveConnector =
          await getGoogleDriveConnector(
            req.user?.uid
          );
      } catch (error) {
        console.error(
          "Google Drive connector lookup error:",
          error
        );
      }

      try {
        dropboxConnector =
          await getDropboxConnector(
            req.user?.uid
          );
      } catch (error) {
        console.error(
          "Dropbox connector lookup error:",
          error
        );
      }

      try {
        notionConnector =
          await getNotionConnector(
            req.user?.uid
          );
      } catch (error) {
        console.error(
          "Notion connector lookup error:",
          error
        );
      }

      try {
        gmailConnector =
          await getGmailConnector(
            req.user?.uid
          );
      } catch (error) {
        console.error(
          "Gmail connector lookup error:",
          error
        );
      }
      try {
  githubConnector =
    await getGitHubConnector(
      req.user?.uid
    );
} catch (error) {
  console.error(
    "GitHub connector lookup error:",
    error
  );
}


      /*
      |--------------------------------------------------------------------------
      | DROPBOX BROWSE
      |--------------------------------------------------------------------------
      */

      if (
        shouldBrowseDropbox(
          userMessage
        )
      ) {
        console.log(
          "📦 Lawlite Dropbox browse:",
          userMessage
        );

        if (
          !dropboxConnector
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Dropbox is not connected. Please connect your Dropbox first.",
          });
        }

        try {
          const dropboxTree =
            await listDropboxTree({
              accessToken:
                dropboxConnector.accessToken,

              refreshToken:
                dropboxConnector.refreshToken,

              maxEntries:
                500,
            });

          const dropboxMessage =
            formatDropboxTree(
              dropboxTree.tree
            );

          return res.json({
            success: true,

            message:
              dropboxMessage ||
              "I couldn't find any files or folders in your Dropbox.",

            dropboxBrowseUsed:
              true,

            dropboxTotalEntries:
              dropboxTree.totalEntries,

            dropboxSources:
              [],
          });
        } catch (error) {
          console.error(
            "Dropbox browse error:",
            error
          );

          return res.status(500).json({
            success: false,
            message:
              "I couldn't browse your Dropbox right now.",
          });
        }
      }


      /*
      |--------------------------------------------------------------------------
      | DROPBOX FOLDER
      |--------------------------------------------------------------------------
      */

      if (
        shouldUseDropboxFolder(
          userMessage
        )
      ) {
        const folderName =
          extractDropboxFolderName(
            userMessage
          );

        console.log(
          "📦 Lawlite Dropbox folder request:",
          userMessage
        );

        console.log(
          "📦 Extracted Dropbox folder:",
          folderName
        );

        if (
          !dropboxConnector
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Dropbox is not connected. Please connect your Dropbox first.",
          });
        }

        if (
          !folderName
        ) {
          return res.json({
            success: true,
            message:
              "I couldn't determine which Dropbox folder you meant. Tell me the folder name.",
            dropboxFolderUsed:
              true,
            dropboxSources:
              [],
          });
        }

        try {
          const folders =
            await findDropboxFoldersByName({
              accessToken:
                dropboxConnector.accessToken,

              refreshToken:
                dropboxConnector.refreshToken,

              folderName,
            });

          if (
            folders.length ===
            0
          ) {
            return res.json({
              success: true,
              message:
                `I couldn't find a folder named "${folderName}" in your Dropbox.`,
              dropboxFolderUsed:
                true,
              dropboxSources:
                [],
            });
          }

          const folder =
            folders[0];

          const contents =
            await listDropboxFolderContents({
              accessToken:
                dropboxConnector.accessToken,

              refreshToken:
                dropboxConnector.refreshToken,

              folderPath:
                folder.path,
            });

          const folderMessage =
            formatDropboxFolderContents(
              folder,
              contents
            );

          return res.json({
            success: true,

            message:
              folderMessage,

            dropboxFolderUsed:
              true,

            dropboxFolder: {
              id:
                folder.id,

              name:
                folder.name,

              path:
                folder.path,
            },

            dropboxSources:
              contents.map(
                (item) => ({
                  id:
                    item.id,

                  name:
                    item.name,

                  type:
                    item.type,

                  path:
                    item.path,

                  size:
                    item.size ||
                    null,

                  modifiedTime:
                    item.modifiedTime ||
                    null,
                })
              ),
          });
        } catch (error) {
          console.error(
            "Dropbox folder error:",
            error
          );

          return res.status(500).json({
            success: false,
            message:
              "I couldn't access that Dropbox folder right now.",
          });
        }
      }


      /*
      |--------------------------------------------------------------------------
      | GOOGLE DRIVE BROWSE
      |--------------------------------------------------------------------------
      */

      if (
        shouldBrowseDrive(
          userMessage
        )
      ) {
        console.log(
          "📁 Lawlite Drive browse:",
          userMessage
        );

        if (
          !driveConnector
        ) {
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
                driveConnector.accessToken,

              refreshToken:
                driveConnector.refreshToken,

              maxFiles:
                500,
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

            driveBrowseUsed:
              true,

            driveTotalFiles:
              driveTree.totalFiles,

            driveSources:
              [],
          });
        } catch (error) {
          console.error(
            "Google Drive browse error:",
            error
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
      | GOOGLE DRIVE FOLDER
      |--------------------------------------------------------------------------
      */

      if (
        shouldUseDriveFolder(
          userMessage
        )
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
          driveConnector
        ) {
          try {
            const folders =
              await findDriveFoldersByName({
                accessToken:
                  driveConnector.accessToken,

                refreshToken:
                  driveConnector.refreshToken,

                folderName,
              });

            if (
              folders.length ===
              0
            ) {
              return res.json({
                success: true,

                message:
                  `I couldn't find a folder named "${folderName}" in your Google Drive.`,

                driveFolderUsed:
                  true,

                driveSources:
                  [],
              });
            }

            const folder =
              folders[0];

            const contents =
              await listDriveFolderContents({
                accessToken:
                  driveConnector.accessToken,

                refreshToken:
                  driveConnector.refreshToken,

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

              driveFolderUsed:
                true,

              driveFolder: {
                id:
                  folder.id,

                name:
                  folder.name,
              },

              driveSources:
                contents.map(
                  (item) => ({
                    id:
                      item.id,

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
          } catch (error) {
            console.error(
              "Google Drive folder error:",
              error
            );

            return res.status(500).json({
              success: false,
              message:
                "I couldn't access that Google Drive folder right now.",
            });
          }
        }

        if (
          !driveConnector
        ) {
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

      if (
        needsWebSearch
      ) {
        console.log(
          "🌐 Lawlite web search:",
          userMessage
        );

        try {
          const searchResults =
            await searchWeb({
              query:
                userMessage,

              num:
                5,
            });

          const organicResults =
            searchResults?.organic ||
            [];

          webContext =
            organicResults
              .map(
                (
                  result,
                  index
                ) =>
                  `SOURCE ${index + 1}
Title: ${result.title || ""}
URL: ${result.link || ""}
Snippet: ${result.snippet || ""}`
              )
              .join(
                "\n\n"
              );

          if (
            !webContext
          ) {
            webContext =
              "No useful web results were found.";
          }
        } catch (error) {
          console.error(
            "Web search error:",
            error
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

      if (
        needsDriveSearch
      ) {
        console.log(
          "📁 Lawlite Drive search:",
          userMessage
        );

        if (
          driveConnector
        ) {
          try {
            const driveResult =
              await getRelevantDriveContext({
                accessToken:
                  driveConnector.accessToken,

                refreshToken:
                  driveConnector.refreshToken,

                query:
                  userMessage,

                maxFiles:
                  3,

                maxCharsPerFile:
                  12000,
              });

            driveContext =
              driveResult?.context ||
              null;

            driveSources =
              driveResult?.sources ||
              [];

            console.log(
              `📁 Drive sources found: ${driveSources.length}`
            );

            if (
              driveSources.length >
              0
            ) {
              console.log(
                "📄 Drive sources:",
                driveSources.map(
                  (source) =>
                    source.name
                )
              );
            }
          } catch (error) {
            console.error(
              "Google Drive context error:",
              error
            );

            driveContext =
              null;

            driveSources =
              [];
          }
        } else {
          console.log(
            "📁 Google Drive is not connected."
          );
        }
      }


      /*
      |--------------------------------------------------------------------------
      | DROPBOX DOCUMENT SEARCH
      |--------------------------------------------------------------------------
      */

      let dropboxContext = null;
      let dropboxSources = [];

      if (
        mentionsDropbox(
          userMessage
        ) &&
        !shouldBrowseDropbox(
          userMessage
        ) &&
        !shouldUseDropboxFolder(
          userMessage
        )
      ) {
        console.log(
          "📦 Lawlite Dropbox document search:",
          userMessage
        );

        if (
          dropboxConnector
        ) {
          try {
            const dropboxResult =
              await getRelevantDropboxContext({
                connector:
                  dropboxConnector,

                query:
                  userMessage,

                maxFiles:
                  3,

                maxCharsPerFile:
                  12000,
              });

            dropboxContext =
              dropboxResult?.context ||
              null;

            dropboxSources =
              dropboxResult?.sources ||
              [];

            console.log(
              `📦 Dropbox sources found: ${dropboxSources.length}`
            );

            if (
              dropboxSources.length >
              0
            ) {
              console.log(
                "📄 Dropbox sources:",
                dropboxSources.map(
                  (source) =>
                    source.name
                )
              );
            }
          } catch (error) {
            console.error(
              "Dropbox context error:",
              error
            );

            dropboxContext =
              null;

            dropboxSources =
              [];
          }
        } else {
          console.log(
            "📦 Dropbox is not connected."
          );
        }
      }


      /*
      |--------------------------------------------------------------------------
      | NOTION DOCUMENT SEARCH
      |--------------------------------------------------------------------------
      */

      const needsNotionSearch =
        shouldSearchNotion(
          userMessage
        );

      let notionContext = null;
      let notionSources = [];

      if (
        needsNotionSearch
      ) {
        console.log(
          "📝 Lawlite Notion search:",
          userMessage
        );

        if (
          notionConnector
        ) {
          try {
            const notionResult =
              await getRelevantNotionContext({
                accessToken:
                  notionConnector.accessToken,

                query:
                  userMessage,

                maxPages:
                  3,

                maxCharsPerPage:
                  12000,
              });

            notionContext =
              notionResult?.context ||
              null;

            notionSources =
              notionResult?.sources ||
              [];

            console.log(
              `📝 Notion sources found: ${notionSources.length}`
            );

            if (
              notionSources.length >
              0
            ) {
              console.log(
                "📄 Notion sources:",
                notionSources.map(
                  (source) =>
                    source.name
                )
              );
            }
          } catch (error) {
            console.error(
              "Notion context error:",
              error
            );

            notionContext =
              null;

            notionSources =
              [];
          }
        } else {
          console.log(
            "📝 Notion is not connected."
          );
        }
      }


      /*
      |--------------------------------------------------------------------------
      | GMAIL EMAIL SEARCH
      |--------------------------------------------------------------------------
      */

      const needsGmailSearch =
        shouldSearchGmail(
          userMessage
        );

      let gmailContext = null;
      let gmailSources = [];

      if (
        needsGmailSearch
      ) {
        console.log(
          "📧 Lawlite Gmail search:",
          userMessage
        );

        if (
          gmailConnector
        ) {
          try {
            const gmailResult =
              await getRelevantGmailContext({
                connector:
                  gmailConnector,

                query:
                  userMessage,

                maxMessages:
                  5,

                maxCharsPerMessage:
                  7000,
              });

            gmailContext =
              gmailResult?.context ||
              null;

            gmailSources =
              gmailResult?.sources ||
              [];

            console.log(
              `📧 Gmail sources found: ${gmailSources.length}`
            );

            if (
              gmailSources.length >
              0
            ) {
              console.log(
                "📨 Gmail sources:",
                gmailSources.map(
                  (source) =>
                    source.subject
                )
              );
            }
          } catch (error) {
            console.error(
              "Gmail context error:",
              error
            );

            gmailContext =
              null;

            gmailSources =
              [];
          }
        } else {
          console.log(
            "📧 Gmail is not connected."
          );
        }
      }

/*
|--------------------------------------------------------------------------
| GITHUB SEARCH
|--------------------------------------------------------------------------
*/

const needsGitHubSearch =
  shouldSearchGitHub(
    userMessage
  );

let githubContext = null;
let githubSources = [];

if (
  needsGitHubSearch
) {
  console.log(
    "🐙 Lawlite GitHub search:",
    userMessage
  );

  if (
    githubConnector
  ) {
    try {
      const githubResult =
        await getRelevantGitHubContext({
          accessToken:
            githubConnector.accessToken,

          query:
            userMessage,

          maxRepositories:
            5,

          maxFiles:
            8,

          maxCharsPerFile:
            12000,
        });

      githubContext =
        githubResult?.context ||
        null;

      githubSources =
        githubResult?.sources ||
        [];

      console.log(
        `🐙 GitHub sources found: ${githubSources.length}`
      );

      if (
        githubSources.length >
        0
      ) {
        console.log(
          "📂 GitHub sources:",
          githubSources.map(
            (source) =>
              source.name ||
              source.path ||
              source.repository
          )
        );
      }
    } catch (error) {
      console.error(
        "GitHub context error:",
        error
      );

      githubContext = null;
      githubSources = [];
    }
  } else {
    console.log(
      "🐙 GitHub is not connected."
    );
  }
}
      /*
      |--------------------------------------------------------------------------
      | COMBINE PRIVATE CONTEXT
      |--------------------------------------------------------------------------
      */

      const combinedPrivateDocumentContext =
        [
          driveContext
            ? `GOOGLE DRIVE CONTEXT\n${driveContext}`
            : null,

          dropboxContext
            ? `DROPBOX CONTEXT\n${dropboxContext}`
            : null,

          notionContext
            ? `NOTION CONTEXT\n${notionContext}`
            : null,

          gmailContext
            ? `GMAIL CONTEXT\n${gmailContext}`
            : null,
                githubContext
      ? `GITHUB CONTEXT\n${githubContext}`
      : null,
        ]
          .filter(Boolean)
          .join(
            "\n\n====================\n\n"
          ) || null;


      /*
      |--------------------------------------------------------------------------
      | SEND EVERYTHING TO SARVAM
      |--------------------------------------------------------------------------
      */

      const answer =
        await generateChatResponse({
          conversation:
            cleanConversation,

          webResults:
            webContext,

          /*
          |--------------------------------------------------------------------------
          | IMPORTANT
          |--------------------------------------------------------------------------
          |
          | Sarvam already accepts this field as the private
          | document/context channel.
          |
          | Gmail is now included inside it alongside:
          | Google Drive
          | Dropbox
          | Notion
          |
          */

          driveContext:
            combinedPrivateDocumentContext,
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

        dropboxSearchUsed:
          mentionsDropbox(
            userMessage
          ) &&
          dropboxSources.length >
            0,

        dropboxSources:
          dropboxSources.map(
            (file) => ({
              id:
                file.id,

              name:
                file.name,

              path:
                file.path,

              size:
                file.size ||
                null,

              modifiedTime:
                file.modifiedTime ||
                null,
            })
          ),

        notionSearchUsed:
          needsNotionSearch &&
          notionSources.length >
            0,

        notionSources:
          notionSources.map(
            (page) => ({
              id:
                page.id,

              name:
                page.name,

              url:
                page.url ||
                null,

              lastEditedTime:
                page.lastEditedTime ||
                null,
            })
          ),

        gmailSearchUsed:
          needsGmailSearch &&
          gmailSources.length >
            0,

        gmailSources:
          gmailSources.map(
            (email) => ({
              id:
                email.id,

              threadId:
                email.threadId ||
                null,

              subject:
                email.subject,

              from:
                email.from,

              date:
                email.date ||
                null,

              snippet:
                email.snippet ||
                "",

              attachments:
                email.attachments ||
                [],
            })
          ),
          githubSearchUsed:
  needsGitHubSearch &&
  githubSources.length > 0,

githubSources:
  githubSources.map(
    (source) => ({
      id:
        source.id ||
        null,

      name:
        source.name ||
        null,

      path:
        source.path ||
        null,

      repository:
        source.repository ||
        null,

      url:
        source.url ||
        source.html_url ||
        null,
    })
  ),

        driveBrowseUsed:
          false,

        driveFolderUsed:
          false,

        dropboxBrowseUsed:
          false,

        dropboxFolderUsed:
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
        typeof message !==
          "string"
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
        typeof query !==
          "string"
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

          num:
            5,
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