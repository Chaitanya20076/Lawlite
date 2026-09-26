/*
|--------------------------------------------------------------------------
| LAWLITE RATE LIMIT MIDDLEWARE
|--------------------------------------------------------------------------
|
| Prototype-friendly, in-memory rate limiter.
|
| IMPORTANT:
|
| - Authentication must run BEFORE this middleware.
| - The authenticated Firebase UID is used as the primary identity.
| - IP is used only as a fallback.
|
| This means:
|
| User A -> UID A -> separate bucket
| User B -> UID B -> separate bucket
|
| No user identity is taken from req.body.
|
|--------------------------------------------------------------------------
*/

const buckets = new Map();


/*
|--------------------------------------------------------------------------
| CONFIGURATION
|--------------------------------------------------------------------------
*/

/*
 * Normal chat:
 *
 * Maximum 10 requests per rolling minute.
 */

const CHAT_WINDOW_MS =
  60 * 1000;

const CHAT_MAX_REQUESTS =
  10;


/*
 * Burst protection:
 *
 * Maximum 3 requests in 10 seconds.
 */

const CHAT_BURST_WINDOW_MS =
  10 * 1000;

const CHAT_BURST_MAX_REQUESTS =
  3;


/*
 * Chat title generation is also an AI request,
 * but its limit is separate.
 */

const TITLE_WINDOW_MS =
  5 * 60 * 1000;

const TITLE_MAX_REQUESTS =
  10;


/*
|--------------------------------------------------------------------------
| CLEANUP
|--------------------------------------------------------------------------
|
| Remove old entries periodically so the Map does not grow forever.
|--------------------------------------------------------------------------
*/

const CLEANUP_INTERVAL_MS =
  5 * 60 * 1000;

const cleanupInterval =
  setInterval(() => {

    const now =
      Date.now();


    for (
      const [
        key,
        timestamps,
      ] of buckets.entries()
    ) {

      const recent =
        timestamps.filter(
          (timestamp) =>
            now -
              timestamp <
            TITLE_WINDOW_MS
        );


      if (
        recent.length === 0
      ) {
        buckets.delete(
          key
        );
      } else {
        buckets.set(
          key,
          recent
        );
      }

    }

  }, CLEANUP_INTERVAL_MS);


/*
 * Do not keep the Node process alive
 * just because of the cleanup timer.
 */

if (
  cleanupInterval &&
  typeof cleanupInterval.unref ===
    "function"
) {
  cleanupInterval.unref();
}


/*
|--------------------------------------------------------------------------
| GET REQUEST IDENTITY
|--------------------------------------------------------------------------
*/

const getRequestIdentity =
  (req) => {

    /*
     * requireAuth should already have populated
     * req.user.
     */

    const uid =
      req.user?.uid;


    if (uid) {
      return `uid:${uid}`;
    }


    /*
     * Fallback only.
     *
     * Chat should normally never reach this branch
     * because requireAuth runs first.
     */

    const forwarded =
      req.headers[
        "x-forwarded-for"
      ];


    const forwardedIp =
      Array.isArray(
        forwarded
      )
        ? forwarded[0]
        : String(
            forwarded || ""
          )
            .split(",")[0]
            .trim();


    const ip =
      forwardedIp ||
      req.ip ||
      req.socket?.remoteAddress ||
      "unknown";


    return `ip:${ip}`;
  };


/*
|--------------------------------------------------------------------------
| GET BUCKET
|--------------------------------------------------------------------------
*/

const getBucket =
  (identity, scope) => {

    const key =
      `${scope}:${identity}`;


    let timestamps =
      buckets.get(key);


    if (!timestamps) {
      timestamps = [];

      buckets.set(
        key,
        timestamps
      );
    }


    return {
      key,
      timestamps,
    };
  };


/*
|--------------------------------------------------------------------------
| REMOVE EXPIRED TIMESTAMPS
|--------------------------------------------------------------------------
*/

const removeExpired =
  (
    timestamps,
    windowMs,
    now
  ) => {

    const cutoff =
      now -
      windowMs;


    /*
     * Timestamps are always appended
     * in chronological order.
     */

    let firstValidIndex = 0;


    while (
      firstValidIndex <
        timestamps.length &&
      timestamps[firstValidIndex] <=
        cutoff
    ) {
      firstValidIndex += 1;
    }


    if (
      firstValidIndex > 0
    ) {
      timestamps.splice(
        0,
        firstValidIndex
      );
    }

    return timestamps;
  };


/*
|--------------------------------------------------------------------------
| BUILD 429 RESPONSE
|--------------------------------------------------------------------------
*/

const sendRateLimitResponse =
  (
    res,
    retryAfterSeconds,
    scope
  ) => {

    const retryAfter =
      Math.max(
        1,
        Math.ceil(
          retryAfterSeconds
        )
      );


    res.set(
      "Retry-After",
      String(
        retryAfter
      )
    );


    res.set(
      "X-Lawlite-RateLimit-Scope",
      scope
    );


    return res
      .status(429)
      .json({
        success: false,

        rateLimited:
          true,

        message:
          "You've reached the Lawlite request limit. Please wait a moment and try again.",

        retryAfterSeconds:
          retryAfter,
      });
  };


/*
|--------------------------------------------------------------------------
| CHAT RATE LIMITER
|--------------------------------------------------------------------------
|
| Applied AFTER requireAuth.
|--------------------------------------------------------------------------
*/

const chatRateLimiter =
  (req, res, next) => {

    const identity =
      getRequestIdentity(req);


    const now =
      Date.now();


    /*
     * ---------------------------------------------------------------
     * ROLLING MINUTE
     * ---------------------------------------------------------------
     */

    const minuteBucket =
      getBucket(
        identity,
        "chat-minute"
      );


    removeExpired(
      minuteBucket.timestamps,
      CHAT_WINDOW_MS,
      now
    );


    if (
      minuteBucket.timestamps.length >=
      CHAT_MAX_REQUESTS
    ) {

      const oldest =
        minuteBucket.timestamps[0];


      const retryAfterMs =
        CHAT_WINDOW_MS -
        (now - oldest);


      console.warn(
        `⚠️ Lawlite chat rate limit reached: ${identity}`
      );


      return sendRateLimitResponse(
        res,
        retryAfterMs / 1000,
        "chat-minute"
      );
    }


    /*
     * ---------------------------------------------------------------
     * BURST LIMIT
     * ---------------------------------------------------------------
     */

    const burstBucket =
      getBucket(
        identity,
        "chat-burst"
      );


    removeExpired(
      burstBucket.timestamps,
      CHAT_BURST_WINDOW_MS,
      now
    );


    if (
      burstBucket.timestamps.length >=
      CHAT_BURST_MAX_REQUESTS
    ) {

      const oldest =
        burstBucket.timestamps[0];


      const retryAfterMs =
        CHAT_BURST_WINDOW_MS -
        (now - oldest);


      console.warn(
        `⚠️ Lawlite chat burst limit reached: ${identity}`
      );


      return sendRateLimitResponse(
        res,
        retryAfterMs / 1000,
        "chat-burst"
      );
    }


    /*
     * ---------------------------------------------------------------
     * RECORD REQUEST
     * ---------------------------------------------------------------
     */

    minuteBucket.timestamps.push(
      now
    );

    burstBucket.timestamps.push(
      now
    );


    /*
     * Expose useful information to later
     * middleware / route logging.
     */

    req.rateLimit = {
      identity,

      minute: {
        limit:
          CHAT_MAX_REQUESTS,

        remaining:
          Math.max(
            0,
            CHAT_MAX_REQUESTS -
              minuteBucket.timestamps.length
          ),
      },

      burst: {
        limit:
          CHAT_BURST_MAX_REQUESTS,

        remaining:
          Math.max(
            0,
            CHAT_BURST_MAX_REQUESTS -
              burstBucket.timestamps.length
          ),
      },
    };


    next();
  };


/*
|--------------------------------------------------------------------------
| CHAT TITLE RATE LIMITER
|--------------------------------------------------------------------------
*/

const titleRateLimiter =
  (req, res, next) => {

    const identity =
      getRequestIdentity(req);


    const now =
      Date.now();


    const bucket =
      getBucket(
        identity,
        "title"
      );


    removeExpired(
      bucket.timestamps,
      TITLE_WINDOW_MS,
      now
    );


    if (
      bucket.timestamps.length >=
      TITLE_MAX_REQUESTS
    ) {

      const oldest =
        bucket.timestamps[0];


      const retryAfterMs =
        TITLE_WINDOW_MS -
        (now - oldest);


      console.warn(
        `⚠️ Lawlite title rate limit reached: ${identity}`
      );


      return sendRateLimitResponse(
        res,
        retryAfterMs / 1000,
        "title"
      );
    }


    bucket.timestamps.push(
      now
    );


    req.rateLimit = {
      identity,

      limit:
        TITLE_MAX_REQUESTS,

      remaining:
        Math.max(
          0,
          TITLE_MAX_REQUESTS -
            bucket.timestamps.length
        ),
    };


    next();
  };


/*
|--------------------------------------------------------------------------
| RESET ALL LIMITERS
|--------------------------------------------------------------------------
|
| Useful for local development/testing.
|--------------------------------------------------------------------------
*/

const resetRateLimits =
  () => {

    buckets.clear();

  };


/*
|--------------------------------------------------------------------------
| GET RATE LIMIT STATE
|--------------------------------------------------------------------------
|
| Useful for debugging.
|--------------------------------------------------------------------------
*/

const getRateLimitState =
  (req) => {

    const identity =
      getRequestIdentity(req);


    const now =
      Date.now();


    const minuteBucket =
      getBucket(
        identity,
        "chat-minute"
      );


    const burstBucket =
      getBucket(
        identity,
        "chat-burst"
      );


    removeExpired(
      minuteBucket.timestamps,
      CHAT_WINDOW_MS,
      now
    );


    removeExpired(
      burstBucket.timestamps,
      CHAT_BURST_WINDOW_MS,
      now
    );


    return {
      identity,

      minute: {
        used:
          minuteBucket.timestamps.length,

        limit:
          CHAT_MAX_REQUESTS,

        remaining:
          Math.max(
            0,
            CHAT_MAX_REQUESTS -
              minuteBucket.timestamps.length
          ),
      },

      burst: {
        used:
          burstBucket.timestamps.length,

        limit:
          CHAT_BURST_MAX_REQUESTS,

        remaining:
          Math.max(
            0,
            CHAT_BURST_MAX_REQUESTS -
              burstBucket.timestamps.length
          ),
      },
    };
  };


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  chatRateLimiter,
  titleRateLimiter,
  resetRateLimits,
  getRateLimitState,
};