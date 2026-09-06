const crypto = require("crypto");

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashOtp = (otp) => {
  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
};

const getOtpExpiry = () => {
  return Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;
};

const isOtpExpired = (expiresAt) => {
  return Date.now() > expiresAt;
};

module.exports = {
  generateOtp,
  hashOtp,
  getOtpExpiry,
  isOtpExpired,
  MAX_ATTEMPTS,
  OTP_EXPIRY_MINUTES,
};