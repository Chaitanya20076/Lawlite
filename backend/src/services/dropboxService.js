const { Dropbox } = require("dropbox");

/*
|--------------------------------------------------------------------------
| CREATE DROPBOX CLIENT
|--------------------------------------------------------------------------
*/

const createDropboxClient = ({
  accessToken = null,
  refreshToken = null,
} = {}) => {
  if (!accessToken && !refreshToken) {
    throw new Error(
      "Dropbox authentication tokens are missing."
    );
  }

  if (!process.env.DROPBOX_APP_KEY) {
    throw new Error(
      "DROPBOX_APP_KEY is missing."
    );
  }

  return new Dropbox({
    accessToken:
      accessToken || undefined,

    refreshToken:
      refreshToken || undefined,

    clientId:
      process.env.DROPBOX_APP_KEY,

    clientSecret:
      process.env.DROPBOX_APP_SECRET,
  });
};


/*
|--------------------------------------------------------------------------
| NORMALIZE DROPBOX ENTRY
|--------------------------------------------------------------------------
*/

const normalizeDropboxEntry = (entry) => {
  if (!entry) {
    return null;
  }

  const tag = entry[".tag"];


  /*
  |--------------------------------------------------------------------------
  | FOLDER
  |--------------------------------------------------------------------------
  */

  if (tag === "folder") {
    return {
      id:
        entry.id || null,

      name:
        entry.name || "",

      type:
        "folder",

      path:
        entry.path_display || "",

      pathLower:
        entry.path_lower || "",
    };
  }


  /*
  |--------------------------------------------------------------------------
  | FILE
  |--------------------------------------------------------------------------
  */

  if (tag === "file") {
    return {
      id:
        entry.id || null,

      name:
        entry.name || "",

      type:
        "file",

      path:
        entry.path_display || "",

      pathLower:
        entry.path_lower || "",

      size:
        entry.size || null,

      modifiedTime:
        entry.server_modified ||
        entry.client_modified ||
        null,

      contentHash:
        entry.content_hash || null,

      revision:
        entry.rev || null,
    };
  }


  return null;
};


/*
|--------------------------------------------------------------------------
| LIST DROPBOX FOLDER
|--------------------------------------------------------------------------
*/

const listDropboxFolder = async ({
  accessToken,
  refreshToken,
  path = "",
  recursive = false,
  maxEntries = 500,
} = {}) => {
  const dbx =
    createDropboxClient({
      accessToken,
      refreshToken,
    });

  const entries = [];


  /*
  |--------------------------------------------------------------------------
  | FIRST PAGE
  |--------------------------------------------------------------------------
  */

  let response =
    await dbx.filesListFolder({
      path,
      recursive,

      include_deleted:
        false,

      include_non_downloadable_files:
        true,
    });

  entries.push(
    ...(response?.result?.entries || [])
  );


  /*
  |--------------------------------------------------------------------------
  | PAGINATION
  |--------------------------------------------------------------------------
  */

  while (
    response?.result?.has_more &&
    entries.length < maxEntries
  ) {
    response =
      await dbx.filesListFolderContinue({
        cursor:
          response.result.cursor,
      });

    entries.push(
      ...(response?.result?.entries || [])
    );
  }


  /*
  |--------------------------------------------------------------------------
  | NORMALIZE
  |--------------------------------------------------------------------------
  */

  return entries
    .slice(0, maxEntries)
    .map(normalizeDropboxEntry)
    .filter(Boolean);
};


/*
|--------------------------------------------------------------------------
| LIST DROPBOX TREE
|--------------------------------------------------------------------------
*/

const listDropboxTree = async ({
  accessToken,
  refreshToken,
  maxEntries = 500,
} = {}) => {
  const entries =
    await listDropboxFolder({
      accessToken,
      refreshToken,
      path: "",
      recursive: true,
      maxEntries,
    });


  const root = {
    id:
      "root",

    name:
      "Dropbox",

    type:
      "folder",

    path:
      "",

    children:
      [],
  };


  const folderMap =
    new Map();

  folderMap.set(
    "",
    root
  );


  /*
  |--------------------------------------------------------------------------
  | CREATE FOLDER HELPER
  |--------------------------------------------------------------------------
  */

  const ensureFolder = (
    folderPath,
    folderName
  ) => {
    if (
      folderMap.has(folderPath)
    ) {
      return folderMap.get(
        folderPath
      );
    }


    const parentPath =
      folderPath.substring(
        0,
        folderPath.lastIndexOf("/")
      ) || "";


    const parent =
      folderMap.get(
        parentPath
      ) || root;


    const folder = {
      id:
        null,

      name:
        folderName,

      type:
        "folder",

      path:
        folderPath,

      children:
        [],
    };


    parent.children.push(
      folder
    );

    folderMap.set(
      folderPath,
      folder
    );

    return folder;
  };


  /*
  |--------------------------------------------------------------------------
  | BUILD TREE
  |--------------------------------------------------------------------------
  */

  for (
    const entry of entries
  ) {
    if (!entry?.path) {
      continue;
    }


    const normalizedPath =
      entry.path.startsWith("/")
        ? entry.path
        : `/${entry.path}`;


    const parts =
      normalizedPath
        .split("/")
        .filter(Boolean);


    if (
      !parts.length
    ) {
      continue;
    }


    let currentPath =
      "";


    /*
    |--------------------------------------------------------------------------
    | CREATE MISSING PARENT FOLDERS
    |--------------------------------------------------------------------------
    */

    for (
      let index = 0;
      index < parts.length - 1;
      index += 1
    ) {
      const part =
        parts[index];

      currentPath =
        `${currentPath}/${part}`;

      ensureFolder(
        currentPath,
        part
      );
    }


    /*
    |--------------------------------------------------------------------------
    | FIND PARENT
    |--------------------------------------------------------------------------
    */

    const parentPath =
      parts.length > 1
        ? `/${parts
            .slice(0, -1)
            .join("/")}`
        : "";


    const parent =
      folderMap.get(
        parentPath
      ) || root;


    /*
    |--------------------------------------------------------------------------
    | FOLDER
    |--------------------------------------------------------------------------
    */

    if (
      entry.type === "folder"
    ) {
      const folder =
        ensureFolder(
          normalizedPath,
          entry.name
        );


      folder.id =
        entry.id;


      if (
        entry.pathLower
      ) {
        folder.pathLower =
          entry.pathLower;
      }

      continue;
    }


    /*
    |--------------------------------------------------------------------------
    | FILE
    |--------------------------------------------------------------------------
    */

    parent.children.push({
      ...entry,
      type:
        "file",
    });
  }


  /*
  |--------------------------------------------------------------------------
  | SORT TREE
  |--------------------------------------------------------------------------
  */

  const sortTree = (
    node
  ) => {
    if (
      !Array.isArray(
        node.children
      )
    ) {
      return;
    }


    node.children.sort(
      (a, b) => {
        if (
          a.type === "folder" &&
          b.type !== "folder"
        ) {
          return -1;
        }


        if (
          a.type !== "folder" &&
          b.type === "folder"
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


    node.children.forEach(
      sortTree
    );
  };


  sortTree(root);


  return {
    tree:
      root,

    totalEntries:
      entries.length,
  };
};


/*
|--------------------------------------------------------------------------
| SEARCH DROPBOX FILES
|--------------------------------------------------------------------------
*/

const searchDropboxFiles = async ({
  accessToken,
  refreshToken,
  query,
  maxResults = 20,
} = {}) => {
  if (
    !query?.trim()
  ) {
    return [];
  }


  const dbx =
    createDropboxClient({
      accessToken,
      refreshToken,
    });


  const response =
    await dbx.filesSearchV2({
      query:
        query.trim(),

      options: {
        max_results:
          maxResults,

        filename_only:
          false,
      },
    });


  const matches =
    response?.result?.matches ||
    [];


  return matches
    .map(
      (match) => {
        const metadata =
          match?.metadata?.metadata;

        return normalizeDropboxEntry(
          metadata
        );
      }
    )
    .filter(Boolean);
};


/*
|--------------------------------------------------------------------------
| FIND DROPBOX FOLDERS BY NAME
|--------------------------------------------------------------------------
*/

const findDropboxFoldersByName =
  async ({
    accessToken,
    refreshToken,
    folderName,
  } = {}) => {
    if (
      !folderName?.trim()
    ) {
      return [];
    }


    const entries =
      await listDropboxFolder({
        accessToken,
        refreshToken,
        path: "",
        recursive: true,
        maxEntries: 500,
      });


    const target =
      folderName
        .trim()
        .toLowerCase();


    return entries.filter(
      (entry) =>
        entry.type === "folder" &&
        String(
          entry.name
        ).toLowerCase() ===
          target
    );
  };


/*
|--------------------------------------------------------------------------
| LIST DROPBOX FOLDER CONTENTS
|--------------------------------------------------------------------------
*/

const listDropboxFolderContents =
  async ({
    accessToken,
    refreshToken,
    folderPath = "",
  } = {}) => {
    return listDropboxFolder({
      accessToken,
      refreshToken,
      path:
        folderPath,
      recursive:
        false,
      maxEntries:
        500,
    });
  };


/*
|--------------------------------------------------------------------------
| DOWNLOAD DROPBOX FILE
|--------------------------------------------------------------------------
*/

const downloadDropboxFile =
  async ({
    accessToken,
    refreshToken,
    path,
  } = {}) => {
    if (
      !path
    ) {
      throw new Error(
        "Dropbox file path is required."
      );
    }


    const dbx =
      createDropboxClient({
        accessToken,
        refreshToken,
      });


    const response =
      await dbx.filesDownload({
        path,
      });


    const result =
      response?.result;


    if (!result) {
      throw new Error(
        "Dropbox returned an empty file response."
      );
    }


    let buffer;


    /*
    |--------------------------------------------------------------------------
    | BUFFER
    |--------------------------------------------------------------------------
    */

    if (
      Buffer.isBuffer(
        result.fileBinary
      )
    ) {
      buffer =
        result.fileBinary;

    } else if (
      result.fileBinary
        instanceof Uint8Array
    ) {
      buffer =
        Buffer.from(
          result.fileBinary
        );

    } else if (
      result.fileBinary
        instanceof ArrayBuffer
    ) {
      buffer =
        Buffer.from(
          new Uint8Array(
            result.fileBinary
          )
        );

    } else {
      buffer =
        Buffer.from(
          result.fileBinary
        );
    }


    return {
      buffer,

      metadata:
        normalizeDropboxEntry({
          ...result,
          ".tag":
            "file",
        }),
    };
  };


/*
|--------------------------------------------------------------------------
| DROPBOX TEMPORARY LINK
|--------------------------------------------------------------------------
*/

const getDropboxTemporaryLink =
  async ({
    accessToken,
    refreshToken,
    path,
  } = {}) => {
    if (
      !path
    ) {
      throw new Error(
        "Dropbox file path is required."
      );
    }


    const dbx =
      createDropboxClient({
        accessToken,
        refreshToken,
      });


    const response =
      await dbx.filesGetTemporaryLink({
        path,
      });


    return (
      response?.result?.link ||
      null
    );
  };


/*
|--------------------------------------------------------------------------
| FIND RELEVANT DROPBOX FILES
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Dropbox's filesSearchV2() is designed for Dropbox search.
| A full natural-language question such as:
|
| "According to my Dropbox leave policy, how many paid leave
| days am I entitled to per year?"
|
| may return ZERO results even when the file exists.
|
| Therefore:
|
| 1. Try Dropbox's native search.
| 2. If no results are returned, list Dropbox metadata.
| 3. Extract meaningful words from the user's question.
| 4. Match those words against file names + paths.
|
| This allows:
|
| Lawlite_Dropbox_Test_Leave_Policy.pdf
|
| to be discovered from a question containing:
|
| "Dropbox leave policy"
|
|--------------------------------------------------------------------------
*/

const findRelevantDropboxFiles =
  async ({
    accessToken,
    refreshToken,
    query,
    maxFiles = 3,
  } = {}) => {
    if (
      !query?.trim()
    ) {
      return [];
    }


    /*
    |--------------------------------------------------------------------------
    | STEP 1 — NORMAL DROPBOX SEARCH
    |--------------------------------------------------------------------------
    */

    let directMatches = [];


    try {
      directMatches =
        await searchDropboxFiles({
          accessToken,
          refreshToken,
          query,
          maxResults:
            Math.max(
              maxFiles * 4,
              10
            ),
        });
    } catch (error) {
      console.error(
        "Dropbox native search error:",
        error
      );

      directMatches =
        [];
    }


    const directFiles =
      directMatches
        .filter(
          (file) =>
            file.type === "file"
        )
        .slice(
          0,
          maxFiles
        );


    /*
    |--------------------------------------------------------------------------
    | NATIVE SEARCH SUCCESS
    |--------------------------------------------------------------------------
    */

    if (
      directFiles.length > 0
    ) {
      console.log(
        `📦 Dropbox native search found ${directFiles.length} file(s).`
      );

      return directFiles;
    }


    /*
    |--------------------------------------------------------------------------
    | STEP 2 — FALLBACK METADATA SEARCH
    |--------------------------------------------------------------------------
    */

    console.log(
      "📦 Dropbox native search returned no matches."
    );

    console.log(
      "📦 Falling back to filename/path matching..."
    );


    let allEntries = [];


    try {
      allEntries =
        await listDropboxFolder({
          accessToken,
          refreshToken,
          path: "",
          recursive: true,
          maxEntries: 500,
        });
    } catch (error) {
      console.error(
        "Dropbox metadata fallback error:",
        error
      );

      return [];
    }


    const files =
      allEntries.filter(
        (entry) =>
          entry.type === "file"
      );


    if (
      files.length === 0
    ) {
      console.log(
        "📦 Dropbox contains no files."
      );

      return [];
    }


    /*
    |--------------------------------------------------------------------------
    | STOP WORDS
    |--------------------------------------------------------------------------
    |
    | These words are too generic to help filename matching.
    |
    */

    const stopWords =
      new Set([
        "according",
        "about",
        "after",
        "also",
        "and",
        "are",
        "can",
        "does",
        "from",
        "give",
        "how",
        "in",
        "is",
        "me",
        "my",
        "of",
        "on",
        "please",
        "policy",
        "tell",
        "that",
        "the",
        "their",
        "this",
        "to",
        "what",
        "which",
        "with",
        "you",
        "your",
        "dropbox",
      ]);


    /*
    |--------------------------------------------------------------------------
    | EXTRACT SEARCH WORDS
    |--------------------------------------------------------------------------
    */

    const queryWords =
      query
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          " "
        )
        .split(/\s+/)
        .map(
          (word) =>
            word.trim()
        )
        .filter(
          (word) =>
            word.length >= 3 &&
            !stopWords.has(
              word
            )
        );


    console.log(
      "📦 Dropbox fallback search words:",
      queryWords
    );


    /*
    |--------------------------------------------------------------------------
    | NOTHING MEANINGFUL
    |--------------------------------------------------------------------------
    */

    if (
      queryWords.length === 0
    ) {
      return files.slice(
        0,
        maxFiles
      );
    }


    /*
    |--------------------------------------------------------------------------
    | SCORE FILES
    |--------------------------------------------------------------------------
    */

    const scored =
      files
        .map(
          (file) => {
            const fileName =
              String(
                file.name || ""
              ).toLowerCase();


            const filePath =
              String(
                file.path || ""
              ).toLowerCase();


            const haystack =
              `${fileName} ${filePath}`;


            let score =
              0;


            for (
              const word of queryWords
            ) {
              /*
              |--------------------------------------------------------------------------
              | WORD EXISTS IN PATH OR NAME
              |--------------------------------------------------------------------------
              */

              if (
                haystack.includes(
                  word
                )
              ) {
                score += 1;
              }


              /*
              |--------------------------------------------------------------------------
              | WORD EXISTS SPECIFICALLY IN FILE NAME
              |--------------------------------------------------------------------------
              */

              if (
                fileName.includes(
                  word
                )
              ) {
                score += 3;
              }
            }


            /*
            |--------------------------------------------------------------------------
            | SPECIAL BONUS FOR PDF / DOCUMENTS
            |--------------------------------------------------------------------------
            */

            const lowerName =
              fileName;


            if (
              lowerName.endsWith(
                ".pdf"
              )
            ) {
              score += 1;
            }


            return {
              file,
              score,
            };
          }
        )
        .filter(
          (item) =>
            item.score > 0
        )
        .sort(
          (a, b) =>
            b.score -
            a.score
        );


    /*
    |--------------------------------------------------------------------------
    | LOG RESULTS
    |--------------------------------------------------------------------------
    */

    console.log(
      "📦 Dropbox fallback matches:",
      scored.map(
        (item) => ({
          name:
            item.file.name,

          path:
            item.file.path,

          score:
            item.score,
        })
      )
    );


    /*
    |--------------------------------------------------------------------------
    | RETURN BEST MATCHES
    |--------------------------------------------------------------------------
    */

    return scored
      .slice(
        0,
        maxFiles
      )
      .map(
        (item) =>
          item.file
      );
  };


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  createDropboxClient,

  normalizeDropboxEntry,

  listDropboxFolder,

  listDropboxTree,

  searchDropboxFiles,

  findDropboxFoldersByName,

  listDropboxFolderContents,

  downloadDropboxFile,

  getDropboxTemporaryLink,

  findRelevantDropboxFiles,
};