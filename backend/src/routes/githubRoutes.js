const express = require("express");

const {
  startGitHubAuth,
  githubCallback,
  getGitHubStatus,
  disconnectGitHub,
} = require("../controllers/githubController");

const {
  requireAuth,
} = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GITHUB OAUTH
|--------------------------------------------------------------------------
*/

// Start GitHub OAuth
router.get(
  "/authorize",
  requireAuth,
  startGitHubAuth
);

// GitHub OAuth callback
router.get(
  "/callback",
  githubCallback
);

/*
|--------------------------------------------------------------------------
| GITHUB CONNECTION STATUS
|--------------------------------------------------------------------------
*/

// Check whether GitHub is connected
router.get(
  "/status",
  requireAuth,
  getGitHubStatus
);

/*
|--------------------------------------------------------------------------
| DISCONNECT GITHUB
|--------------------------------------------------------------------------
*/

// Disconnect GitHub
router.delete(
  "/disconnect",
  requireAuth,
  disconnectGitHub
);

module.exports = router;