/*
|--------------------------------------------------------------------------
| LAWLITE AI CONCURRENCY SERVICE
|--------------------------------------------------------------------------
|
| Prototype-friendly in-memory concurrency manager.
|
| Goals:
|
| 1. Allow multiple users to use Lawlite at the same time.
| 2. Keep every AI request independent.
| 3. Prevent one user from consuming all Sarvam capacity.
| 4. Limit global concurrent AI calls.
| 5. Queue excess requests instead of failing immediately.
|
|--------------------------------------------------------------------------
|
| PROTOTYPE LIMITS
|
| Global active AI requests:
|   3
|
| Active AI requests per authenticated user:
|   1
|
| Maximum queued requests:
|   30
|
| Maximum queue wait:
|   60 seconds
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| CONFIGURATION
|--------------------------------------------------------------------------
*/

const MAX_GLOBAL_CONCURRENT =
  3;

const MAX_CONCURRENT_PER_USER =
  1;

const MAX_QUEUE_SIZE =
  30;

const MAX_QUEUE_WAIT_MS =
  60 * 1000;


/*
|--------------------------------------------------------------------------
| STATE
|--------------------------------------------------------------------------
|
| These values live only inside this Node process.
|
| This is intentional for the prototype.
|
|--------------------------------------------------------------------------
*/

let activeGlobal =
  0;


/*
 * Map:
 *
 * uid -> number of currently running AI requests
 */

const activeByUser =
  new Map();


/*
 * Waiting jobs.
 */

const queue = [];


/*
|--------------------------------------------------------------------------
| JOB COUNTER
|--------------------------------------------------------------------------
*/

let jobSequence =
  0;


/*
|--------------------------------------------------------------------------
| GENERATE JOB ID
|--------------------------------------------------------------------------
*/

const generateJobId = () => {

  jobSequence += 1;


  return (
    `ai-${Date.now().toString(36)}-` +
    `${jobSequence.toString(36)}`
  );
};


/*
|--------------------------------------------------------------------------
| NORMALIZE USER IDENTITY
|--------------------------------------------------------------------------
*/

const normalizeUserId = (
  uid
) => {

  /*
   * Authentication should already guarantee a UID.
   *
   * Still, avoid using undefined as a shared bucket.
   */

  if (
    typeof uid === "string" &&
    uid.trim()
  ) {
    return uid.trim();
  }


  return "unknown-user";
};


/*
|--------------------------------------------------------------------------
| GET USER ACTIVE COUNT
|--------------------------------------------------------------------------
*/

const getUserActiveCount = (
  uid
) => {

  const normalizedUid =
    normalizeUserId(uid);


  return (
    activeByUser.get(
      normalizedUid
    ) || 0
  );
};


/*
|--------------------------------------------------------------------------
| INCREMENT USER ACTIVE COUNT
|--------------------------------------------------------------------------
*/

const incrementUserActive = (
  uid
) => {

  const normalizedUid =
    normalizeUserId(uid);


  const current =
    getUserActiveCount(
      normalizedUid
    );


  activeByUser.set(
    normalizedUid,
    current + 1
  );
};


/*
|--------------------------------------------------------------------------
| DECREMENT USER ACTIVE COUNT
|--------------------------------------------------------------------------
*/

const decrementUserActive = (
  uid
) => {

  const normalizedUid =
    normalizeUserId(uid);


  const current =
    getUserActiveCount(
      normalizedUid
    );


  if (
    current <= 1
  ) {
    activeByUser.delete(
      normalizedUid
    );

    return;
  }


  activeByUser.set(
    normalizedUid,
    current - 1
  );
};


/*
|--------------------------------------------------------------------------
| REMOVE JOB FROM QUEUE
|--------------------------------------------------------------------------
*/

const removeJobFromQueue = (
  job
) => {

  const index =
    queue.indexOf(
      job
    );


  if (
    index === -1
  ) {
    return false;
  }


  queue.splice(
    index,
    1
  );


  return true;
};


/*
|--------------------------------------------------------------------------
| REJECT EXPIRED JOBS
|--------------------------------------------------------------------------
*/

const rejectExpiredJobs = () => {

  const now =
    Date.now();


  /*
   * Work backwards so removing elements
   * doesn't disturb the remaining indexes.
   */

  for (
    let index =
      queue.length - 1;

    index >= 0;

    index -= 1
  ) {

    const job =
      queue[index];


    if (
      job.started
    ) {
      continue;
    }


    if (
      now -
        job.queuedAt >=
      MAX_QUEUE_WAIT_MS
    ) {

      queue.splice(
        index,
        1
      );


      job.reject(
        createQueueError(
          "AI_QUEUE_TIMEOUT",
          "Lawlite is currently busy. Your request waited too long in the AI queue. Please try again."
        )
      );


      console.warn(
        `⏱️ AI queue timeout | ` +
        `job=${job.id} | ` +
        `uid=${job.uid}`
      );
    }
  }
};


/*
|--------------------------------------------------------------------------
| CREATE STANDARD QUEUE ERROR
|--------------------------------------------------------------------------
*/

const createQueueError = (
  code,
  message
) => {

  const error =
    new Error(
      message
    );


  error.code =
    code;


  return error;
};


/*
|--------------------------------------------------------------------------
| FIND NEXT AVAILABLE JOB
|--------------------------------------------------------------------------
|
| Important:
|
| We do NOT simply take queue[0].
|
| Imagine:
|
| A1 is running
| A2 is waiting
| B1 is waiting
| C1 is waiting
|
| If we waited for A2, B and C would unnecessarily be blocked.
|
| Instead we find the first queued job whose user does not already
| occupy an active AI slot.
|
|--------------------------------------------------------------------------
*/

const findNextAvailableJob = () => {

  /*
   * Remove jobs that waited too long.
   */

  rejectExpiredJobs();


  /*
   * Global capacity exhausted.
   */

  if (
    activeGlobal >=
    MAX_GLOBAL_CONCURRENT
  ) {
    return null;
  }


  /*
   * Search the queue for a user who currently has no active AI job.
   */

  for (
    let index = 0;

    index <
      queue.length;

    index += 1
  ) {

    const job =
      queue[index];


    if (
      job.started
    ) {
      continue;
    }


    const userActive =
      getUserActiveCount(
        job.uid
      );


    if (
      userActive <
      MAX_CONCURRENT_PER_USER
    ) {

      return job;
    }
  }


  return null;
};


/*
|--------------------------------------------------------------------------
| START JOB
|--------------------------------------------------------------------------
*/

const startJob = (
  job
) => {

  if (
    !job ||
    job.started
  ) {
    return false;
  }


  /*
   * Remove the job from the waiting queue.
   */

  removeJobFromQueue(
    job
  );


  job.started =
    true;

  job.startedAt =
    Date.now();


  /*
   * Reserve capacity.
   */

  activeGlobal +=
    1;


  incrementUserActive(
    job.uid
  );


  /*
   * Log the allocation.
   */

  console.log(
    `🤖 AI slot acquired | ` +
    `job=${job.id} | ` +
    `uid=${job.uid} | ` +
    `global=${activeGlobal}/${MAX_GLOBAL_CONCURRENT} | ` +
    `user=${getUserActiveCount(job.uid)}/${MAX_CONCURRENT_PER_USER} | ` +
    `queue=${queue.length}`
  );


  /*
   * Execute the actual AI work asynchronously.
   *
   * Nothing from another request is shared here.
   */

  Promise.resolve()
    .then(
      () => job.task()
    )
    .then(
      (result) => {

        finishJob(
          job
        );


        job.resolve(
          result
        );

      }
    )
    .catch(
      (error) => {

        finishJob(
          job
        );


        job.reject(
          error
        );

      }
    );


  return true;
};


/*
|--------------------------------------------------------------------------
| FINISH JOB
|--------------------------------------------------------------------------
*/

const finishJob = (
  job
) => {

  /*
   * Release capacity.
   */

  activeGlobal =
    Math.max(
      0,
      activeGlobal - 1
    );


  decrementUserActive(
    job.uid
  );


  const durationMs =
    Date.now() -
    (job.startedAt ||
      job.queuedAt);


  console.log(
    `✅ AI slot released | ` +
    `job=${job.id} | ` +
    `uid=${job.uid} | ` +
    `${durationMs}ms | ` +
    `global=${activeGlobal}/${MAX_GLOBAL_CONCURRENT} | ` +
    `queue=${queue.length}`
  );


  /*
   * Immediately attempt to start another queued request.
   */

  processQueue();
};


/*
|--------------------------------------------------------------------------
| PROCESS QUEUE
|--------------------------------------------------------------------------
*/

const processQueue = () => {

  /*
   * There may be multiple free global slots.
   *
   * Keep starting jobs until:
   *
   * - global capacity is full
   * - or no eligible queued job remains.
   */

  while (
    activeGlobal <
      MAX_GLOBAL_CONCURRENT
  ) {

    const nextJob =
      findNextAvailableJob();


    if (!nextJob) {
      break;
    }


    startJob(
      nextJob
    );
  }
};


/*
|--------------------------------------------------------------------------
| RUN WITH AI SLOT
|--------------------------------------------------------------------------
|
| Usage:
|
| await runWithAiSlot(
|   req.user.uid,
|   () => generateChatResponse(...),
|   {
|     requestId: req.requestId
|   }
| );
|
|--------------------------------------------------------------------------
*/

const runWithAiSlot = (
  uid,
  task,
  options = {}
) => {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      /*
       * Require an actual function.
       */

      if (
        typeof task !==
        "function"
      ) {

        reject(
          createQueueError(
            "INVALID_AI_TASK",
            "Invalid AI task."
          )
        );

        return;
      }


      const normalizedUid =
        normalizeUserId(
          uid
        );


      /*
       * Prevent unlimited queue growth.
       */

      if (
        queue.length >=
        MAX_QUEUE_SIZE
      ) {

        reject(
          createQueueError(
            "AI_QUEUE_FULL",
            "Lawlite is currently handling too many requests. Please try again in a moment."
          )
        );

        return;
      }


      const job = {
        id:
          generateJobId(),

        uid:
          normalizedUid,

        requestId:
          options.requestId ||
          null,

        task,

        resolve,

        reject,

        queuedAt:
          Date.now(),

        startedAt:
          null,

        started:
          false,
      };


      queue.push(
        job
      );


      console.log(
        `⏳ AI request queued | ` +
        `job=${job.id} | ` +
        `uid=${job.uid} | ` +
        `requestId=${job.requestId || "none"} | ` +
        `queue=${queue.length}`
      );


      /*
       * Try immediately.
       */

      processQueue();

    }
  );
};


/*
|--------------------------------------------------------------------------
| GET QUEUE STATE
|--------------------------------------------------------------------------
|
| Useful for debugging and local testing.
|--------------------------------------------------------------------------
*/

const getAiQueueState = () => {

  const queuedByUser =
    {};


  for (
    const job of queue
  ) {

    queuedByUser[job.uid] =
      (
        queuedByUser[job.uid] ||
        0
      ) + 1;
  }


  return {
    global: {
      active:
        activeGlobal,

      limit:
        MAX_GLOBAL_CONCURRENT,

      available:
        Math.max(
          0,
          MAX_GLOBAL_CONCURRENT -
            activeGlobal
        ),
    },

    queue: {
      waiting:
        queue.length,

      limit:
        MAX_QUEUE_SIZE,

      waitingByUser:
        queuedByUser,
    },

    users: {
      active:
        Object.fromEntries(
          activeByUser
        ),
    },
  };
};


/*
|--------------------------------------------------------------------------
| CANCEL QUEUED REQUEST
|--------------------------------------------------------------------------
|
| The request route can use this later if we add AbortController support.
|--------------------------------------------------------------------------
*/

const cancelQueuedRequest = (
  jobId
) => {

  const job =
    queue.find(
      (queuedJob) =>
        queuedJob.id ===
        jobId
    );


  if (!job) {
    return false;
  }


  removeJobFromQueue(
    job
  );


  job.reject(
    createQueueError(
      "AI_REQUEST_CANCELLED",
      "The AI request was cancelled."
    )
  );


  console.log(
    `🛑 AI queued request cancelled | ` +
    `job=${job.id} | ` +
    `uid=${job.uid}`
  );


  processQueue();


  return true;
};


/*
|--------------------------------------------------------------------------
| RESET QUEUE
|--------------------------------------------------------------------------
|
| DEVELOPMENT ONLY.
|
| Do not expose this through a public API.
|--------------------------------------------------------------------------
*/

const resetAiQueue =
  () => {

    /*
     * Reject everything still waiting.
     */

    while (
      queue.length > 0
    ) {

      const job =
        queue.shift();


      if (
        !job
      ) {
        continue;
      }


      job.reject(
        createQueueError(
          "AI_QUEUE_RESET",
          "The AI queue was reset."
        )
      );
    }


    /*
     * Active requests cannot safely be force-stopped
     * here because the underlying Sarvam promise belongs
     * to the route that created it.
     *
     * The active counters are therefore intentionally
     * left alone.
     */

    processQueue();
  };


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  runWithAiSlot,

  getAiQueueState,

  cancelQueuedRequest,

  resetAiQueue,

  MAX_GLOBAL_CONCURRENT,

  MAX_CONCURRENT_PER_USER,

  MAX_QUEUE_SIZE,

  MAX_QUEUE_WAIT_MS,
};