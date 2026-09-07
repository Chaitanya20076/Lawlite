const { DropboxAuth } = require("dropbox");

const createDropboxAuth = () => {
  if (
    !process.env.DROPBOX_APP_KEY ||
    !process.env.DROPBOX_APP_SECRET ||
    !process.env.DROPBOX_REDIRECT_URI
  ) {
    throw new Error(
      "Dropbox OAuth environment variables are missing."
    );
  }

  return new DropboxAuth({
    clientId: process.env.DROPBOX_APP_KEY,
    clientSecret: process.env.DROPBOX_APP_SECRET,
  });
};

const getDropboxAuthorizationUrl = async (state) => {
  const auth = createDropboxAuth();

  return auth.getAuthenticationUrl(
    process.env.DROPBOX_REDIRECT_URI,
    state,
    "code",
    "offline",
    [
      "account_info.read",
      "files.metadata.read",
      "files.content.read",
    ],
    "none",
    false
  );
};

const exchangeDropboxCodeForTokens = async (code) => {
  const auth = createDropboxAuth();

  const response = await auth.getAccessTokenFromCode(
    process.env.DROPBOX_REDIRECT_URI,
    code
  );

  return response?.result || {};
};

module.exports = {
  createDropboxAuth,
  getDropboxAuthorizationUrl,
  exchangeDropboxCodeForTokens,
};