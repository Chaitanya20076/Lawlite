const express = require("express");

const {
  requireAuth,
} = require("../middleware/authMiddleware");

const {
  startDropboxAuth,
  dropboxCallback,
  getDropboxStatus,
  disconnectDropbox,
} = require("../controllers/dropboxController");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| START DROPBOX CONNECTION
|--------------------------------------------------------------------------
*/

router.get(
  "/authorize",
  requireAuth,
  startDropboxAuth
);

/*
|--------------------------------------------------------------------------
| DROPBOX OAUTH CALLBACK
|--------------------------------------------------------------------------
|
| This route must NOT use requireAuth because Dropbox
| redirects the browser here directly.
|
*/

router.get(
  "/callback",
  dropboxCallback
);

/*
|--------------------------------------------------------------------------
| CONNECTION STATUS
|--------------------------------------------------------------------------
*/

router.get(
  "/status",
  requireAuth,
  getDropboxStatus
);

/*
|--------------------------------------------------------------------------
| DISCONNECT
|--------------------------------------------------------------------------
*/

router.delete(
  "/disconnect",
  requireAuth,
  disconnectDropbox
);

module.exports = router;