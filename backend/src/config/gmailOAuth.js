const { google } = require("googleapis");

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI;

if (!GMAIL_CLIENT_ID) {
  console.warn("⚠️ GMAIL_CLIENT_ID is missing from environment variables.");
}

if (!GMAIL_CLIENT_SECRET) {
  console.warn("⚠️ GMAIL_CLIENT_SECRET is missing from environment variables.");
}

if (!GMAIL_REDIRECT_URI) {
  console.warn("⚠️ GMAIL_REDIRECT_URI is missing from environment variables.");
}

const gmailOAuth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REDIRECT_URI
);

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
];

const getGmailAuthorizationUrl = (state) => {
  return gmailOAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    ...(state ? { state } : {}),
  });
};

const exchangeGmailCode = async (code) => {
  if (!code) {
    throw new Error("Gmail authorization code is required.");
  }

  const { tokens } = await gmailOAuth2Client.getToken(code);

  return tokens;
};

const createGmailOAuthClient = ({
  accessToken,
  refreshToken,
  expiryDate,
} = {}) => {
  const client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI
  );

  client.setCredentials({
    access_token: accessToken || undefined,
    refresh_token: refreshToken || undefined,
    expiry_date: expiryDate || undefined,
  });

  return client;
};

module.exports = {
  gmailOAuth2Client,
  GMAIL_SCOPES,
  getGmailAuthorizationUrl,
  exchangeGmailCode,
  createGmailOAuthClient,
};