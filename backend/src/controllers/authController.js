const {
  generateOtp,
  hashOtp,
  getOtpExpiry,
  isOtpExpired,
  MAX_ATTEMPTS,
  OTP_EXPIRY_MINUTES,
} = require("../utils/otp");

const {
  sendBrevoEmail,
} = require("../services/brevoService");

const { auth } = require("../config/firebase");

// Temporary in-memory signup verification storage
const signupStore = new Map();


// ==========================================
// SEND OTP
// ==========================================

const sendOtp = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid name.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // Check whether Firebase account already exists
    try {
      await auth.getUserByEmail(normalizedEmail);

      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    } catch (error) {
      // auth/user-not-found means we're good to continue
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }

    // Generate OTP
    const otp = generateOtp();

    // Store signup information temporarily
    signupStore.set(normalizedEmail, {
      name: trimmedName,
      password,
      otpHash: hashOtp(otp),
      expiresAt: getOtpExpiry(),
      attempts: 0,
    });

    // Send OTP
    await sendBrevoEmail({
      recipientEmail: normalizedEmail,
      recipientName: trimmedName,

      subject: "Your Lawlite verification code",

      htmlContent: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 25px;
          color: #171717;
        ">

          <h1 style="
            margin-bottom: 10px;
            color: #c9a227;
          ">
            Lawlite
          </h1>

          <h2>
            Verify your email
          </h2>

          <p>
            Hi ${trimmedName},
          </p>

          <p>
            Use the verification code below to finish creating
            your Lawlite account.
          </p>

          <div style="
            margin: 30px 0;
            padding: 20px;
            background: #f8f7f3;
            border: 1px solid #e5e3dc;
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #171717;
          ">
            ${otp}
          </div>

          <p>
            This code expires in
            <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
          </p>

          <p style="color: #777;">
            If you didn't request this code, you can safely ignore
            this email.
          </p>

          <hr style="
            border: none;
            border-top: 1px solid #e5e3dc;
            margin: 30px 0;
          " />

          <p style="color: #999; font-size: 13px;">
            Lawlite — Legal language, finally made simple.
          </p>

        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Verification code sent successfully.",
    });

  } catch (error) {
    console.error("Send OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send verification code.",
    });
  }
};


// ==========================================
// VERIFY OTP + CREATE FIREBASE ACCOUNT
// ==========================================

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const signupData = signupStore.get(normalizedEmail);

    if (!signupData) {
      return res.status(400).json({
        success: false,
        message: "No active verification request found.",
      });
    }

    // Check expiry
    if (isOtpExpired(signupData.expiresAt)) {
      signupStore.delete(normalizedEmail);

      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new one.",
      });
    }

    // Check attempts
    if (signupData.attempts >= MAX_ATTEMPTS) {
      signupStore.delete(normalizedEmail);

      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }

    signupData.attempts += 1;

    const incomingHash = hashOtp(otp.trim());

    if (incomingHash !== signupData.otpHash) {
      return res.status(400).json({
        success: false,
        message: "Incorrect verification code.",
        attemptsRemaining:
          MAX_ATTEMPTS - signupData.attempts,
      });
    }

    // ==========================================
    // OTP VERIFIED
    // ==========================================

    let firebaseUser;

    try {
      firebaseUser = await auth.createUser({
        email: normalizedEmail,
        password: signupData.password,
        displayName: signupData.name,
        emailVerified: true,
      });
    } catch (error) {
      console.error("Firebase Create User Error:", error);

      if (error.code === "auth/email-already-exists") {
        signupStore.delete(normalizedEmail);

        return res.status(409).json({
          success: false,
          message: "An account with this email already exists.",
        });
      }

      throw error;
    }

    // Remove temporary signup data
    signupStore.delete(normalizedEmail);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user: {
        uid: firebaseUser.uid,
        name: signupData.name,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
      },
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to complete account verification.",
    });
  }
};


module.exports = {
  sendOtp,
  verifyOtp,
};