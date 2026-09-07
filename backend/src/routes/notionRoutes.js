const express = require("express");

const {
  requireAuth,
} = require("../middleware/authMiddleware");

const {
  startNotionAuth,
  notionCallback,
  getNotionStatus,
  disconnectNotion,
} = require("../controllers/notionController");

const router = express.Router();


/*
|--------------------------------------------------------------------------
| START NOTION OAUTH
|--------------------------------------------------------------------------
*/

router.get(
  "/authorize",
  requireAuth,
  startNotionAuth
);


/*
|--------------------------------------------------------------------------
| NOTION OAUTH CALLBACK
|--------------------------------------------------------------------------
|
| This route must NOT use requireAuth because
| Notion redirects the browser here after OAuth.
|
|--------------------------------------------------------------------------
*/

router.get(
  "/callback",
  notionCallback
);


/*
|--------------------------------------------------------------------------
| NOTION CONNECTION STATUS
|--------------------------------------------------------------------------
*/

router.get(
  "/status",
  requireAuth,
  getNotionStatus
);


/*
|--------------------------------------------------------------------------
| DISCONNECT NOTION
|--------------------------------------------------------------------------
*/

router.delete(
  "/disconnect",
  requireAuth,
  disconnectNotion
);


module.exports = router;