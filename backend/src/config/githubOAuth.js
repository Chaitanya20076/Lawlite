const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_REDIRECT_URI,
} = process.env;

if (!GITHUB_CLIENT_ID) {
  console.warn(
    "⚠️ GITHUB_CLIENT_ID is missing from environment variables."
  );
}

if (!GITHUB_CLIENT_SECRET) {
  console.warn(
    "⚠️ GITHUB_CLIENT_SECRET is missing from environment variables."
  );
}

if (!GITHUB_REDIRECT_URI) {
  console.warn(
    "⚠️ GITHUB_REDIRECT_URI is missing from environment variables."
  );
}

/*
|--------------------------------------------------------------------------
| GITHUB OAUTH CONFIG
|--------------------------------------------------------------------------
*/

const GITHUB_AUTH_URL =
  "https://github.com/login/oauth/authorize";

const GITHUB_TOKEN_URL =
  "https://github.com/login/oauth/access_token";

/*
|--------------------------------------------------------------------------
| GITHUB SCOPES
|--------------------------------------------------------------------------
|
| read:user
|   Allows Lawlite to read basic GitHub profile information.
|
| repo
|   Allows access to repositories the user has permission to access,
|   including private repositories.
|
| We need repo because Lawlite's GitHub connector is intended to search
| the user's repositories and read relevant project files.
|
*/

const GITHUB_SCOPES = [
  "read:user",
  "repo",
];

/*
|--------------------------------------------------------------------------
| BUILD AUTHORIZATION URL
|--------------------------------------------------------------------------
*/

const getGitHubAuthorizationUrl = (
  state
) => {
  const params =
    new URLSearchParams({
      client_id:
        GITHUB_CLIENT_ID,

      redirect_uri:
        GITHUB_REDIRECT_URI,

      scope:
        GITHUB_SCOPES.join(" "),

      state:
        state || "",
    });

  return `${GITHUB_AUTH_URL}?${params.toString()}`;
};

/*
|--------------------------------------------------------------------------
| EXCHANGE AUTHORIZATION CODE
|--------------------------------------------------------------------------
*/

const exchangeGitHubCode =
  async (code) => {
    if (!code) {
      throw new Error(
        "GitHub authorization code is required."
      );
    }

    const response =
      await fetch(
        GITHUB_TOKEN_URL,
        {
          method: "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            client_id:
              GITHUB_CLIENT_ID,

            client_secret:
              GITHUB_CLIENT_SECRET,

            code,
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error_description ||
          data?.error ||
          "Unable to exchange GitHub authorization code."
      );
    }

    if (
      !data?.access_token
    ) {
      throw new Error(
        "GitHub did not return an access token."
      );
    }

    return data;
  };

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  GITHUB_AUTH_URL,
  GITHUB_TOKEN_URL,
  GITHUB_SCOPES,
  getGitHubAuthorizationUrl,
  exchangeGitHubCode,
};