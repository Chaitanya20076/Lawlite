const NOTION_AUTHORIZATION_URL =
  "https://api.notion.com/v1/oauth/authorize";

const NOTION_TOKEN_URL =
  "https://api.notion.com/v1/oauth/token";


/*
|--------------------------------------------------------------------------
| VALIDATE NOTION OAUTH CONFIG
|--------------------------------------------------------------------------
*/

const validateNotionOAuthConfig = () => {
  const required = [
    "NOTION_CLIENT_ID",
    "NOTION_CLIENT_SECRET",
    "NOTION_REDIRECT_URI",
  ];

  const missing = required.filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing Notion OAuth environment variables: ${missing.join(", ")}`
    );
  }
};


/*
|--------------------------------------------------------------------------
| CREATE STATE-SAFE AUTHORIZATION URL
|--------------------------------------------------------------------------
*/

const getNotionAuthorizationUrl = ({
  state,
} = {}) => {
  validateNotionOAuthConfig();

  const params = new URLSearchParams({
    owner: "user",
    client_id:
      process.env.NOTION_CLIENT_ID,
    redirect_uri:
      process.env.NOTION_REDIRECT_URI,
    response_type:
      "code",
  });

  if (state) {
    params.set(
      "state",
      state
    );
  }

  return `${NOTION_AUTHORIZATION_URL}?${params.toString()}`;
};


/*
|--------------------------------------------------------------------------
| EXCHANGE AUTHORIZATION CODE
|--------------------------------------------------------------------------
*/

const exchangeNotionCodeForTokens =
  async (code) => {
    validateNotionOAuthConfig();

    if (!code) {
      throw new Error(
        "Notion authorization code is missing."
      );
    }

    const credentials = Buffer
      .from(
        `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
      )
      .toString("base64");


    const response = await fetch(
      NOTION_TOKEN_URL,
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",

          Authorization:
            `Basic ${credentials}`,
        },

        body: JSON.stringify({
          grant_type:
            "authorization_code",

          code,

          redirect_uri:
            process.env
              .NOTION_REDIRECT_URI,
        }),
      }
    );


    const data =
      await response.json();


    if (!response.ok) {
      console.error(
        "Notion token exchange failed:",
        data
      );

      throw new Error(
        data?.error_description ||
          data?.message ||
          "Unable to exchange Notion authorization code."
      );
    }


    return data;
  };


/*
|--------------------------------------------------------------------------
| REFRESH NOTION ACCESS TOKEN
|--------------------------------------------------------------------------
*/

const refreshNotionAccessToken =
  async (refreshToken) => {
    validateNotionOAuthConfig();

    if (!refreshToken) {
      throw new Error(
        "Notion refresh token is missing."
      );
    }


    const credentials = Buffer
      .from(
        `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
      )
      .toString("base64");


    const response = await fetch(
      NOTION_TOKEN_URL,
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",

          Authorization:
            `Basic ${credentials}`,
        },

        body: JSON.stringify({
          grant_type:
            "refresh_token",

          refresh_token:
            refreshToken,
        }),
      }
    );


    const data =
      await response.json();


    if (!response.ok) {
      console.error(
        "Notion token refresh failed:",
        data
      );

      throw new Error(
        data?.error_description ||
          data?.message ||
          "Unable to refresh Notion access token."
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
  NOTION_AUTHORIZATION_URL,
  NOTION_TOKEN_URL,
  getNotionAuthorizationUrl,
  exchangeNotionCodeForTokens,
  refreshNotionAccessToken,
};