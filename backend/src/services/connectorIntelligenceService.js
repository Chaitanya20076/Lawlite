/*
|--------------------------------------------------------------------------
| LAWLITE QUERY CLASSIFIER
|--------------------------------------------------------------------------
|
| This service decides whether a user message should:
|
| 1. Go to normal legal reasoning
| 2. Use legal + connected workspace context
| 3. Be treated as normal conversation
| 4. Be rejected as clearly outside Lawlite's scope
|
| IMPORTANT:
|
| "Not obviously legal" does NOT automatically mean OFF_TOPIC.
|
| Greetings, identity questions and capability questions should still
| reach Sarvam so Lawlite can answer them naturally.
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| NORMALIZE
|--------------------------------------------------------------------------
*/

const normalize = (
  value = ""
) => {
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};


/*
|--------------------------------------------------------------------------
| LEGAL TERMS
|--------------------------------------------------------------------------
*/

const legalTerms = [

  "law",
  "laws",
  "legal",
  "legally",
  "act",
  "acts",
  "article",
  "articles",
  "section",
  "sections",

  "court",
  "judge",
  "judgment",
  "judgement",
  "case",
  "cases",
  "petition",
  "appeal",

  "contract",
  "agreement",
  "clause",
  "clauses",
  "terms",
  "conditions",

  "notice",
  "legal notice",
  "notice period",

  "rights",
  "right",
  "duty",
  "duties",

  "penalty",
  "penalties",
  "fine",
  "fines",

  "complaint",
  "fir",
  "police complaint",

  "bail",
  "arrest",
  "crime",
  "criminal",
  "civil",

  "property",
  "rent",
  "rental",
  "lease",
  "landlord",
  "tenant",

  "employment",
  "employee",
  "employer",
  "job",
  "termination",
  "resignation",
  "salary",
  "workplace",

  "tax",
  "taxes",
  "gst",
  "income tax",

  "consumer",
  "consumer complaint",
  "refund",
  "warranty",

  "divorce",
  "marriage",
  "family",
  "custody",
  "maintenance",

  "inheritance",
  "will",
  "succession",

  "copyright",
  "patent",
  "trademark",
  "intellectual property",

  "constitution",
  "constitutional",

  "regulation",
  "regulations",
  "rule",
  "rules",
  "amendment",
  "amendments",

  "privacy",
  "data protection",
  "cyber law",
  "cybercrime",

  "fir",
  "fiscal",
];


/*
|--------------------------------------------------------------------------
| LEGAL CONTEXT PHRASES
|--------------------------------------------------------------------------
|
| Useful when the message is written casually and may not contain a
| direct legal keyword.
|--------------------------------------------------------------------------
*/

const legalContextTerms = [

  "what can i do legally",
  "what should i do legally",
  "is this legal",
  "is that legal",
  "can they legally",
  "can i legally",

  "my rights",
  "my legal rights",
  "my case",
  "my contract",
  "my agreement",
  "my notice",
  "my lease",
  "my employer",
  "my landlord",
  "my tenant",

  "can i sue",
  "can they sue",
  "can i complain",
  "can i file a complaint",
  "can i file a case",

  "what happens if i",
  "what are my options",

  "according to the law",
  "under indian law",
  "under the law",

];


/*
|--------------------------------------------------------------------------
| CONNECTOR TERMS
|--------------------------------------------------------------------------
*/

const connectorTerms = [

  "google drive",
  "drive",
  "dropbox",
  "notion",
  "gmail",
  "github",
  "slack",
  "calendar",

];


/*
|--------------------------------------------------------------------------
| CONNECTOR ACTIONS
|--------------------------------------------------------------------------
*/

const connectorActions = [

  "find",
  "search",
  "open",
  "read",
  "check",
  "look",
  "show",
  "list",
  "get",
  "analyze",
  "analyse",
  "summarize",
  "summarise",
  "review",
  "compare",
  "look through",

];


/*
|--------------------------------------------------------------------------
| CONVERSATIONAL / IDENTITY PHRASES
|--------------------------------------------------------------------------
|
| These should NEVER be treated as OFF_TOPIC.
|--------------------------------------------------------------------------
*/

const conversationalPatterns = [

  /*
   * Greetings
   */

  /^hi[!. ]*$/,
  /^hello[!. ]*$/,
  /^hey[!. ]*$/,
  /^hey lawlite[!. ]*$/,
  /^hi lawlite[!. ]*$/,
  /^hello lawlite[!. ]*$/,

  /^good morning[!. ]*$/,
  /^good afternoon[!. ]*$/,
  /^good evening[!. ]*$/,
  /^good night[!. ]*$/,


  /*
   * Identity
   */

  /\bwho are you\b/,
  /\bwho r u\b/,
  /\bwhat are you\b/,
  /\bwhat is lawlite\b/,
  /\bwho is lawlite\b/,
  /\bwhat do you do\b/,
  /\bwhat can you do\b/,
  /\bwhat all can you do\b/,
  /\bhow can you help me\b/,
  /\bhow do you work\b/,
  /\bwhat can i ask you\b/,
  /\bwhat can i use you for\b/,


  /*
   * Capability questions
   */

  /\bwhat are your capabilities\b/,
  /\bwhat features do you have\b/,
  /\bwhat features does lawlite have\b/,
  /\bhow can lawlite help\b/,
  /\bhow does lawlite help\b/,
  /\bwhat does lawlite do\b/,
  /\bcan you help me\b/,
  /\bcan you explain\b/,
  /\bcan you help\b/,


  /*
   * Simple acknowledgement / conversation
   */

  /^thanks[!. ]*$/,
  /^thank you[!. ]*$/,
  /^thx[!. ]*$/,
  /^okay[!. ]*$/,
  /^ok[!. ]*$/,
  /^cool[!. ]*$/,
  /^nice[!. ]*$/,
  /^great[!. ]*$/,
  /^perfect[!. ]*$/,
  /^got it[!. ]*$/,
  /^understood[!. ]*$/,

];


/*
|--------------------------------------------------------------------------
| CLEAR OFF-TOPIC PATTERNS
|--------------------------------------------------------------------------
|
| Only reject messages when they are clearly asking for something
| outside Lawlite's purpose.
|
| We intentionally do NOT reject merely because no legal keyword exists.
|--------------------------------------------------------------------------
*/

const clearlyOffTopicPatterns = [

  /*
   * Programming
   */

  /\bwrite (me )?(a )?(python|javascript|java|c|c\+\+|html|css|react|node\.?js) code\b/,
  /\bdebug (my )?(python|javascript|java|c|c\+\+|react|node)\b/,
  /\bprogramming question\b/,
  /\bcode this for me\b/,


  /*
   * Food / recipes
   */

  /\bgive me a recipe\b/,
  /\bhow do i cook\b/,
  /\bhow to cook\b/,
  /\brecipe for\b/,


  /*
   * Fitness
   */

  /\bworkout plan\b/,
  /\bgym routine\b/,
  /\bexercise routine\b/,
  /\bweight loss plan\b/,


  /*
   * Entertainment
   */

  /\bmovie recommendation\b/,
  /\bfilm recommendation\b/,
  /\bwhat should i watch\b/,
  /\bsong recommendation\b/,
  /\bplaylist\b/,


  /*
   * Sports
   */

  /\bmatch score\b/,
  /\blive score\b/,
  /\bfootball score\b/,
  /\bcricket score\b/,
  /\bbasketball score\b/,
  /\btennis score\b/,


  /*
   * Weather
   */

  /\bwhat(?:'s| is) the weather\b/,
  /\bweather today\b/,
  /\btemperature today\b/,


  /*
   * Travel
   */

  /\bflight booking\b/,
  /\bhotel booking\b/,
  /\btravel itinerary\b/,
  /\btourist places\b/,


  /*
   * Shopping
   */

  /\bbest phone to buy\b/,
  /\bwhich phone should i buy\b/,
  /\bbest laptop to buy\b/,
  /\bproduct recommendation\b/,

];


/*
|--------------------------------------------------------------------------
| MATCH HELPER
|--------------------------------------------------------------------------
*/

const containsAny = (
  text,
  terms
) => {
  return terms.some(
    (term) =>
      text.includes(
        term
      )
  );
};


/*
|--------------------------------------------------------------------------
| CLASSIFY QUERY
|--------------------------------------------------------------------------
*/

const classifyLawliteQuery = (
  message = ""
) => {

  const text =
    normalize(message);


  /*
   * Empty input
   */

  if (!text) {
    return {
      domain:
        "CONVERSATIONAL",

      confidence:
        1,

      allowed:
        true,

      refusal:
        false,

      needsSarvam:
        false,

      connectors: [],

      reasons: [
        "Empty query",
      ],
    };
  }


  /*
   * -------------------------------------------------------
   * CONVERSATIONAL
   * -------------------------------------------------------
   *
   * Check this FIRST.
   *
   * A message like:
   *
   * "who r u"
   * "what all can you do"
   * "hello"
   *
   * should reach Sarvam.
   */

  const isConversational =
    conversationalPatterns.some(
      (pattern) =>
        pattern.test(text)
    );


  if (isConversational) {

    return {
      domain:
        "CONVERSATIONAL",

      confidence:
        0.98,

      allowed:
        true,

      refusal:
        false,

      needsSarvam:
        true,

      connectors: [],

      reasons: [
        "Normal conversation or Lawlite capability question",
      ],
    };
  }


  /*
   * -------------------------------------------------------
   * LEGAL SIGNALS
   * -------------------------------------------------------
   */

  const hasLegalTerms =
    containsAny(
      text,
      legalTerms
    );


  const hasLegalContext =
    containsAny(
      text,
      legalContextTerms
    );


  /*
   * -------------------------------------------------------
   * CONNECTOR SIGNALS
   * -------------------------------------------------------
   */

  const matchedConnectors =
    connectorTerms.filter(
      (connector) =>
        text.includes(
          connector
        )
    );


  const hasConnector =
    matchedConnectors.length >
    0;


  const hasConnectorAction =
    containsAny(
      text,
      connectorActions
    );


  /*
   * -------------------------------------------------------
   * LEGAL + CONNECTOR
   * -------------------------------------------------------
   *
   * Examples:
   *
   * "check my contract in drive"
   * "find my legal notice in Gmail"
   * "read my agreement from Dropbox"
   */

  if (
    hasConnector &&
    (
      hasLegalTerms ||
      hasLegalContext ||
      hasConnectorAction
    )
  ) {

    return {
      domain:
        "LEGAL_CONNECTOR",

      confidence:
        0.95,

      allowed:
        true,

      refusal:
        false,

      needsSarvam:
        true,

      connectors:
        matchedConnectors,

      reasons: [
        "Legal request involving connected workspace",
      ],
    };
  }


  /*
   * -------------------------------------------------------
   * LEGAL
   * -------------------------------------------------------
   */

  if (
    hasLegalTerms ||
    hasLegalContext
  ) {

    return {
      domain:
        "LEGAL",

      confidence:
        0.95,

      allowed:
        true,

      refusal:
        false,

      needsSarvam:
        true,

      connectors: [],

      reasons: [
        "Legal information or legal-context request",
      ],
    };
  }


  /*
   * -------------------------------------------------------
   * CLEAR OFF-TOPIC
   * -------------------------------------------------------
   *
   * Only reject when the message is strongly identifiable
   * as another domain.
   */

  const isClearlyOffTopic =
    clearlyOffTopicPatterns.some(
      (pattern) =>
        pattern.test(text)
    );


  if (isClearlyOffTopic) {

    return {
      domain:
        "OFF_TOPIC",

      confidence:
        0.95,

      allowed:
        false,

      refusal:
        true,

      needsSarvam:
        false,

      connectors: [],

      reasons: [
        "Clearly outside Lawlite's legal-assistance scope",
      ],
    };
  }


  /*
   * -------------------------------------------------------
   * AMBIGUOUS / UNKNOWN
   * -------------------------------------------------------
   *
   * IMPORTANT:
   *
   * We allow ambiguous messages to reach Sarvam.
   *
   * Sarvam can then understand the actual intent instead
   * of the deterministic classifier incorrectly refusing it.
   */

  return {
    domain:
      "CONVERSATIONAL",

    confidence:
      0.55,

    allowed:
      true,

    refusal:
      false,

    needsSarvam:
      true,

    connectors:
      hasConnector
        ? matchedConnectors
        : [],

    reasons: [
      "Intent is not clearly off-topic",
      "Allowing Sarvam to interpret the request",
    ],
  };
};


/*
|--------------------------------------------------------------------------
| REFUSAL MESSAGE
|--------------------------------------------------------------------------
*/

const getLawliteRefusalMessage =
  () => {

    return `
I’m Lawlite, focused on helping with legal information and your connected legal documents.

I can’t help with that topic.

Try asking me about a law, legal document, contract, notice, case, legal right, or something from your connected workspace.
`.trim();

  };


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  normalize,
  classifyLawliteQuery,
  getLawliteRefusalMessage,
};