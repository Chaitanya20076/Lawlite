const { google } = require("googleapis");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const GOOGLE_DRIVE_SCOPE =
  "https://www.googleapis.com/auth/drive.readonly";


/*
|--------------------------------------------------------------------------
| GOOGLE OAUTH
|--------------------------------------------------------------------------
*/

/**
 * Create Google OAuth client.
 */
const createOAuthClient = () => {
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_REDIRECT_URI
  ) {
    throw new Error(
      "Google OAuth environment variables are not configured."
    );
  }

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};


/**
 * Generate Google authorization URL.
 */
const getGoogleAuthorizationUrl = (state) => {
  const oauth2Client = createOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GOOGLE_DRIVE_SCOPE],
    state,
  });
};


/**
 * Exchange authorization code for OAuth tokens.
 */
const exchangeCodeForTokens = async (code) => {
  if (!code) {
    throw new Error(
      "Google authorization code is missing."
    );
  }

  const oauth2Client = createOAuthClient();

  const { tokens } =
    await oauth2Client.getToken(code);

  if (!tokens) {
    throw new Error(
      "Google did not return OAuth tokens."
    );
  }

  return tokens;
};


/**
 * Create authenticated Google Drive client.
 */
const getDriveClient = ({
  accessToken,
  refreshToken,
}) => {
  if (!accessToken && !refreshToken) {
    throw new Error(
      "Google Drive authentication tokens are missing."
    );
  }

  const oauth2Client =
    createOAuthClient();

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.drive({
    version: "v3",
    auth: oauth2Client,
  });
};


/*
|--------------------------------------------------------------------------
| DRIVE QUERY HELPERS
|--------------------------------------------------------------------------
*/

/**
 * Escape a value before using it in a Google Drive query.
 */
const escapeDriveQueryValue = (
  value = ""
) => {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
};


/*
|--------------------------------------------------------------------------
| SEARCH TERM EXTRACTION
|--------------------------------------------------------------------------
*/

/**
 * Common words that don't provide much value
 * when searching Google Drive.
 */
const DRIVE_STOP_WORDS = new Set([
  "a",
  "about",
  "according",
  "after",
  "again",
  "all",
  "am",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "before",
  "between",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "get",
  "give",
  "has",
  "have",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "many",
  "me",
  "my",
  "of",
  "on",
  "or",
  "per",
  "please",
  "should",
  "tell",
  "that",
  "the",
  "their",
  "them",
  "there",
  "these",
  "this",
  "to",
  "under",
  "was",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "would",
  "you",
  "your",

  "document",
  "documents",
  "file",
  "files",
  "drive",
  "google",
  "entitled",
]);


/**
 * Convert a natural-language question into useful
 * Drive search keywords.
 *
 * Example:
 *
 * "According to my leave policy document,
 * how many paid leave days am I entitled to per year?"
 *
 * →
 *
 * ["leave", "policy", "paid", "days", "year"]
 */
const extractDriveSearchTerms = (
  query = ""
) => {
  const normalized = String(query)
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return [];
  }

  const rawWords =
    normalized
      .split(" ")
      .map((word) => word.trim())
      .filter(Boolean);

  const uniqueWords = [];

  for (const word of rawWords) {
    if (
      word.length < 3 ||
      DRIVE_STOP_WORDS.has(word) ||
      uniqueWords.includes(word)
    ) {
      continue;
    }

    uniqueWords.push(word);
  }

  return uniqueWords.slice(0, 8);
};


/*
|--------------------------------------------------------------------------
| BASIC DRIVE FILE LISTING
|--------------------------------------------------------------------------
*/

/**
 * List recent files from Drive.
 */
const listDriveFiles = async ({
  accessToken,
  refreshToken,
  pageSize = 20,
} = {}) => {
  const drive =
    getDriveClient({
      accessToken,
      refreshToken,
    });

  const response =
    await drive.files.list({
      pageSize,

      q:
        "trashed = false",

      fields:
        "files(id,name,mimeType,size,modifiedTime,webViewLink,description,parents)",

      orderBy:
        "modifiedTime desc",

      spaces:
        "drive",

      includeItemsFromAllDrives:
        true,

      supportsAllDrives:
        true,
    });

  return (
    response?.data?.files ||
    []
  );
};


/*
|--------------------------------------------------------------------------
| DRIVE CONTENT SEARCH
|--------------------------------------------------------------------------
*/

/**
 * Search Drive using one keyword
 * across file contents.
 */
const searchDriveFiles = async ({
  accessToken,
  refreshToken,
  query,
  pageSize = 10,
} = {}) => {
  const drive =
    getDriveClient({
      accessToken,
      refreshToken,
    });

  const cleanQuery =
    escapeDriveQueryValue(query);

  if (!cleanQuery) {
    return [];
  }

  const response =
    await drive.files.list({
      pageSize,

      q:
        `trashed = false and fullText contains '${cleanQuery}'`,

      fields:
        "files(id,name,mimeType,size,modifiedTime,webViewLink,description,parents)",

      orderBy:
        "modifiedTime desc",

      spaces:
        "drive",

      includeItemsFromAllDrives:
        true,

      supportsAllDrives:
        true,
    });

  return (
    response?.data?.files ||
    []
  );
};


/**
 * Search Drive using one keyword
 * in filenames.
 */
const searchDriveFilesByName = async ({
  accessToken,
  refreshToken,
  query,
  pageSize = 10,
} = {}) => {
  const drive =
    getDriveClient({
      accessToken,
      refreshToken,
    });

  const cleanQuery =
    escapeDriveQueryValue(query);

  if (!cleanQuery) {
    return [];
  }

  const response =
    await drive.files.list({
      pageSize,

      q:
        `trashed = false and name contains '${cleanQuery}'`,

      fields:
        "files(id,name,mimeType,size,modifiedTime,webViewLink,description,parents)",

      orderBy:
        "modifiedTime desc",

      spaces:
        "drive",

      includeItemsFromAllDrives:
        true,

      supportsAllDrives:
        true,
    });

  return (
    response?.data?.files ||
    []
  );
};


/*
|--------------------------------------------------------------------------
| FOLDER SEARCH
|--------------------------------------------------------------------------
*/

/**
 * Find folders by name.
 *
 * Example:
 *
 * "Check my Certifications folder"
 *
 * → finds the actual Google Drive folder.
 */
const findDriveFoldersByName = async ({
  accessToken,
  refreshToken,
  folderName,
  pageSize = 20,
} = {}) => {
  const drive =
    getDriveClient({
      accessToken,
      refreshToken,
    });

  const cleanName =
    escapeDriveQueryValue(folderName);

  if (!cleanName) {
    return [];
  }

  const response =
    await drive.files.list({
      pageSize,

      q:
        `trashed = false and ` +
        `mimeType = 'application/vnd.google-apps.folder' and ` +
        `name contains '${cleanName}'`,

      fields:
        "files(id,name,mimeType,modifiedTime,webViewLink,parents)",

      orderBy:
        "name",

      spaces:
        "drive",

      includeItemsFromAllDrives:
        true,

      supportsAllDrives:
        true,
    });

  return (
    response?.data?.files ||
    []
  );
};


/**
 * List files/folders directly inside
 * a specific folder.
 */
const listDriveFolderContents = async ({
  accessToken,
  refreshToken,
  folderId,
  pageSize = 100,
} = {}) => {
  const drive =
    getDriveClient({
      accessToken,
      refreshToken,
    });

  if (!folderId) {
    throw new Error(
      "Drive folder ID is required."
    );
  }

  const response =
    await drive.files.list({
      pageSize,

      q:
        `'${folderId}' in parents and trashed = false`,

      fields:
        "files(id,name,mimeType,size,modifiedTime,webViewLink,description,parents)",

      orderBy:
        "folder,name",

      spaces:
        "drive",

      includeItemsFromAllDrives:
        true,

      supportsAllDrives:
        true,
    });

  return (
    response?.data?.files ||
    []
  );
};


/*
|--------------------------------------------------------------------------
| FILE METADATA
|--------------------------------------------------------------------------
*/

/**
 * Get metadata for a specific Drive file.
 */
const getDriveFileMetadata = async ({
  accessToken,
  refreshToken,
  fileId,
} = {}) => {
  if (!fileId) {
    throw new Error(
      "Google Drive file ID is required."
    );
  }

  const drive =
    getDriveClient({
      accessToken,
      refreshToken,
    });

  const response =
    await drive.files.get({
      fileId,

      fields:
        "id,name,mimeType,size,modifiedTime,webViewLink,description,parents",
    });

  return response?.data;
};


/*
|--------------------------------------------------------------------------
| GOOGLE DOCS
|--------------------------------------------------------------------------
*/

/**
 * Export a Google Docs document as plain text.
 */
const exportGoogleDocAsText = async ({
  accessToken,
  refreshToken,
  fileId,
} = {}) => {
  const drive =
    getDriveClient({
      accessToken,
      refreshToken,
    });

  const response =
    await drive.files.export({
      fileId,
      mimeType:
        "text/plain",
    });

  return (
    response?.data ||
    ""
  );
};


/*
|--------------------------------------------------------------------------
| FILE DOWNLOAD
|--------------------------------------------------------------------------
*/

/**
 * Download a normal Drive file.
 */
const downloadDriveFile = async ({
  accessToken,
  refreshToken,
  fileId,
} = {}) => {
  const drive =
    getDriveClient({
      accessToken,
      refreshToken,
    });

  if (!fileId) {
    throw new Error(
      "Google Drive file ID is required."
    );
  }

  const response =
    await drive.files.get(
      {
        fileId,
        alt: "media",
      },
      {
        responseType:
          "arraybuffer",
      }
    );

  return Buffer.from(
    response.data
  );
};


/*
|--------------------------------------------------------------------------
| TEXT EXTRACTION
|--------------------------------------------------------------------------
*/

/**
 * Extract text from PDF.
 *
 * Requires:
 *
 * npm install pdf-parse@1.1.1
 */
const extractPdfText = async (
  buffer
) => {
  try {
    const pdfParse =
      require("pdf-parse");

    if (
      typeof pdfParse !==
      "function"
    ) {
      throw new Error(
        "Installed pdf-parse version does not expose the expected parser function."
      );
    }

    const result =
      await pdfParse(buffer);

    return (
      result?.text ||
      ""
    );
  } catch (error) {
    console.error(
      "PDF text extraction failed:",
      error.message
    );

    return "";
  }
};


/**
 * Extract text from DOCX.
 *
 * Requires:
 *
 * npm install mammoth
 */
const extractDocxText = async (
  buffer
) => {
  try {
    const mammoth =
      require("mammoth");

    const result =
      await mammoth.extractRawText({
        buffer,
      });

    return (
      result?.value ||
      ""
    );
  } catch (error) {
    console.error(
      "DOCX text extraction failed:",
      error.message
    );

    return "";
  }
};


/**
 * Extract text from plain text files.
 */
const extractPlainText = (
  buffer
) => {
  try {
    return buffer.toString(
      "utf8"
    );
  } catch (error) {
    console.error(
      "Plain-text extraction failed:",
      error.message
    );

    return "";
  }
};


/*
|--------------------------------------------------------------------------
| READ DRIVE FILE
|--------------------------------------------------------------------------
*/

/**
 * Get readable text from a Drive file.
 */
const getDriveFileText = async ({
  accessToken,
  refreshToken,
  file,
} = {}) => {
  if (!file?.id) {
    return "";
  }

  const mimeType =
    file.mimeType ||
    "";

  const fileName =
    String(
      file.name || ""
    ).toLowerCase();


  /*
  |--------------------------------------------------------------------------
  | GOOGLE DOCS
  |--------------------------------------------------------------------------
  */

  if (
    mimeType ===
    "application/vnd.google-apps.document"
  ) {
    return exportGoogleDocAsText({
      accessToken,
      refreshToken,
      fileId: file.id,
    });
  }


  /*
  |--------------------------------------------------------------------------
  | GOOGLE SHEETS
  |--------------------------------------------------------------------------
  */

  if (
    mimeType ===
    "application/vnd.google-apps.spreadsheet"
  ) {
    try {
      const drive =
        getDriveClient({
          accessToken,
          refreshToken,
        });

      const response =
        await drive.files.export({
          fileId: file.id,

          mimeType:
            "text/csv",
        });

      return (
        response?.data ||
        ""
      );
    } catch (error) {
      console.error(
        `Google Sheets extraction failed for "${file.name}":`,
        error.message
      );

      return "";
    }
  }


  /*
  |--------------------------------------------------------------------------
  | PLAIN TEXT / CSV / JSON / MARKDOWN
  |--------------------------------------------------------------------------
  */

  if (
    mimeType.startsWith(
      "text/"
    ) ||
    mimeType ===
      "application/json" ||
    fileName.endsWith(
      ".txt"
    ) ||
    fileName.endsWith(
      ".csv"
    ) ||
    fileName.endsWith(
      ".md"
    ) ||
    fileName.endsWith(
      ".json"
    )
  ) {
    const buffer =
      await downloadDriveFile({
        accessToken,
        refreshToken,
        fileId: file.id,
      });

    return extractPlainText(
      buffer
    );
  }


  /*
  |--------------------------------------------------------------------------
  | PDF
  |--------------------------------------------------------------------------
  */

  if (
    mimeType ===
      "application/pdf" ||
    fileName.endsWith(
      ".pdf"
    )
  ) {
    const buffer =
      await downloadDriveFile({
        accessToken,
        refreshToken,
        fileId: file.id,
      });

    return extractPdfText(
      buffer
    );
  }


  /*
  |--------------------------------------------------------------------------
  | DOCX
  |--------------------------------------------------------------------------
  */

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(
      ".docx"
    )
  ) {
    const buffer =
      await downloadDriveFile({
        accessToken,
        refreshToken,
        fileId: file.id,
      });

    return extractDocxText(
      buffer
    );
  }


  return "";
};


/*
|--------------------------------------------------------------------------
| RELEVANT DOCUMENT SEARCH
|--------------------------------------------------------------------------
*/

/**
 * Search Drive intelligently using multiple keywords.
 *
 * Results are scored:
 *
 * Filename match  = +3
 * Content match   = +2
 */
const findRelevantDriveFiles = async ({
  accessToken,
  refreshToken,
  query,
  maxFiles = 5,
} = {}) => {
  const searchTerms =
    extractDriveSearchTerms(
      query
    );

  console.log(
    "📁 Drive search terms:",
    searchTerms
  );

  if (
    searchTerms.length === 0
  ) {
    return [];
  }


  const matches =
    new Map();


  for (const term of searchTerms) {
    try {
      const [
        contentResults,
        nameResults,
      ] = await Promise.all([
        searchDriveFiles({
          accessToken,
          refreshToken,
          query: term,
          pageSize: 10,
        }),

        searchDriveFilesByName({
          accessToken,
          refreshToken,
          query: term,
          pageSize: 10,
        }),
      ]);


      /*
      |--------------------------------------------------------------------------
      | CONTENT MATCHES
      |--------------------------------------------------------------------------
      */

      for (
        const file of contentResults
      ) {
        if (!file?.id) {
          continue;
        }

        const existing =
          matches.get(
            file.id
          );

        matches.set(
          file.id,
          {
            file,

            score:
              (existing?.score || 0) +
              2,

            matchedTerms: [
              ...(existing?.matchedTerms || []),
              term,
            ],
          }
        );
      }


      /*
      |--------------------------------------------------------------------------
      | NAME MATCHES
      |--------------------------------------------------------------------------
      */

      for (
        const file of nameResults
      ) {
        if (!file?.id) {
          continue;
        }

        const existing =
          matches.get(
            file.id
          );

        matches.set(
          file.id,
          {
            file,

            score:
              (existing?.score || 0) +
              3,

            matchedTerms: [
              ...(existing?.matchedTerms || []),
              term,
            ],
          }
        );
      }
    } catch (error) {
      console.error(
        `Drive search failed for "${term}":`,
        error.message
      );
    }
  }


  /*
  |--------------------------------------------------------------------------
  | RECENT FILE FALLBACK
  |--------------------------------------------------------------------------
  */

  if (
    matches.size === 0
  ) {
    console.log(
      "📁 Keyword search found nothing. Trying recent-file fallback..."
    );

    try {
      const recentFiles =
        await listDriveFiles({
          accessToken,
          refreshToken,
          pageSize: 50,
        });


      for (
        const file of recentFiles
      ) {
        const fileName =
          String(
            file?.name || ""
          ).toLowerCase();

        let score = 0;

        const matchedTerms =
          [];


        for (
          const term of searchTerms
        ) {
          if (
            fileName.includes(
              term
            )
          ) {
            score += 4;

            matchedTerms.push(
              term
            );
          }
        }


        if (
          score > 0 &&
          file?.id
        ) {
          matches.set(
            file.id,
            {
              file,

              score,

              matchedTerms,
            }
          );
        }
      }
    } catch (error) {
      console.error(
        "Drive recent-file fallback failed:",
        error.message
      );
    }
  }


  /*
  |--------------------------------------------------------------------------
  | SORT
  |--------------------------------------------------------------------------
  */

  const sortedMatches =
    [...matches.values()]
      .sort(
        (a, b) => {
          if (
            b.score !==
            a.score
          ) {
            return (
              b.score -
              a.score
            );
          }

          const aTime =
            new Date(
              a.file?.modifiedTime ||
                0
            ).getTime();

          const bTime =
            new Date(
              b.file?.modifiedTime ||
                0
            ).getTime();

          return (
            bTime -
            aTime
          );
        }
      )
      .slice(
        0,
        maxFiles
      );


  console.log(
    "📁 Relevant Drive files:",
    sortedMatches.map(
      (item) => ({
        name:
          item.file?.name,

        score:
          item.score,

        matchedTerms:
          [
            ...new Set(
              item.matchedTerms ||
                []
            ),
          ],
      })
    )
  );


  return sortedMatches.map(
    (item) =>
      item.file
  );
};


/*
|--------------------------------------------------------------------------
| DRIVE DOCUMENT CONTEXT
|--------------------------------------------------------------------------
*/

/**
 * Build private AI context from relevant
 * Google Drive documents.
 */
const getRelevantDriveContext = async ({
  accessToken,
  refreshToken,
  query,
  maxFiles = 3,
  maxCharsPerFile = 12000,
} = {}) => {
  const files =
    await findRelevantDriveFiles({
      accessToken,
      refreshToken,
      query,
      maxFiles,
    });


  if (
    !files.length
  ) {
    return {
      context: "",
      sources: [],
    };
  }


  const contextParts =
    [];

  const sources =
    [];


  for (
    const file of files
  ) {
    try {
      const text =
        await getDriveFileText({
          accessToken,
          refreshToken,
          file,
        });


      const cleanText =
        String(text || "")
          .replace(
            /\r\n/g,
            "\n"
          )
          .replace(
            /\n{3,}/g,
            "\n\n"
          )
          .trim();


      if (
        !cleanText
      ) {
        console.log(
          `📄 No readable text found in: ${file.name}`
        );

        continue;
      }


      const limitedText =
        cleanText.slice(
          0,
          maxCharsPerFile
        );


      contextParts.push(
        [
          `DRIVE SOURCE: ${file.name}`,

          `MIME TYPE: ${
            file.mimeType ||
            "unknown"
          }`,

          `MODIFIED: ${
            file.modifiedTime ||
            "unknown"
          }`,

          `PATH: ${
            file.path ||
            "My Drive"
          }`,

          "",

          limitedText,
        ].join("\n")
      );


      sources.push({
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

        path:
          file.path ||
          null,
      });


      console.log(
        `📄 Drive document loaded: ${file.name}`
      );
    } catch (error) {
      console.error(
        `Failed reading Drive file "${file.name}":`,
        error.message
      );
    }
  }


  return {
    context:
      contextParts.join(
        "\n\n---\n\n"
      ),

    sources,
  };
};


/*
|--------------------------------------------------------------------------
| RECURSIVE DRIVE TREE
|--------------------------------------------------------------------------
*/

/**
 * Recursively list the user's Google Drive hierarchy.
 *
 * Returns metadata only.
 *
 * It does NOT download document contents.
 */
const listDriveTree = async ({
  accessToken,
  refreshToken,
  maxFiles = 500,
} = {}) => {
  const drive =
    getDriveClient({
      accessToken,
      refreshToken,
    });


  const tree = {
    name:
      "My Drive",

    type:
      "folder",

    path:
      "My Drive",

    children:
      [],
  };


  let totalFiles = 0;


  /*
  |--------------------------------------------------------------------------
  | LIST DIRECT CHILDREN
  |--------------------------------------------------------------------------
  */

  const listChildren =
    async (
      parentId
    ) => {
      const children =
        [];

      let pageToken =
        null;


      do {
        const response =
          await drive.files.list({
            pageSize:
              100,

            pageToken:
              pageToken ||
              undefined,

            q:
              `'${parentId}' in parents and trashed = false`,

            fields:
              "nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,description,parents)",

            orderBy:
              "folder,name",

            spaces:
              "drive",

            includeItemsFromAllDrives:
              true,

            supportsAllDrives:
              true,
          });


        children.push(
          ...(
            response?.data
              ?.files ||
            []
          )
        );


        pageToken =
          response?.data
            ?.nextPageToken ||
          null;


        if (
          children.length >=
          maxFiles
        ) {
          break;
        }
      } while (
        pageToken
      );


      return children.slice(
        0,
        maxFiles
      );
    };


  /*
  |--------------------------------------------------------------------------
  | RECURSIVE WALK
  |--------------------------------------------------------------------------
  */

  const walkFolder =
    async ({
      folderId,
      folderNode,
      currentPath,
    }) => {
      if (
        totalFiles >=
        maxFiles
      ) {
        return;
      }


      const children =
        await listChildren(
          folderId
        );


      /*
      |--------------------------------------------------------------------------
      | FOLDERS FIRST
      |--------------------------------------------------------------------------
      */

      children.sort(
        (a, b) => {
          const aIsFolder =
            a.mimeType ===
            "application/vnd.google-apps.folder";

          const bIsFolder =
            b.mimeType ===
            "application/vnd.google-apps.folder";


          if (
            aIsFolder &&
            !bIsFolder
          ) {
            return -1;
          }


          if (
            !aIsFolder &&
            bIsFolder
          ) {
            return 1;
          }


          return String(
            a.name || ""
          ).localeCompare(
            String(
              b.name || ""
            )
          );
        }
      );


      /*
      |--------------------------------------------------------------------------
      | PROCESS CHILDREN
      |--------------------------------------------------------------------------
      */

      for (
        const item of children
      ) {
        if (
          totalFiles >=
          maxFiles
        ) {
          break;
        }


        const isFolder =
          item.mimeType ===
          "application/vnd.google-apps.folder";


        const itemPath =
          `${currentPath} → ${item.name}`;


        /*
        |--------------------------------------------------------------------------
        | FOLDER
        |--------------------------------------------------------------------------
        */

        if (isFolder) {
          const folderNodeChild =
            {
              id:
                item.id,

              name:
                item.name,

              type:
                "folder",

              path:
                itemPath,

              children:
                [],
            };


          folderNode.children.push(
            folderNodeChild
          );


          await walkFolder({
            folderId:
              item.id,

            folderNode:
              folderNodeChild,

            currentPath:
              itemPath,
          });
        }


        /*
        |--------------------------------------------------------------------------
        | FILE
        |--------------------------------------------------------------------------
        */

        else {
          folderNode.children.push({
            id:
              item.id,

            name:
              item.name,

            type:
              "file",

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

            path:
              itemPath,
          });


          totalFiles += 1;
        }
      }
    };


  /*
  |--------------------------------------------------------------------------
  | START AT MY DRIVE ROOT
  |--------------------------------------------------------------------------
  */

  await walkFolder({
    folderId:
      "root",

    folderNode:
      tree,

    currentPath:
      "My Drive",
  });


  console.log(
    `📁 Drive tree scanned: ${totalFiles} files`
  );


  return {
    tree,

    totalFiles,
  };
};


/*
|--------------------------------------------------------------------------
| TEMPORARY FILE PATH
|--------------------------------------------------------------------------
*/

/**
 * Create a temporary file path.
 *
 * Kept for future document-processing features.
 */
const createTemporaryFilePath = (
  extension = ""
) => {
  const randomId =
    crypto
      .randomBytes(12)
      .toString("hex");


  const cleanExtension =
    String(extension)
      .replace(
        /[^a-zA-Z0-9.]/g,
        ""
      );


  return path.join(
    os.tmpdir(),
    `lawlite-${randomId}${cleanExtension}`
  );
};


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  GOOGLE_DRIVE_SCOPE,

  createOAuthClient,

  getGoogleAuthorizationUrl,

  exchangeCodeForTokens,

  getDriveClient,


  /*
  |----------------------------------------------------------------------
  | Basic listing/search
  |----------------------------------------------------------------------
  */

  listDriveFiles,

  searchDriveFiles,

  searchDriveFilesByName,


  /*
  |----------------------------------------------------------------------
  | Folder operations
  |----------------------------------------------------------------------
  */

  findDriveFoldersByName,

  listDriveFolderContents,


  /*
  |----------------------------------------------------------------------
  | File metadata
  |----------------------------------------------------------------------
  */

  getDriveFileMetadata,


  /*
  |----------------------------------------------------------------------
  | File reading
  |----------------------------------------------------------------------
  */

  exportGoogleDocAsText,

  downloadDriveFile,


  /*
  |----------------------------------------------------------------------
  | Text extraction
  |----------------------------------------------------------------------
  */

  extractPdfText,

  extractDocxText,

  extractPlainText,


  /*
  |----------------------------------------------------------------------
  | AI document retrieval
  |----------------------------------------------------------------------
  */

  getDriveFileText,

  extractDriveSearchTerms,

  findRelevantDriveFiles,

  getRelevantDriveContext,


  /*
  |----------------------------------------------------------------------
  | Drive browsing
  |----------------------------------------------------------------------
  */

  listDriveTree,


  /*
  |----------------------------------------------------------------------
  | Utilities
  |----------------------------------------------------------------------
  */

  createTemporaryFilePath,
};