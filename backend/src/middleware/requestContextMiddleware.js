/*
|--------------------------------------------------------------------------
| LAWLITE REQUEST CONTEXT MIDDLEWARE
|--------------------------------------------------------------------------
|
| Gives every incoming request:
|
| - a unique request ID
| - authenticated Firebase UID
| - request start time
|
| This is important for concurrent users because every request gets its
| own independent context.
|
| Example:
|
| Request A
|   requestId = 9f8c...
|   uid       = userA
|
| Request B
|   requestId = 23aa...
|   uid       = userB
|
| They are never stored as a single global "current request".
|
|--------------------------------------------------------------------------
*/

const crypto = require("crypto");


/*
|--------------------------------------------------------------------------
| REQUEST ID
|--------------------------------------------------------------------------
*/

const generateRequestId = () => {
  try {
    return crypto.randomUUID();
  } catch (error) {
    /*
     * Fallback for environments where randomUUID is unavailable.
     */

    return (
      `${Date.now().toString(36)}-` +
      `${Math.random().toString(36).slice(2, 12)}`
    );
  }
};


/*
|--------------------------------------------------------------------------
| REQUEST CONTEXT
|--------------------------------------------------------------------------
*/

const requestContextMiddleware = (
  req,
  res,
  next
) => {

  /*
   * Create a completely independent ID for this HTTP request.
   */

  const requestId =
    generateRequestId();


  /*
   * Store the request start time.
   */

  const startedAt =
    Date.now();


  /*
   * Authentication middleware should normally run before this
   * middleware when we need the Firebase UID here.
   *
   * Still, we safely read it if available.
   */

  const uid =
    req.user?.uid || null;


  /*
   * Attach request context directly to req.
   *
   * Nothing here is global.
   */

  req.requestId =
    requestId;


  req.requestContext = {
    requestId,

    uid,

    startedAt,

    startedAtIso:
      new Date(
        startedAt
      ).toISOString(),
  };


  /*
   * Send the request ID back to the frontend.
   *
   * This is extremely useful while debugging concurrent requests.
   */

  res.set(
    "X-Lawlite-Request-Id",
    requestId
  );


  /*
   * Make sure the response finishes with useful timing information.
   *
   * "finish" fires when Node has handed the response to the underlying
   * HTTP system.
   */

  res.on(
    "finish",
    () => {

      const durationMs =
        Date.now() -
        startedAt;


      const statusCode =
        res.statusCode;


      const identity =
        req.user?.uid ||
        uid ||
        "anonymous";


      /*
       * Keep normal successful requests relatively quiet.
       */

      if (
        statusCode >= 200 &&
        statusCode < 400
      ) {

        console.log(
          `✅ Lawlite request ${requestId} | ` +
          `uid=${identity} | ` +
          `${req.method} ${req.originalUrl} | ` +
          `status=${statusCode} | ` +
          `${durationMs}ms`
        );

        return;
      }


      /*
       * Highlight client/server errors.
       */

      console.warn(
        `⚠️ Lawlite request ${requestId} | ` +
        `uid=${identity} | ` +
        `${req.method} ${req.originalUrl} | ` +
        `status=${statusCode} | ` +
        `${durationMs}ms`
      );

    }
  );


  /*
   * Continue to the next middleware.
   */

  next();
};


/*
|--------------------------------------------------------------------------
| GET REQUEST CONTEXT
|--------------------------------------------------------------------------
|
| Small helper for services/routes that want a safe snapshot.
|--------------------------------------------------------------------------
*/

const getRequestContext = (
  req
) => {

  if (
    !req?.requestContext
  ) {
    return {
      requestId:
        req?.requestId ||
        null,

      uid:
        req?.user?.uid ||
        null,

      startedAt:
        null,

      startedAtIso:
        null,
    };
  }


  return {
    requestId:
      req.requestContext.requestId ||
      null,

    uid:
      req.requestContext.uid ||
      req.user?.uid ||
      null,

    startedAt:
      req.requestContext.startedAt ||
      null,

    startedAtIso:
      req.requestContext.startedAtIso ||
      null,
  };
};


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  requestContextMiddleware,
  generateRequestId,
  getRequestContext,
};