const express = require("express");

const {
  startGmailAuth,
  gmailCallback,
  getGmailStatus,
  disconnectGmail,
} = require("../controllers/gmailController");

const {
  requireAuth,
} = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GMAIL OAUTH
|--------------------------------------------------------------------------
*/

// Start Gmail OAuth
router.get(
  "/authorize",
  requireAuth,
  startGmailAuth
);

// Google OAuth callback
router.get(
  "/callback",
  gmailCallback
);

/*
|--------------------------------------------------------------------------
| GMAIL CONNECTION STATUS
|--------------------------------------------------------------------------
*/

// Check whether Gmail is connected
router.get(
  "/status",
  requireAuth,
  getGmailStatus
);

/*
|--------------------------------------------------------------------------
| DISCONNECT GMAIL
|--------------------------------------------------------------------------
*/

// Disconnect Gmail
router.delete(
  "/disconnect",
  requireAuth,
  disconnectGmail
);

module.exports = router;