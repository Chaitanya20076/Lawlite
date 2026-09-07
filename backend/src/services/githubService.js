const GITHUB_API_BASE =
  "https://api.github.com";

/*
|--------------------------------------------------------------------------
| GITHUB API REQUEST HELPER
|--------------------------------------------------------------------------
*/

const githubRequest = async ({
  accessToken,
  path,
  options = {},
} = {}) => {
  if (!accessToken) {
    throw new Error(
      "GitHub access token is required."
    );
  }

  const response =
    await fetch(
      `${GITHUB_API_BASE}${path}`,
      {
        ...options,

        headers: {
          Accept:
            "application/vnd.github+json",

          Authorization:
            `Bearer ${accessToken}`,

          "X-GitHub-Api-Version":
            "2022-11-28",

          ...(options.headers || {}),
        },
      }
    );

  let data = null;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      `GitHub API request failed with status ${response.status}.`;

    throw new Error(
      `${message} (HTTP ${response.status})`
    );
  }

  return data;
};


/*
|--------------------------------------------------------------------------
| GET CURRENT GITHUB USER
|--------------------------------------------------------------------------
*/

const getGitHubUser =
  async (
    accessToken
  ) => {
    return githubRequest({
      accessToken,
      path: "/user",
    });
  };


/*
|--------------------------------------------------------------------------
| GET AUTHENTICATED USER REPOSITORIES
|--------------------------------------------------------------------------
*/

const getUserGitHubRepositories =
  async ({
    accessToken,
    maxResults = 100,
  } = {}) => {
    if (!accessToken) {
      return [];
    }

    const data =
      await githubRequest({
        accessToken,

        path:
          `/user/repos?per_page=${Math.min(
            maxResults,
            100
          )}&page=1&sort=updated&direction=desc&affiliation=owner,collaborator,organization_member`,
      });

    return Array.isArray(data)
      ? data
      : [];
  };


/*
|--------------------------------------------------------------------------
| SEARCH REPOSITORIES
|--------------------------------------------------------------------------
*/

const searchGitHubRepositories =
  async ({
    accessToken,
    query,
    maxResults = 5,
  } = {}) => {
    const cleanQuery =
      String(query || "")
        .trim();

    if (!cleanQuery) {
      return [];
    }

    const encodedQuery =
      encodeURIComponent(
        cleanQuery
      );

    const data =
      await githubRequest({
        accessToken,

        path:
          `/search/repositories?q=${encodedQuery}&per_page=${maxResults}`,
      });

    return Array.isArray(
      data?.items
    )
      ? data.items
      : [];
  };


/*
|--------------------------------------------------------------------------
| SEARCH CODE
|--------------------------------------------------------------------------
*/

const searchGitHubCode =
  async ({
    accessToken,
    query,
    maxResults = 10,
  } = {}) => {
    const cleanQuery =
      String(query || "")
        .trim();

    if (!cleanQuery) {
      return [];
    }

    const encodedQuery =
      encodeURIComponent(
        cleanQuery
      );

    const data =
      await githubRequest({
        accessToken,

        path:
          `/search/code?q=${encodedQuery}&per_page=${maxResults}`,
      });

    return Array.isArray(
      data?.items
    )
      ? data.items
      : [];
  };


/*
|--------------------------------------------------------------------------
| GET REPOSITORY
|--------------------------------------------------------------------------
*/

const getGitHubRepository =
  async ({
    accessToken,
    owner,
    repo,
  } = {}) => {
    if (!owner || !repo) {
      throw new Error(
        "GitHub repository owner and name are required."
      );
    }

    return githubRequest({
      accessToken,

      path:
        `/repos/${encodeURIComponent(
          owner
        )}/${encodeURIComponent(
          repo
        )}`,
    });
  };


/*
|--------------------------------------------------------------------------
| GET REPOSITORY TREE
|--------------------------------------------------------------------------
*/

const getRepositoryTree =
  async ({
    accessToken,
    owner,
    repo,
    branch = null,
    recursive = true,
  } = {}) => {
    if (!owner || !repo) {
      throw new Error(
        "GitHub repository owner and name are required."
      );
    }

    let selectedBranch =
      branch;

    /*
     * Resolve default branch when
     * the caller did not provide one.
     */
    if (!selectedBranch) {
      const repoData =
        await getGitHubRepository({
          accessToken,
          owner,
          repo,
        });

      selectedBranch =
        repoData?.default_branch ||
        "main";
    }

    const encodedOwner =
      encodeURIComponent(
        owner
      );

    const encodedRepo =
      encodeURIComponent(
        repo
      );

    const encodedBranch =
      encodeURIComponent(
        selectedBranch
      );

    return githubRequest({
      accessToken,

      path:
        `/repos/${encodedOwner}/${encodedRepo}/git/trees/${encodedBranch}?recursive=${recursive}`,
    });
  };


/*
|--------------------------------------------------------------------------
| GET FILE CONTENT
|--------------------------------------------------------------------------
*/

const getGitHubFileContent =
  async ({
    accessToken,
    owner,
    repo,
    path,
    ref = null,
  } = {}) => {
    if (
      !owner ||
      !repo ||
      !path
    ) {
      throw new Error(
        "GitHub repository owner, name and file path are required."
      );
    }

    const encodedOwner =
      encodeURIComponent(
        owner
      );

    const encodedRepo =
      encodeURIComponent(
        repo
      );

    const encodedPath =
      String(path)
        .split("/")
        .map(
          (segment) =>
            encodeURIComponent(
              segment
            )
        )
        .join("/");

    let apiPath =
      `/repos/${encodedOwner}/${encodedRepo}/contents/${encodedPath}`;

    if (ref) {
      apiPath +=
        `?ref=${encodeURIComponent(
          ref
        )}`;
    }

    const data =
      await githubRequest({
        accessToken,
        path: apiPath,
      });

    /*
     * Directory responses come back
     * as arrays. We only need files here.
     */
    if (
      Array.isArray(data)
    ) {
      return {
        type:
          "directory",

        content:
          null,

        data,
      };
    }

    if (
      data?.encoding !==
        "base64" ||
      !data?.content
    ) {
      return {
        type:
          data?.type ||
          "file",

        content:
          null,

        data,
      };
    }

    const content =
      Buffer.from(
        data.content.replace(
          /\n/g,
          ""
        ),
        "base64"
      ).toString("utf8");

    return {
      type:
        "file",

      content,

      data,
    };
  };


/*
|--------------------------------------------------------------------------
| EXTRACT SEARCH TERMS
|--------------------------------------------------------------------------
*/

const extractGitHubSearchTerms =
  (query = "") => {
    const original =
      String(query)
        .trim();

    const lower =
      original.toLowerCase();

    const terms = [];

    /*
     * Explicit project/repository names
     * from natural-language requests.
     */
    const explicitProjectMatches =
      original.match(
        /\b(?:project|repository|repo)\s+(?:named|called)?\s*["']?([a-zA-Z0-9._-]+)["']?/gi
      ) || [];

    explicitProjectMatches.forEach(
      (match) => {
        const cleaned =
          match
            .replace(
              /^(project|repository|repo)\s+(named|called)?\s*/i,
              ""
            )
            .replace(
              /^["']|["']$/g,
              ""
            )
            .trim();

        if (cleaned) {
          terms.push(cleaned);
        }
      }
    );

    /*
     * Known project name in the request.
     */
    if (
      lower.includes("lawlite")
    ) {
      terms.push(
        "Lawlite"
      );
    }

    /*
     * Remove generic conversational
     * language so GitHub search isn't
     * polluted by the full sentence.
     */
    const cleanedText =
      original
        .replace(
          /search my github repositories/gi,
          ""
        )
        .replace(
          /search my github repos/gi,
          ""
        )
        .replace(
          /find my github repository/gi,
          ""
        )
        .replace(
          /find my github repositories/gi,
          ""
        )
        .replace(
          /find my repo/gi,
          ""
        )
        .replace(
          /find my repositories/gi,
          ""
        )
        .replace(
          /tell me/gi,
          ""
        )
        .replace(
          /what the project does/gi,
          ""
        )
        .replace(
          /what this project does/gi,
          ""
        )
        .replace(
          /main technologies used/gi,
          ""
        )
        .replace(
          /technologies used/gi,
          ""
        )
        .replace(
          /and/gi,
          " "
        )
        .replace(
          /the/gi,
          " "
        )
        .replace(
          /my/gi,
          " "
        )
        .replace(
          /github/gi,
          " "
        )
        .replace(
          /repositories/gi,
          " "
        )
        .replace(
          /repository/gi,
          " "
        )
        .replace(
          /repos/gi,
          " "
        )
        .replace(
          /repo/gi,
          " "
        )
        .replace(
          /find/gi,
          " "
        )
        .replace(
          /search/gi,
          " "
        )
        .replace(
          /project/gi,
          " "
        )
        .replace(
          /tell/gi,
          " "
        )
        .replace(
          /name/gi,
          " "
        )
        .replace(
          /what/gi,
          " "
        )
        .replace(
          /does/gi,
          " "
        )
        .replace(
          /main/gi,
          " "
        )
        .replace(
          /technologies/gi,
          " "
        )
        .replace(
          /used/gi,
          " "
        );

    const words =
      cleanedText
        .split(/\s+/)
        .map(
          (word) =>
            word
              .replace(
                /[^a-zA-Z0-9._-]/g,
                ""
              )
              .trim()
        )
        .filter(
          (word) =>
            word.length >= 3
        );

    /*
     * Preserve meaningful words.
     */
    terms.push(
      ...words
    );

    return [
      ...new Set(
        terms.filter(Boolean)
      ),
    ];
  };


/*
|--------------------------------------------------------------------------
| SCORE REPOSITORY AGAINST REQUEST
|--------------------------------------------------------------------------
*/

const scoreRepository =
  ({
    repository,
    queryTerms = [],
    originalQuery = "",
  } = {}) => {
    if (!repository) {
      return 0;
    }

    const name =
      String(
        repository.name || ""
      ).toLowerCase();

    const fullName =
      String(
        repository.full_name || ""
      ).toLowerCase();

    const description =
      String(
        repository.description || ""
      ).toLowerCase();

    const topics =
      Array.isArray(
        repository.topics
      )
        ? repository.topics
            .join(" ")
            .toLowerCase()
        : "";

    const searchText =
      `${name} ${fullName} ${description} ${topics}`;

    let score = 0;

    for (
      const term of queryTerms
    ) {
      const cleanedTerm =
        String(term)
          .toLowerCase()
          .trim();

      if (!cleanedTerm) {
        continue;
      }

      if (
        name ===
        cleanedTerm
      ) {
        score += 100;
      }

      if (
        name.includes(
          cleanedTerm
        )
      ) {
        score += 50;
      }

      if (
        fullName.includes(
          cleanedTerm
        )
      ) {
        score += 35;
      }

      if (
        description.includes(
          cleanedTerm
        )
      ) {
        score += 15;
      }

      if (
        topics.includes(
          cleanedTerm
        )
      ) {
        score += 10;
      }
    }

    /*
     * Strong explicit Lawlite match.
     */
    if (
      String(originalQuery)
        .toLowerCase()
        .includes(
          "lawlite"
        )
    ) {
      if (
        name ===
        "lawlite"
      ) {
        score += 200;
      }

      if (
        fullName.includes(
          "/lawlite"
        )
      ) {
        score += 100;
      }
    }

    return score;
  };


/*
|--------------------------------------------------------------------------
| FIND RELEVANT GITHUB REPOSITORIES
|--------------------------------------------------------------------------
*/

const findRelevantGitHubRepositories =
  async ({
    accessToken,
    query,
    maxResults = 5,
  } = {}) => {
    if (
      !accessToken ||
      !query?.trim()
    ) {
      return [];
    }

    const queryTerms =
      extractGitHubSearchTerms(
        query
      );

    console.log(
      "🐙 GitHub extracted search terms:",
      queryTerms
    );

    /*
     * IMPORTANT:
     * Since the user is authenticated,
     * search their accessible repositories
     * first instead of relying only on
     * GitHub's global search.
     */
    try {
      const userRepositories =
        await getUserGitHubRepositories({
          accessToken,
          maxResults: 100,
        });

      const ranked =
        userRepositories
          .map(
            (repository) => ({
              repository,
              score:
                scoreRepository({
                  repository,
                  queryTerms,
                  originalQuery:
                    query,
                }),
            })
          )
          .sort(
            (a, b) =>
              b.score -
              a.score
          )
          .filter(
            (item) =>
              item.score > 0
          );

      if (
        ranked.length >
        0
      ) {
        console.log(
          "🐙 GitHub ranked repositories:",
          ranked
            .slice(
              0,
              maxResults
            )
            .map(
              (item) =>
                `${item.repository.full_name} (${item.score})`
            )
        );

        return ranked
          .slice(
            0,
            maxResults
          )
          .map(
            (item) =>
              item.repository
          );
      }

      /*
       * If no strong match exists,
       * return a few accessible repos
       * so Lawlite can still understand
       * the user's repositories.
       */
      return userRepositories.slice(
        0,
        maxResults
      );
    } catch (error) {
      console.error(
        "GitHub user repository lookup error:",
        error
      );
    }

    /*
     * Fallback to global repository search.
     */
    try {
      const fallbackTerms =
        queryTerms.length > 0
          ? queryTerms.join(" ")
          : query;

      return await searchGitHubRepositories({
        accessToken,
        query:
          fallbackTerms,
        maxResults,
      });
    } catch (error) {
      console.error(
        "GitHub fallback repository search error:",
        error
      );

      return [];
    }
  };


/*
|--------------------------------------------------------------------------
| SEARCH RELEVANT GITHUB CONTENT
|--------------------------------------------------------------------------
*/

const findRelevantGitHubFiles =
  async ({
    accessToken,
    query,
    maxResults = 5,
  } = {}) => {
    if (
      !accessToken ||
      !query?.trim()
    ) {
      return [];
    }

    const repositories =
      await findRelevantGitHubRepositories({
        accessToken,
        query,
        maxResults,
      });

    const results =
      repositories.map(
        (repository) => ({
          type:
            "repository",

          id:
            repository.id,

          name:
            repository.name,

          path:
            null,

          repository: {
            id:
              repository.id,

            name:
              repository.name,

            fullName:
              repository.full_name,

            owner:
              repository.owner
                ?.login,

            defaultBranch:
              repository.default_branch,
          },

          htmlUrl:
            repository.html_url ||
            null,
        })
      );

    /*
     * Also try code search with
     * an extracted meaningful query.
     *
     * This is supplementary — repository
     * discovery above remains primary.
     */
    try {
      const searchTerms =
        extractGitHubSearchTerms(
          query
        );

      if (
        searchTerms.length > 0
      ) {
        const codeQuery =
          searchTerms
            .slice(0, 4)
            .join(" ");

        const codeResults =
          await searchGitHubCode({
            accessToken,
            query:
              codeQuery,
            maxResults:
              maxResults,
          });

        for (
          const item of
            codeResults
        ) {
          if (
            !item?.repository
          ) {
            continue;
          }

          results.push({
            type:
              "code",

            id:
              item.sha ||
              item.html_url,

            name:
              item.name,

            path:
              item.path,

            repository: {
              id:
                item.repository.id,

              name:
                item.repository.name,

              fullName:
                item.repository.full_name,

              owner:
                item.repository
                  ?.owner
                  ?.login,

              defaultBranch:
                item.repository
                  ?.default_branch,
            },

            htmlUrl:
              item.html_url ||
              null,
          });
        }
      }
    } catch (error) {
      /*
       * Code search is supplementary.
       * Never allow it to break repository
       * discovery.
       */
      console.warn(
        "GitHub code search unavailable:",
        error.message
      );
    }

    return results.slice(
      0,
      Math.max(
        maxResults * 2,
        maxResults
      )
    );
  };


/*
|--------------------------------------------------------------------------
| BUILD GITHUB CONTEXT
|--------------------------------------------------------------------------
*/

const getRelevantGitHubContext =
  async ({
    accessToken,
    query,
    maxRepositories = 5,
    maxFiles = 6,
    maxCharsPerFile = 12000,
  } = {}) => {
    if (
      !accessToken ||
      !query?.trim()
    ) {
      return {
        context: null,
        sources: [],
      };
    }

    const relevantResults =
      await findRelevantGitHubFiles({
        accessToken,
        query,
        maxResults:
          Math.max(
            maxRepositories,
            5
          ),
      });

    const contextParts = [];
    const sources = [];
    const processedRepositories =
      new Set();
    const processedFiles =
      new Set();

    /*
     * Repository results first.
     */
    for (
      const result of
        relevantResults
    ) {
      if (
        processedRepositories.size >=
        maxRepositories
      ) {
        break;
      }

      const repository =
        result.repository;

      if (
        !repository?.owner ||
        !repository?.name
      ) {
        continue;
      }

      const repoKey =
        `${repository.owner}/${repository.name}`;

      if (
        processedRepositories.has(
          repoKey
        )
      ) {
        continue;
      }

      processedRepositories.add(
        repoKey
      );

      try {
        const repoData =
          await getGitHubRepository({
            accessToken,
            owner:
              repository.owner,
            repo:
              repository.name,
          });

        sources.push({
          type:
            "repository",

          id:
            repoData.id,

          name:
            repoData.name,

          path:
            null,

          repository:
            repoData.full_name,

          description:
            repoData.description ||
            "",

          htmlUrl:
            repoData.html_url ||
            null,

          stars:
            repoData.stargazers_count ||
            0,

          language:
            repoData.language ||
            null,
        });

        contextParts.push(
          `GITHUB REPOSITORY
Name: ${repoData.name}
Full name: ${repoData.full_name}
Description: ${
            repoData.description ||
            "(No description)"
          }
Default branch: ${
            repoData.default_branch ||
            "unknown"
          }
Primary language: ${
            repoData.language ||
            "unknown"
          }
Stars: ${
            repoData.stargazers_count ||
            0
          }
URL: ${
            repoData.html_url ||
            ""
          }`
        );

        /*
         * Read the README when available.
         */
        try {
          const readme =
            await getGitHubFileContent({
              accessToken,
              owner:
                repository.owner,
              repo:
                repository.name,
              path:
                "README.md",
              ref:
                repoData.default_branch ||
                null,
            });

          if (
            readme.type ===
              "file" &&
            readme.content
          ) {
            contextParts.push(
              `GITHUB README
Repository: ${repoData.full_name}
Content:
${readme.content.slice(
                0,
                maxCharsPerFile
              )}`
            );

            sources.push({
              type:
                "file",

              id:
                readme.data?.sha ||
                `readme-${repoData.id}`,

              name:
                "README.md",

              path:
                "README.md",

              repository:
                repoData.full_name,

              htmlUrl:
                readme.data?.html_url ||
                null,
            });
          }
        } catch (readmeError) {
          console.log(
            `GitHub README unavailable for ${repoKey}:`,
            readmeError.message
          );
        }

        /*
         * Read package.json when available.
         * This is extremely useful for
         * identifying technologies.
         */
        try {
          const packageJson =
            await getGitHubFileContent({
              accessToken,
              owner:
                repository.owner,
              repo:
                repository.name,
              path:
                "package.json",
              ref:
                repoData.default_branch ||
                null,
            });

          if (
            packageJson.type ===
              "file" &&
            packageJson.content
          ) {
            contextParts.push(
              `GITHUB PACKAGE.JSON
Repository: ${repoData.full_name}
Content:
${packageJson.content.slice(
                0,
                maxCharsPerFile
              )}`
            );

            sources.push({
              type:
                "file",

              id:
                packageJson.data?.sha ||
                `package-${repoData.id}`,

              name:
                "package.json",

              path:
                "package.json",

              repository:
                repoData.full_name,

              htmlUrl:
                packageJson.data?.html_url ||
                null,
            });
          }
        } catch (packageError) {
          console.log(
            `GitHub package.json unavailable for ${repoKey}:`,
            packageError.message
          );
        }

        /*
         * Inspect the repository tree
         * for important source/config files.
         */
        try {
          const tree =
            await getRepositoryTree({
              accessToken,
              owner:
                repository.owner,
              repo:
                repository.name,
              branch:
                repoData.default_branch,
              recursive:
                true,
            });

          const treeItems =
            Array.isArray(
              tree?.tree
            )
              ? tree.tree
              : [];

          const importantPatterns = [
            /(^|\/)package\.json$/i,
            /(^|\/)README(\.md)?$/i,
            /(^|\/)vite\.config\./i,
            /(^|\/)src\/App\./i,
            /(^|\/)src\/main\./i,
            /(^|\/)src\/server\./i,
            /(^|\/)server\./i,
            /(^|\/)index\./i,
            /(^|\/)routes?\//i,
            /(^|\/)controllers?\//i,
            /(^|\/)services?\//i,
          ];

          const importantFiles =
            treeItems
              .filter(
                (item) =>
                  item?.type ===
                    "blob" &&
                  importantPatterns.some(
                    (pattern) =>
                      pattern.test(
                        item.path ||
                        ""
                      )
                  )
              )
              .filter(
                (item) =>
                  !/node_modules\//i.test(
                    item.path ||
                    ""
                  )
              )
              .slice(
                0,
                Math.max(
                  4,
                  maxFiles
                )
              );

          for (
            const item of
              importantFiles
          ) {
            if (
              processedFiles.size >=
              maxFiles
            ) {
              break;
            }

            const fileKey =
              `${repoKey}/${item.path}`;

            if (
              processedFiles.has(
                fileKey
              )
            ) {
              continue;
            }

            /*
             * README and package.json
             * were already handled above.
             */
            if (
              item.path ===
                "README.md" ||
              item.path ===
                "package.json"
            ) {
              continue;
            }

            try {
              const fileResult =
                await getGitHubFileContent({
                  accessToken,
                  owner:
                    repository.owner,
                  repo:
                    repository.name,
                  path:
                    item.path,
                  ref:
                    repoData.default_branch ||
                    null,
                });

              if (
                fileResult.type !==
                  "file" ||
                !fileResult.content
              ) {
                continue;
              }

              processedFiles.add(
                fileKey
              );

              const content =
                fileResult.content.slice(
                  0,
                  maxCharsPerFile
                );

              sources.push({
                type:
                  "file",

                id:
                  item.sha ||
                  item.path,

                name:
                  item.path
                    .split("/")
                    .pop(),

                path:
                  item.path,

                repository:
                  repoData.full_name,

                htmlUrl:
                  item.html_url ||
                  fileResult.data
                    ?.html_url ||
                  null,
              });

              contextParts.push(
                `GITHUB SOURCE
Repository: ${repoData.full_name}
File: ${item.path}
URL: ${
                  item.html_url ||
                  fileResult.data
                    ?.html_url ||
                  ""
                }
Content:
${content}`
              );
            } catch (fileError) {
              console.error(
                `GitHub file read error for "${fileKey}":`,
                fileError.message
              );
            }
          }
        } catch (treeError) {
          console.warn(
            `GitHub tree lookup unavailable for ${repoKey}:`,
            treeError.message
          );
        }
      } catch (repositoryError) {
        console.error(
          `GitHub repository read error for ${repoKey}:`,
          repositoryError.message
        );
      }
    }

    /*
     * Code-search-only results can still
     * contribute source files when they
     * belong to a repository we haven't
     * fully processed yet.
     */
    for (
      const result of
        relevantResults
    ) {
      if (
        sources.length >=
        maxFiles +
        maxRepositories +
        2
      ) {
        break;
      }

      if (
        result.type !==
        "code"
      ) {
        continue;
      }

      const repository =
        result.repository;

      if (
        !repository?.owner ||
        !repository?.name ||
        !result.path
      ) {
        continue;
      }

      const fileKey =
        `${repository.owner}/${repository.name}/${result.path}`;

      if (
        processedFiles.has(
          fileKey
        )
      ) {
        continue;
      }

      try {
        const fileResult =
          await getGitHubFileContent({
            accessToken,
            owner:
              repository.owner,
            repo:
              repository.name,
            path:
              result.path,
            ref:
              repository.defaultBranch ||
              null,
          });

        if (
          fileResult.type !==
            "file" ||
          !fileResult.content
        ) {
          continue;
        }

        processedFiles.add(
          fileKey
        );

        const content =
          fileResult.content.slice(
            0,
            maxCharsPerFile
          );

        sources.push({
          type:
            "file",

          id:
            result.id,

          name:
            result.name,

          path:
            result.path,

          repository:
            `${repository.owner}/${repository.name}`,

          htmlUrl:
            result.htmlUrl ||
            fileResult.data
              ?.html_url ||
            null,
        });

        contextParts.push(
          `GITHUB SOURCE
Repository: ${repository.owner}/${repository.name}
File: ${result.path}
URL: ${
            result.htmlUrl ||
            fileResult.data
              ?.html_url ||
            ""
          }
Content:
${content}`
        );
      } catch (error) {
        console.error(
          `GitHub supplementary file read error for "${fileKey}":`,
          error.message
        );
      }
    }

    console.log(
      `🐙 GitHub context built: ${contextParts.length} context sections, ${sources.length} sources`
    );

    return {
      context:
        contextParts.length >
        0
          ? contextParts.join(
              "\n\n====================\n\n"
            )
          : null,

      sources,
    };
  };


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  githubRequest,

  getGitHubUser,

  getUserGitHubRepositories,

  searchGitHubRepositories,

  searchGitHubCode,

  getGitHubRepository,

  getRepositoryTree,

  getGitHubFileContent,

  extractGitHubSearchTerms,

  findRelevantGitHubRepositories,

  findRelevantGitHubFiles,

  getRelevantGitHubContext,
};