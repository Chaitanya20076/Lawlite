/**
 * Lawlite YouTube Video Reference Service
 *
 * Uses Serper's Videos API to find relevant YouTube references
 * for the current legal conversation.
 *
 * The Serper API key remains server-side.
 */

const SERPER_VIDEOS_URL =
  "https://google.serper.dev/videos";

const MAX_QUERY_LENGTH = 900;
const MAX_RESULTS = 5;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

/*
|--------------------------------------------------------------------------
| CLEAN TEXT
|--------------------------------------------------------------------------
*/

const cleanText = (value = "") =>
  String(value)
    .replace(
      /https?:\/\/\S+/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();


/*
|--------------------------------------------------------------------------
| YOUTUBE URL CHECK
|--------------------------------------------------------------------------
*/

const isYouTubeUrl = (value = "") => {
  try {
    const url = new URL(value);

    return YOUTUBE_HOSTS.has(
      url.hostname.toLowerCase()
    );
  } catch {
    return false;
  }
};


/*
|--------------------------------------------------------------------------
| EXTRACT YOUTUBE VIDEO ID
|--------------------------------------------------------------------------
*/

const extractYouTubeVideoId = (
  value = ""
) => {
  if (
    !value ||
    typeof value !== "string"
  ) {
    return "";
  }

  const input = value.trim();

  if (
    /^[A-Za-z0-9_-]{11}$/.test(
      input
    )
  ) {
    return input;
  }

  try {
    const url = new URL(input);

    const hostname =
      url.hostname.toLowerCase();

    if (
      hostname ===
      "youtu.be"
    ) {
      return (
        url.pathname
          .split("/")
          .filter(Boolean)[0] ||
        ""
      );
    }

    if (
      hostname ===
        "youtube.com" ||
      hostname ===
        "www.youtube.com" ||
      hostname ===
        "m.youtube.com"
    ) {
      const watchId =
        url.searchParams.get(
          "v"
        );

      if (watchId) {
        return watchId;
      }

      const pathParts =
        url.pathname
          .split("/")
          .filter(Boolean);

      const index =
        pathParts.findIndex(
          (part) =>
            part ===
              "shorts" ||
            part ===
              "embed" ||
            part ===
              "live"
        );

      if (index !== -1) {
        return (
          pathParts[index + 1] ||
          ""
        );
      }
    }
  } catch {
    return "";
  }

  return "";
};


/*
|--------------------------------------------------------------------------
| BUILD SEARCH QUERY
|--------------------------------------------------------------------------
|
| Normal questions:
|   use latest user question
|
| Short follow-ups:
|   include a little recent conversation context
|
*/

const buildYouTubeSearchQuery = (
  conversation = []
) => {
  if (
    !Array.isArray(
      conversation
    )
  ) {
    return "";
  }

  const validMessages =
    conversation
      .filter(
        (message) =>
          message &&
          [
            "user",
            "assistant",
          ].includes(
            message.role
          ) &&
          typeof message.content ===
            "string"
      )
      .map(
        (message) => ({
          role:
            message.role,

          content:
            cleanText(
              message.content
            ),
        })
      )
      .filter(
        (message) =>
          message.content.length >
          0
      );

  if (
    !validMessages.length
  ) {
    return "";
  }

  const latestUserMessage =
    [...validMessages]
      .reverse()
      .find(
        (message) =>
          message.role ===
          "user"
      );

  if (
    !latestUserMessage
  ) {
    return "";
  }

  const latestUserText =
    latestUserMessage.content;

  const isShortFollowUp =
    latestUserText.length <
      45 ||
    /^(what about|how about|and|also|why|how|what|that|this|explain that|tell me more)\b/i.test(
      latestUserText
    );

  if (
    !isShortFollowUp
  ) {
    return `${latestUserText} legal explanation`;
  }

  const recentContext =
    validMessages
      .slice(-5)
      .map(
        (message) =>
          message.content
      )
      .join(" ");

  return `${recentContext} legal explanation`;
};


/*
|--------------------------------------------------------------------------
| LEGAL RELEVANCE CHECK
|--------------------------------------------------------------------------
|
| This is only a lightweight guard.
| Serper still performs the actual relevance ranking.
|
*/

const looksRelevantForLegalVideo = (
  video = {}
) => {
  const haystack = [
    video.title,
    video.snippet,
    video.channel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const legalSignals = [
    "law",
    "legal",
    "court",
    "case",
    "judgment",
    "judgement",
    "constitution",
    "section",
    "act",
    "rights",
    "contract",
    "agreement",
    "notice",
    "tenant",
    "landlord",
    "rent",
    "property",
    "divorce",
    "marriage",
    "consumer",
    "criminal",
    "civil",
    "police",
    "fir",
    "bail",
    "lawyer",
    "advocate",
    "litigation",
    "employment",
    "labour",
    "labor",
    "tax",
    "inheritance",
    "will",
    "cyber",
    "copyright",
    "trademark",
    "company law",
    "corporate",
    "arbitration",
  ];

  return legalSignals.some(
    (signal) =>
      haystack.includes(
        signal
      )
  );
};


/*
|--------------------------------------------------------------------------
| NORMALIZE VIDEO
|--------------------------------------------------------------------------
*/

const normalizeVideo = (
  video = {}
) => {
  const link =
    video.link || "";

  const videoId =
    extractYouTubeVideoId(
      link
    );

  return {
    videoId,

    title:
      video.title ||
      "YouTube video",

    link,

    snippet:
      video.snippet ||
      "",

    imageUrl:
      video.imageUrl ||
      (videoId
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : ""),

    duration:
      video.duration ||
      "",

    source:
      video.source ||
      "YouTube",

    channel:
      video.channel ||
      "",

    date:
      video.date ||
      "",
  };
};


/*
|--------------------------------------------------------------------------
| SEARCH YOUTUBE VIDEOS
|--------------------------------------------------------------------------
*/

const searchYouTubeVideos = async (
  conversation = [],
  maxResults = MAX_RESULTS
) => {
  const key =
    process.env.SERPER_API_KEY;

  if (!key) {
    console.warn(
      "[YouTube] SERPER_API_KEY is not configured."
    );

    return {
      success: false,
      query: "",
      videos: [],
      error:
        "SERPER_API_KEY is not configured.",
    };
  }

  const query =
    buildYouTubeSearchQuery(
      conversation
    )
      .slice(
        0,
        MAX_QUERY_LENGTH
      )
      .trim();

  if (!query) {
    return {
      success: true,
      query: "",
      videos: [],
    };
  }

  const count = Math.min(
    Math.max(
      Number(
        maxResults
      ) ||
        MAX_RESULTS,
      1
    ),
    MAX_RESULTS
  );

  try {
    console.log(
      `[YouTube] 🔎 ${query}`
    );

    const response =
      await fetch(
        SERPER_VIDEOS_URL,
        {
          method:
            "POST",

          headers: {
            "X-API-KEY":
              key,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              q: query,

              gl: "in",

              hl: "en",

              num: count,
            }),

          signal:
            AbortSignal.timeout(
              10000
            ),
        }
      );

    const data =
      await response
        .json()
        .catch(
          () => ({})
        );

    if (
      !response.ok
    ) {
      const errorMessage =
        data?.message ||
        `Serper returned HTTP ${response.status}.`;

      console.error(
        `[YouTube] ❌ ${errorMessage}`
      );

      return {
        success: false,
        query,
        videos: [],
        error:
          errorMessage,
        status:
          response.status,
      };
    }

    const rawVideos =
      Array.isArray(
        data?.videos
      )
        ? data.videos
        : [];

    const normalizedVideos =
      rawVideos
        .filter(
          (video) =>
            isYouTubeUrl(
              video?.link
            )
        )
        .map(
          normalizeVideo
        )
        .filter(
          (video) =>
            video.videoId
        )
        .filter(
          looksRelevantForLegalVideo
        )
        .slice(
          0,
          count
        );

    console.log(
      `[YouTube] ✅ ${normalizedVideos.length} YouTube references found`
    );

    return {
      success: true,

      query,

      provider:
        "serper",

      videos:
        normalizedVideos,
    };
  } catch (error) {
    console.error(
      "[YouTube] ❌ Search failed:",
      error?.message ||
        error
    );

    return {
      success: false,

      query,

      videos: [],

      error:
        error?.message ||
        "YouTube search failed.",
    };
  }
};


module.exports = {
  searchYouTubeVideos,
  buildYouTubeSearchQuery,
};