const express = require("express");

const {
  startGoogleDriveAuth,
  googleDriveCallback,
  getGoogleDriveStatus,
  getGoogleDriveFiles,
  disconnectGoogleDrive,
} = require("../controllers/connectorController");

const {
  requireAuth,
} = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// GOOGLE DRIVE
// ==========================================

// Start OAuth
router.get(
  "/google/authorize",
  requireAuth,
  startGoogleDriveAuth
);

// Google OAuth callback
router.get(
  "/google/callback",
  googleDriveCallback
);

// Connection status
router.get(
  "/google/status",
  requireAuth,
  getGoogleDriveStatus
);

// List files
router.get(
  "/google/files",
  requireAuth,
  getGoogleDriveFiles
);

// Disconnect
router.delete(
  "/google/disconnect",
  requireAuth,
  disconnectGoogleDrive
);


module.exports = router;