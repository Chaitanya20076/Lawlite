const { google } = require("googleapis");

const GOOGLE_DRIVE_SCOPE =
  "https://www.googleapis.com/auth/drive.readonly";

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

const getGoogleAuthorizationUrl = (state) => {
  const oauth2Client = createOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GOOGLE_DRIVE_SCOPE],
    state,
  });
};

const exchangeCodeForTokens = async (code) => {
  const oauth2Client = createOAuthClient();

  const { tokens } =
    await oauth2Client.getToken(code);

  return tokens;
};

const getDriveClient = ({
  accessToken,
  refreshToken,
}) => {
  const oauth2Client = createOAuthClient();

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.drive({
    version: "v3",
    auth: oauth2Client,
  });
};

const listDriveFiles = async ({
  accessToken,
  refreshToken,
}) => {
  const drive = getDriveClient({
    accessToken,
    refreshToken,
  });

  const response = await drive.files.list({
    pageSize: 20,
    fields:
      "files(id,name,mimeType,size,modifiedTime,webViewLink)",
    orderBy: "modifiedTime desc",
  });

  return response.data.files || [];
};

module.exports = {
  GOOGLE_DRIVE_SCOPE,
  createOAuthClient,
  getGoogleAuthorizationUrl,
  exchangeCodeForTokens,
  getDriveClient,
  listDriveFiles,
};