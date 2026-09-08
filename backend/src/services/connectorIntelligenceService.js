/**
 * Lawlite Query Intelligence
 *
 * Purpose:
 * - Keep Lawlite focused on legal information.
 * - Refuse clearly off-topic questions before they reach Sarvam.
 * - Allow connected-workspace requests when they are relevant to
 *   legal/document information.
 * - Avoid an additional LLM call for routing.
 */

const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9@._'\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();


/*
|--------------------------------------------------------------------------
| LEGAL DOMAIN TERMS
|--------------------------------------------------------------------------
*/

const LEGAL_TERMS = [
  "law",
  "laws",
  "legal",
  "legally",
  "illegal",
  "illegally",
  "lawful",
  "prohibited",
  "legislation",

  "act",
  "acts",

  "article",
  "articles",

  "section",
  "sections",

  "clause",
  "clauses",

  "provision",
  "provisions",

  "constitution",
  "constitutional",

  "court",
  "courts",

  "judgment",
  "judgement",

  "verdict",

  "case",
  "cases",

  "lawsuit",
  "litigation",

  "sue",
  "sued",

  "petition",
  "appeal",
  "appealed",

  "tribunal",

  "arbitration",
  "arbitrator",

  "notice",
  "legal notice",

  "summons",
  "warrant",
  "bail",

  "fir",
  "police complaint",
  "complaint",

  "contract",
  "contracts",

  "agreement",
  "agreements",

  "lease",
  "rental agreement",

  "employment",
  "employer",
  "employee",

  "salary",
  "wage",

  "termination",
  "terminate",
  "resignation",

  "offer letter",
  "appointment letter",

  "nda",
  "non disclosure",

  "privacy policy",
  "privacy law",

  "data protection",
  "personal data",

  "consumer rights",
  "consumer protection",

  "refund",

  "copyright",
  "copyrights",

  "trademark",

  "patent",

  "intellectual property",

  "ipc",
  "crpc",
  "cpc",

  "bns",
  "bnss",
  "bsa",

  "gst law",
  "tax law",
  "income tax",
  "tax notice",

  "property law",
  "inheritance",
  "succession",

  "divorce",
  "marriage law",
  "family law",

  "criminal law",
  "civil law",

  "corporate law",
  "company law",

  "labour law",
  "labor law",

  "cyber law",
  "cybercrime",

  "right to information",
  "rti",

  "fundamental right",
  "fundamental rights",

  "directive principles",

  "regulation",
  "regulations",

  "rule",
  "rules",

  "compliance",

  "liability",
  "liable",

  "rights",

  "duty",
  "duties",

  "obligation",
  "obligations",

  "penalty",
  "penalties",

  "fine",

  "offence",
  "offense",

  "breach",
  "damages",

  "indemnity",

  "jurisdiction",

  "legal advice",
  "legal information",
  "legal rights",
  "legal remedy",

  "remedy",

  "statute",
  "statutory",

  "amendment",
  "amendments",

  "bill",

  "ordinance",

  "notification",
];


/*
|--------------------------------------------------------------------------
| CONNECTED SERVICES
|--------------------------------------------------------------------------
*/

const CONNECTOR_TERMS = {
  gmail: [
    "gmail",
    "email",
    "emails",
    "mail",
    "mails",
    "inbox",
    "in my inbox",
    "my email",
    "my emails",
  ],

  github: [
    "github",
    "repository",
    "repositories",
    "repo",
    "repos",
    "source code",
    "my code",
    "project code",
  ],

  notion: [
    "notion",
    "notion page",
    "notion pages",
    "notion notes",
    "my notion",
  ],

  dropbox: [
    "dropbox",
    "drop box",
    "my dropbox",
  ],

  drive: [
    "google drive",
    "drive",
    "my drive",
    "my document",
    "my documents",
    "my file",
    "my files",
    "my pdf",
  ],
};


/*
|--------------------------------------------------------------------------
| CONNECTOR ACTION WORDS
|--------------------------------------------------------------------------
*/

const CONNECTOR_ACTION_TERMS = [
  "search",
  "find",
  "check",
  "look",
  "read",
  "show",
  "list",
  "browse",
  "open",
  "go through",
  "according to",
  "what does",
  "what is in",
  "look through",
];


/*
|--------------------------------------------------------------------------
| LEGAL CONTEXT TERMS
|--------------------------------------------------------------------------
|
| These are especially important for connector requests.
|
| Example:
|
| "Search my Gmail for my revised contract"
|
| Gmail + search + contract
| => allowed
|
| But:
|
| "Search my Gmail for movie tickets"
|
| Gmail + search + no legal context
| => refused
|
*/

const LEGAL_CONTEXT_TERMS = [
  "contract",
  "agreement",
  "notice",
  "policy",
  "clause",
  "termination",
  "terminate",
  "employment",
  "complaint",
  "court",
  "case",
  "legal",
  "law",
  "rights",
  "obligation",
  "liability",
  "compliance",
  "regulation",
  "judgment",
  "judgement",
  "verdict",
  "tax",
  "insurance",
  "lease",
  "deed",
  "privacy",
  "data protection",
  "copyright",
  "trademark",
  "refund",
];


/*
|--------------------------------------------------------------------------
| CLEARLY OFF-TOPIC PATTERNS
|--------------------------------------------------------------------------
*/

const CLEAR_OFF_TOPIC_PATTERNS = [
  /\b(stock|stocks|share price|crypto|bitcoin|ethereum|forex|trading)\b/i,

  /\b(cricket|football|soccer|basketball|tennis|ipl|nba|fifa|match|score)\b/i,

  /\b(recipe|recipes|biryani|pasta|cooking|cook)\b/i,

  /\b(movie|movies|series|tv show|anime|manga|celebrity|actor|actress)\b/i,

  /\b(gaming|game|games|playstation|xbox|steam)\b/i,

  /\b(laptop|phone|smartphone|headphones|gpu|cpu|monitor|computer)\b/i,

  /\b(math|mathematics|calculus|algebra|geometry|physics|chemistry|biology)\b/i,

  /\b(homework|assignment|exam answer|solve this equation)\b/i,

  /\b(weather|temperature|forecast)\b/i,

  /\b(vacation|travel itinerary|tourist|hotel recommendation|restaurant recommendation)\b/i,

  /\b(song lyrics|lyrics|write a song|poem|poetry|birthday message|wedding message)\b/i,

  /\b(python program|javascript code|write code|debug this code|coding help)\b/i,
];


/*
|--------------------------------------------------------------------------
| SCORE HELPERS
|--------------------------------------------------------------------------
*/

const scoreMatches = (
  text,
  terms
) => {
  let score = 0;
  const matches = [];

  for (const term of terms) {
    if (text.includes(term)) {
      score +=
        term.length >= 8
          ? 2
          : 1;

      matches.push(term);
    }
  }

  return {
    score,
    matches,
  };
};


/*
|--------------------------------------------------------------------------
| CONNECTOR DETECTION
|--------------------------------------------------------------------------
*/

const detectConnectors = (
  text
) => {
  const connectors = [];

  for (
    const [
      name,
      terms,
    ] of Object.entries(
      CONNECTOR_TERMS
    )
  ) {
    if (
      terms.some(
        (term) =>
          text.includes(term)
      )
    ) {
      connectors.push(name);
    }
  }

  return connectors;
};


/*
|--------------------------------------------------------------------------
| MAIN CLASSIFIER
|--------------------------------------------------------------------------
*/

const classifyLawliteQuery = (
  message = ""
) => {
  const text =
    normalize(message);

  /*
  |--------------------------------------------------------------------------
  | EMPTY INPUT
  |--------------------------------------------------------------------------
  */

  if (!text) {
    return {
      domain: "OFF_TOPIC",
      confidence: 1,
      allowed: false,
      refusal: true,
      needsSarvam: false,
      connectors: [],
      reasons: [
        "empty message",
      ],
    };
  }


  /*
  |--------------------------------------------------------------------------
  | SIGNALS
  |--------------------------------------------------------------------------
  */

  const legal =
    scoreMatches(
      text,
      LEGAL_TERMS
    );

  const legalContext =
    scoreMatches(
      text,
      LEGAL_CONTEXT_TERMS
    );

  const connectors =
    detectConnectors(
      text
    );

  const actionScore =
    scoreMatches(
      text,
      CONNECTOR_ACTION_TERMS
    );


  /*
  |--------------------------------------------------------------------------
  | OFF-TOPIC DETECTION
  |--------------------------------------------------------------------------
  */

  const clearOffTopic =
    CLEAR_OFF_TOPIC_PATTERNS.some(
      (pattern) =>
        pattern.test(text)
    );


  /*
  |--------------------------------------------------------------------------
  | LEGAL REQUEST
  |--------------------------------------------------------------------------
  */

  /**
   * Legal signal always wins over a generic off-topic signal.
   *
   * Example:
   *
   * "Is crypto trading regulated in India?"
   *
   * contains "crypto" but is still clearly a legal question.
   */

  if (
    legal.score > 0 ||
    legalContext.score >= 2
  ) {
    return {
      domain:
        connectors.length > 0
          ? "LEGAL_CONNECTOR"
          : "LEGAL",

      confidence:
        Math.min(
          0.99,
          0.78 +
            legal.score *
              0.035 +
            legalContext.score *
              0.025
        ),

      allowed: true,
      refusal: false,
      needsSarvam: true,

      connectors,

      reasons: [
        ...legal.matches,
        ...legalContext.matches,
      ].slice(0, 8),
    };
  }


  /*
  |--------------------------------------------------------------------------
  | CONNECTOR REQUEST
  |--------------------------------------------------------------------------
  |
  | A connector-only request is NOT automatically accepted.
  |
  | It must also have a legal/document context.
  |
  | This prevents Lawlite from silently becoming:
  |
  | "general Gmail assistant"
  | "general GitHub assistant"
  | "general Dropbox assistant"
  |
  */

  if (
    connectors.length > 0 &&
    actionScore.score > 0 &&
    legalContext.score > 0
  ) {
    return {
      domain:
        "LEGAL_CONNECTOR",

      confidence: 0.96,

      allowed: true,
      refusal: false,
      needsSarvam: true,

      connectors,

      reasons: [
        ...connectors,
        ...actionScore.matches,
        ...legalContext.matches,
      ].slice(0, 8),
    };
  }


  /*
  |--------------------------------------------------------------------------
  | CLEAR OFF-TOPIC
  |--------------------------------------------------------------------------
  */

  if (clearOffTopic) {
    return {
      domain:
        "OFF_TOPIC",

      confidence:
        0.98,

      allowed: false,
      refusal: true,
      needsSarvam: false,

      connectors,

      reasons: [
        "clear non-legal topic",
      ],
    };
  }


  /*
  |--------------------------------------------------------------------------
  | SPECIALIZED-DOMAIN FALLBACK
  |--------------------------------------------------------------------------
  |
  | Ambiguous questions are rejected instead of being sent to Sarvam
  | as general-purpose chat.
  |
  */

  return {
    domain:
      "OFF_TOPIC",

    confidence:
      0.72,

    allowed: false,
    refusal: true,
    needsSarvam: false,

    connectors,

    reasons: [
      "no sufficiently strong legal signal",
    ],
  };
};


/*
|--------------------------------------------------------------------------
| REFUSAL MESSAGE
|--------------------------------------------------------------------------
*/

const getLawliteRefusalMessage =
  () =>
    "I’m Lawlite, focused on helping with legal information and your connected legal documents. I can’t help with that topic. Try asking me about a law, legal document, contract, notice, case, legal right, or something from your connected workspace.";


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  classifyLawliteQuery,
  getLawliteRefusalMessage,
};