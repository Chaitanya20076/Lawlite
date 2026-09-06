const crypto = require("crypto");

const STATE_SECRET =
  process.env.GOOGLE_OAUTH_STATE_SECRET ||
  process.env.SARVAM_API_KEY;

const createState = (uid) => {
  if (!uid) {
    throw new Error(
      "Firebase UID is required to create OAuth state."
    );
  }

  if (!STATE_SECRET) {
    throw new Error(
      "OAuth state secret is not configured."
    );
  }

  const payload = Buffer.from(
    JSON.stringify({
      uid,
      createdAt: Date.now(),
      nonce: crypto.randomBytes(16).toString("hex"),
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", STATE_SECRET)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
};

const verifyState = (state) => {
  if (!state || !STATE_SECRET) {
    return null;
  }

  const [payload, signature] =
    state.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature =
    crypto
      .createHmac("sha256", STATE_SECRET)
      .update(payload)
      .digest("base64url");

  const signaturesMatch =
    signature.length ===
      expectedSignature.length &&
    crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

  if (!signaturesMatch) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString(
        "utf8"
      )
    );

    const STATE_MAX_AGE = 10 * 60 * 1000;

    if (
      !decoded.uid ||
      !decoded.createdAt ||
      Date.now() - decoded.createdAt >
        STATE_MAX_AGE
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
};

module.exports = {
  createState,
  verifyState,
};