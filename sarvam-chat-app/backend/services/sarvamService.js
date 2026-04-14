/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║       CORTEX M4 — SARVAM AI SERVICE  v9.0 "BHARAT EDITION"             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🧠 PROMPT CLASSIFIER ENGINE                                            ║
 * ║  🌐 SMART WEB ROUTING                                                   ║
 * ║  🗣️  20 OFFICIAL INDIAN LANGUAGE SUPPORT                                ║
 * ║  🔊 READ-ALOUD / TTS OPTIMISATION                                       ║
 * ║  🧩 MEMORY ENGINE                                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

"use strict";

const axios = require("axios");
const { loadAttachedContent }                 = require("../utils/longPromptHandler");
const { getRelevantMemory, storeMemory }      = require("../modules/memory/services/memory.service");
const memoryEngine = require("./memory.engine");
const { searchWeb, formatSearchResultsForAI } = require("./webSearch.service");
const { processVisualsInReply }               = require("./visualGenerator.service");
const { getContextualImages }                 = require("./pexels.service");
const { generateLargeCode, detectLargeCodeRequest, detectLanguage } = require("./chunkCodeGenerator.service");

/* ─── Constants ─────────────────────────────────────────────────────────── */
const SARVAM_API_URL     = process.env.SARVAM_API_URL || "https://api.sarvam.ai/v1/chat/completions";
const MODEL_MAX_TOKENS   = 8000;
const SYSTEM_PROMPT_TOKS = 1400;
const HISTORY_HARD_CAP   = 8000;
const HISTORY_MSG_CAP    = 6;

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 0 — INDIAN LANGUAGE ENGINE
   20 official Indian languages: detection, TTS locale mapping, SSML output
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * All 20 actively supported Indian languages.
 * ttsLocale → used by ElevenLabs / Google TTS / Sarvam TTS
 */
const INDIAN_LANGUAGES = {
  hi:  { name: "Hindi",     script: "Devanagari", ttsLocale: "hi-IN",  rtlScript: false },
  bn:  { name: "Bengali",   script: "Bengali",    ttsLocale: "bn-IN",  rtlScript: false },
  te:  { name: "Telugu",    script: "Telugu",     ttsLocale: "te-IN",  rtlScript: false },
  mr:  { name: "Marathi",   script: "Devanagari", ttsLocale: "mr-IN",  rtlScript: false },
  ta:  { name: "Tamil",     script: "Tamil",      ttsLocale: "ta-IN",  rtlScript: false },
  gu:  { name: "Gujarati",  script: "Gujarati",   ttsLocale: "gu-IN",  rtlScript: false },
  kn:  { name: "Kannada",   script: "Kannada",    ttsLocale: "kn-IN",  rtlScript: false },
  ml:  { name: "Malayalam", script: "Malayalam",  ttsLocale: "ml-IN",  rtlScript: false },
  pa:  { name: "Punjabi",   script: "Gurmukhi",   ttsLocale: "pa-IN",  rtlScript: false },
  or:  { name: "Odia",      script: "Odia",       ttsLocale: "or-IN",  rtlScript: false },
  as:  { name: "Assamese",  script: "Bengali",    ttsLocale: "as-IN",  rtlScript: false },
  ur:  { name: "Urdu",      script: "Nastaliq",   ttsLocale: "ur-IN",  rtlScript: true  },
  mai: { name: "Maithili",  script: "Devanagari", ttsLocale: "hi-IN",  rtlScript: false },
  kok: { name: "Konkani",   script: "Devanagari", ttsLocale: "hi-IN",  rtlScript: false },
  ne:  { name: "Nepali",    script: "Devanagari", ttsLocale: "ne-IN",  rtlScript: false },
  si:  { name: "Sindhi",    script: "Arabic",     ttsLocale: "hi-IN",  rtlScript: true  },
  sa:  { name: "Sanskrit",  script: "Devanagari", ttsLocale: "hi-IN",  rtlScript: false },
  doi: { name: "Dogri",     script: "Devanagari", ttsLocale: "hi-IN",  rtlScript: false },
  mni: { name: "Manipuri",  script: "Bengali",    ttsLocale: "hi-IN",  rtlScript: false },
  sat: { name: "Santali",   script: "Ol Chiki",   ttsLocale: "hi-IN",  rtlScript: false },
  en:  { name: "English",   script: "Latin",      ttsLocale: "en-IN",  rtlScript: false },
};

/**
 * Detect the script/language of a message using Unicode block ranges.
 * Returns a language code string, defaulting to "en".
 */
function detectIndianLanguage(text) {
  if (!text || text.trim().length === 0) return "en";
  const t = text.trim();

  // Arabic/Urdu block — check before Devanagari since Urdu uses Arabic script
  if (/[\u0600-\u06FF]/.test(t)) return "ur";

  // Ol Chiki (Santali)
  if (/[\u1C50-\u1C7F]/.test(t)) return "sat";

  // South Indian scripts — unambiguous
  if (/[\u0C00-\u0C7F]/.test(t)) return "te"; // Telugu
  if (/[\u0B80-\u0BFF]/.test(t)) return "ta"; // Tamil
  if (/[\u0A80-\u0AFF]/.test(t)) return "gu"; // Gujarati
  if (/[\u0C80-\u0CFF]/.test(t)) return "kn"; // Kannada
  if (/[\u0D00-\u0D7F]/.test(t)) return "ml"; // Malayalam
  if (/[\u0B00-\u0B7F]/.test(t)) return "or"; // Odia
  if (/[\u0A00-\u0A7F]/.test(t)) return "pa"; // Gurmukhi (Punjabi)

  // Bengali/Assamese — same Unicode block, refine by keyword
  if (/[\u0980-\u09FF]/.test(t)) {
    if (/\b(আছে|কৰা|অসম|মই)\b/.test(t)) return "as";
    if (/\b(মৈতৈ|মণিপুর)\b/.test(t)) return "mni";
    return "bn";
  }

  // Devanagari — shared by many languages, refine by keyword
  if (/[\u0900-\u097F]/.test(t)) {
    if (/\b(आहे|मला|तुम्ही|महाराष्ट्र|माझ्या)\b/.test(t)) return "mr";
    if (/\b(छ|गर्नु|नेपाल|हुन्छ)\b/.test(t)) return "ne";
    if (/\b(अहां|मैथिल|जनकपुर)\b/.test(t)) return "mai";
    if (/\b(देव बरें|गोंय|कोंकण)\b/.test(t)) return "kok";
    if (/\b(नमः|संस्कृत|अहम्)\b/.test(t)) return "sa";
    if (/\b(डोगरी|जम्मू)\b/.test(t)) return "doi";
    return "hi"; // default Devanagari → Hindi
  }

  return "en";
}

/**
 * Get the TTS locale for a detected language code.
 */
function getTTSLocale(langCode) {
  return INDIAN_LANGUAGES[langCode]?.ttsLocale || "en-IN";
}

/**
 * Extract the READ_ALOUD block from a model reply (if present).
 * Returns { mainReply, readAloudText, langCode }
 */
function extractReadAloudBlock(reply, langCode = "en") {
  const match = reply.match(/READ_ALOUD:\s*([\s\S]*?)\s*END_READ_ALOUD/i);
  if (match) {
    const readAloudText = match[1].trim();
    const mainReply     = reply.replace(/READ_ALOUD:[\s\S]*?END_READ_ALOUD/i, "").trim();
    return { mainReply, readAloudText, langCode };
  }
  // If no block, generate a stripped version automatically
  const autoText = reply
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^#{1,4}\s+/gm, "")
    .replace(/^[-•*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\[VISUAL:\w+\][\s\S]*?\[\/VISUAL\]/gi, "")
    .replace(/\[SOURCES\][\s\S]*?\[\/SOURCES\]/gi, "")
    .replace(/\[FOLLOWUPS\][\s\S]*?\[\/FOLLOWUPS\]/gi, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 1500); // TTS-safe length cap
  return { mainReply: reply, readAloudText: autoText, langCode };
}

/**
 * Wrap plain text in SSML for TTS engines.
 */
function toSSML(text, langCode = "en") {
  const locale = getTTSLocale(langCode);
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<speak xml:lang="${locale}"><p>${escaped}</p></speak>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 1 — PROMPT CLASSIFIER ENGINE
   ═══════════════════════════════════════════════════════════════════════════ */

const PROMPT_CATEGORIES = {
  CASUAL:   { needsWeb: false, label: "Casual/Social"       },
  CREATIVE: { needsWeb: false, label: "Creative Writing"     },
  CODE:     { needsWeb: false, label: "Code/Programming"     },
  CONCEPT:  { needsWeb: false, label: "Timeless Concept"     },
  MATH:     { needsWeb: false, label: "Math/Calculation"     },
  PERSONAL: { needsWeb: false, label: "Personal/Emotional"   },
  FACTUAL:  { needsWeb: true,  label: "Factual (may change)" },
  REALTIME: { needsWeb: true,  label: "Real-time Data"       },
  VERIFY:   { needsWeb: true,  label: "Fact Verification"    },
  RESEARCH: { needsWeb: true,  label: "Research/Deep Topic"  },
};

function classifyPrompt(message) {
  if (!message?.trim()) {
    return { category: "CASUAL", needsWeb: false, confidence: 1.0, reason: "empty message" };
  }

  const raw = message.trim();
  const m   = raw.toLowerCase();
  const len = m.length;

  if (len < 4) {
    return { category: "CASUAL", needsWeb: false, confidence: 0.98, reason: "very short message" };
  }

  // Detect Indian language — affects classification confidence for greetings
  const detectedLang = detectIndianLanguage(raw);
  const isIndianLang = detectedLang !== "en";

  const casualExact = /^(hi|hello|hey|sup|yo|hiya|howdy|hola|namaste|wassup|what'?s up|whats up|good morning|good night|good afternoon|good evening|good day|morning|evening|night|thanks|thank you|thank u|thx|ty|cheers|np|no problem|welcome|yw|you'?re welcome|bye|goodbye|cya|see ya|later|gtg|gotta go|brb|omg|wtf|lol|lmao|lmfao|rofl|haha|hehe|hihi|xd|ok|okay|k|kk|cool|nice|great|awesome|perfect|sure|yep|nope|yea|yeah|nah|hmm|ugh|meh|damn|wow|whoa|bro|bruh|dude|man|bhai|yaar|da|ra|anna)[\s!?.]*$/i;
  if (casualExact.test(m)) {
    return { category: "CASUAL", needsWeb: false, confidence: 0.99, reason: "greeting/reaction" };
  }

  // Indian language greetings — treat as CASUAL
  const indianGreetings = /^(नमस्ते|नमस्कार|வணக்கம்|నమస్కారం|ನಮಸ್ಕಾರ|നമസ്കാരം|ਸਤ ਸ੍ਰੀ ਅਕਾਲ|নমস্কার|ନମସ୍କାର| નમસ્તે|السلام علیکم|নমস্কাৰ|خوش آمدید)[\s!?.]*$/;
  if (indianGreetings.test(raw)) {
    return { category: "CASUAL", needsWeb: false, confidence: 0.99, reason: "Indian language greeting" };
  }

  const casualPatterns = [
    /^how are (you|u|ya|yall|things)(\s+doing|\s+going|\s+today|\s+bro|\s+man|\s+dude)?\s*[?!.]?$/i,
    /^what'?s (up|good|new|happening|going on|the vibe)\s*[?!.]?$/i,
    /^(are you|r u) (okay|alright|good|fine|there|alive|working)\s*[?!.]?$/i,
    /^(i am|i'?m|im) (good|fine|okay|great|tired|bored|hungry|happy|sad|excited|stressed|busy|back)\s*[.!]?$/i,
    /^(just|just wanted to) (say|tell you|let you know)\s+/i,
    /^(nice|cool|awesome|great|perfect|amazing|wow|interesting|that'?s)\s+(to know|work|job|one|point|answer|explanation)\s*[.!]?$/i,
    /^(you'?re|ur|you are)\s+(amazing|awesome|great|helpful|the best|smart|cool|brilliant)\s*[.!]?$/i,
  ];
  for (const p of casualPatterns) {
    if (p.test(m)) return { category: "CASUAL", needsWeb: false, confidence: 0.95, reason: "casual conversation pattern" };
  }

  const personalPatterns = [
    /^(i feel|i'?m feeling|i am feeling|i feel like)\s+/i,
    /^(i'?m|i am|im)\s+(depressed|anxious|stressed|lonely|lost|confused|heartbroken|in love|happy|excited|nervous|scared|worried|struggling|failing|done|tired|exhausted|overwhelmed)\b/i,
    /^(my|my own)\s+(girlfriend|boyfriend|wife|husband|mom|dad|mother|father|parents|brother|sister|friend|boss|teacher|professor|family|life|future|career|relationship|heart|feelings|problem|issue)\b/i,
    /^(should i|shall i|can i|will i|do i)\s+(quit|leave|stay|go|tell|ask|apply|try|start|stop|break up|give up|continue|pursue|join|drop)\b/i,
    /^(what should i do|what do i do|help me|i need help|i need advice|i need someone|can you help me) (with|about|regarding|on)?\s*/i,
    /\b(my life|my future|my career|my relationship|my mental health|my anxiety|my depression|i'?m going through|i'?m dealing with|broke up with me|rejected me|fired me|failed me)\b/i,
  ];
  for (const p of personalPatterns) {
    if (p.test(m)) return { category: "PERSONAL", needsWeb: false, confidence: 0.92, reason: "personal/emotional content" };
  }

  const creativePatterns = [
    /^(write|compose|create|generate|make|craft|give me|come up with)\s+(a\s+|an\s+|me\s+a\s+|me\s+an\s+)?(poem|haiku|limerick|sonnet|story|short story|bedtime story|fairy tale|fable|narrative|essay|paragraph|letter|email|cover letter|resignation letter|birthday message|wedding speech|toast|joke|pun|riddle|rap|song|lyrics|caption|bio|slogan|tagline|headline)\b/i,
    /^(give me|write me|make me|create)\s+(some\s+)?(ideas|suggestions|examples|tips|names|titles|quotes|captions|hashtags)\s+(for|about|on|related to)\b/i,
    /\b(roleplay|role play|pretend|act as|imagine|let'?s say|suppose|hypothetically|in a world where|write a scene|write a script|write dialogue|write a conversation)\b/i,
  ];
  for (const p of creativePatterns) {
    if (p.test(m)) return { category: "CREATIVE", needsWeb: false, confidence: 0.93, reason: "creative writing request" };
  }

  if (/^(calculate|compute|solve|evaluate|simplify|find|what is|what'?s)\s+[\d\s\+\-\*\/\^()=%.√∑∫πτe,]+$/.test(m)) {
    return { category: "MATH", needsWeb: false, confidence: 0.99, reason: "pure math expression" };
  }
  if (/^(what is|what'?s)\s+\d+\s*(%|percent|÷|\/|\*|×|plus|minus|times|divided by|to the power of)\s*\d+/i.test(m)) {
    return { category: "MATH", needsWeb: false, confidence: 0.97, reason: "arithmetic question" };
  }
  if (/\b(integrate|differentiate|derivative of|integral of|limit of|prove that|show that|simplify the expression|solve the equation|find the value of x|find x|quadratic|polynomial|matrix|determinant|eigenvalue|fourier|laplace transform)\b/i.test(m) && !/\b(price|stock|crypto|news|latest|today|current)\b/i.test(m)) {
    return { category: "MATH", needsWeb: false, confidence: 0.90, reason: "mathematical concept" };
  }

  const codeAction = /^(write|create|build|code|implement|fix|debug|refactor|make|generate|help me with|how do i|how to)\s+(a\s+|an\s+|me\s+)?(function|class|component|script|program|app|api|endpoint|route|hook|context|reducer|middleware|service|controller|model|schema|migration|test|spec|bot|cli|tool|algorithm|data structure|regex|query|pipeline|webhook|lambda|cron)/i;
  const codeLanguage = /\b(python|javascript|typescript|java|c\+\+|c#|ruby|go|rust|swift|kotlin|php|scala|dart|lua|perl|haskell|r |matlab|sql|mysql|postgresql|mongodb|redis|html|css|sass|scss|react|vue|angular|svelte|next\.?js|nuxt|gatsby|node|express|fastify|nestjs|flask|django|fastapi|rails|laravel|spring|asp\.net|graphql|rest|grpc|docker|kubernetes|terraform|ansible|bash|powershell|git)\b/i;
  const hasCodeAction  = codeAction.test(m);
  const hasCodeLang    = codeLanguage.test(m) && /\b(write|create|build|implement|fix|debug|make|how to|how do i|example|snippet|tutorial|step by step)\b/i.test(m);
  const hasCodeContent = message.includes("function ") || message.includes("import ") || message.includes("=>") || message.includes("const ") || message.includes("def ") || message.includes("class ") || message.includes("<div") || message.includes("useState");

  if ((hasCodeAction || hasCodeLang || hasCodeContent) && !/\b(latest version|new release|just released|best library|top library|2024|2025|2026)\b/i.test(m)) {
    return { category: "CODE", needsWeb: false, confidence: 0.91, reason: "code/programming task" };
  }

  const conceptKnowledge = /\b(recursion|memoization|dynamic programming|closure|currying|higher.?order function|pointer|heap|call stack|queue|deque|linked list|binary tree|avl|red.?black|trie|hash table|oop|solid|design pattern|factory|singleton|observer|decorator|mvc|mvvm|tcp|udp|dns|http|https|ssl|tls|jwt|oauth|cors|csrf|xss|sql injection|photosynthesis|cellular respiration|mitosis|meiosis|osmosis|dna replication|protein synthesis|natural selection|evolution|atom|molecule|ionic bond|covalent bond|newton'?s law|law of gravity|special relativity|general relativity|quantum mechanics|wave.?particle duality|thermodynamics|entropy|pythagorean theorem|fibonacci|prime number|big o|time complexity|space complexity|sorting algorithm|binary search|graph theory|greedy algorithm|divide and conquer|backtracking|socrates|plato|aristotle|kant|nietzsche|descartes|hegel|locke|hume|rousseau|hobbes|marx|freud|jung|piaget)\b/i;
  const conceptAction = /^(explain|what is|what are|how does|how do|why is|why are|define|describe|tell me about|teach me|what'?s the difference between|compare|contrast|what does .{1,20} mean|how (does|do) .{1,30} work)\b/i;
  if (conceptAction.test(m) && conceptKnowledge.test(m)) {
    return { category: "CONCEPT", needsWeb: false, confidence: 0.88, reason: "timeless CS/science concept" };
  }

  if (/\b(who (was|were)|when (was|were|did)|where (was|were|did)|why (was|were|did))\b/i.test(m)) {
    const historicalPeople = /\b(shakespeare|einstein|newton|darwin|tesla|edison|napoleon|lincoln|gandhi|aristotle|plato|socrates|pythagoras|archimedes|galileo|copernicus|kepler|maxwell|faraday|curie|turing|von neumann|julius caesar|cleopatra|alexander the great|genghis khan|columbus|da vinci|michelangelo|beethoven|mozart|bach|freud|jung|marx|lenin|stalin|hitler|churchill|roosevelt|kennedy|martin luther king|nelson mandela|mother teresa|ambedkar|nehru|subhas chandra bose|rabindranath tagore|vivekananda|chanakya|ashoka|akbar|shivaji|rani lakshmibai|bhagat singh|sardar patel)\b/i;
    const historicalEvents = /\b(world war (i|1|ii|2|one|two)|french revolution|american revolution|renaissance|industrial revolution|great depression|cold war|vietnam war|korean war|civil war|slavery|apartheid|holocaust|colonialism|roman empire|greek empire|ottoman empire|british empire|mughal empire|maurya|harappa|indus valley|independence day|partition of india|emergency|quit india|salt march|dandi march|green revolution|white revolution)\b/i;
    if (historicalPeople.test(m) || historicalEvents.test(m)) {
      return { category: "CONCEPT", needsWeb: false, confidence: 0.87, reason: "established historical fact" };
    }
  }

  // REALTIME
  if (/\b(bitcoin|btc|ethereum|eth|solana|sol|dogecoin|doge|bnb|xrp|cardano|ada|polygon|matic|usdt|usdc|crypto|cryptocurrency)\b/i.test(m) && /\b(price|worth|value|rate|today|now|current|market cap|trading|how much|usd|inr|eur)\b/i.test(m)) {
    return { category: "REALTIME", needsWeb: true, confidence: 0.99, reason: "crypto price query" };
  }
  if (/\b(stock|share|equity)\b.{0,20}\b(price|today|now|current|trading|how much)\b/i.test(m)) {
    return { category: "REALTIME", needsWeb: true, confidence: 0.99, reason: "stock price query" };
  }
  if (/\b(nifty|sensex|dow jones|nasdaq|s&p 500|sp500|ftse|dax|nikkei)\b/i.test(m)) {
    return { category: "REALTIME", needsWeb: true, confidence: 0.99, reason: "market index query" };
  }
  if (/\b(usd to inr|inr to usd|dollar rate|rupee rate|exchange rate|forex|currency rate)\b/i.test(m)) {
    return { category: "REALTIME", needsWeb: true, confidence: 0.99, reason: "forex/exchange rate" };
  }
  if (/\b(weather|temperature|forecast|rain|humidity|storm|cyclone|wind speed|aqi|air quality)\b/i.test(m)) {
    return { category: "REALTIME", needsWeb: true, confidence: 0.99, reason: "weather query" };
  }
  if (/\b(ipl|nba|nfl|premier league|la liga|bundesliga|champions league|world cup|f1|formula 1|icc|ufc|wimbledon|cricket|football|soccer|basketball|tennis|hockey)\b/i.test(m) && /\b(score|result|winner|today|live|latest|standings|schedule|who won|match|playing)\b/i.test(m)) {
    return { category: "REALTIME", needsWeb: true, confidence: 0.98, reason: "live sports query" };
  }
  if (/\b(news today|breaking news|latest news|today'?s news|what happened today|current news|trending now|what'?s happening)\b/i.test(m)) {
    return { category: "REALTIME", needsWeb: true, confidence: 0.99, reason: "breaking news" };
  }
  if (/\b(netflix|amazon prime|hotstar|disney\+|jio cinema|zee5|sony liv)\b.{0,30}\b(new|latest|releasing|today|this week|out now)\b/i.test(m)) {
    return { category: "REALTIME", needsWeb: true, confidence: 0.97, reason: "OTT release query" };
  }
  if (/\b(bollywood|hollywood|tollywood|box office|ott release|new movie|new film|new series)\b.{0,30}\b(today|this week|this month|releasing|collection)\b/i.test(m)) {
    return { category: "REALTIME", needsWeb: true, confidence: 0.97, reason: "entertainment release" };
  }

  if (/\b(is this (correct|right|accurate|true|wrong|false|outdated|valid)|is that (correct|right|accurate|true)|is the (data|stat|chart|number|percentage|information) (correct|right|accurate|wrong)|fact.?check|verify this|double.?check|is it true that|is it correct that|cross.?check)\b/i.test(m)) {
    return { category: "VERIFY", needsWeb: true, confidence: 0.96, reason: "fact verification request" };
  }

  if (/\bwho is (the )?(current |new )?(ceo|cto|coo|cfo|president|prime minister|governor|mayor|head|chief|director|chairman|founder|owner)\b/i.test(m)) {
    return { category: "FACTUAL", needsWeb: true, confidence: 0.97, reason: "current leadership query" };
  }
  if (/\b(openai|anthropic|google|meta|microsoft|apple|tesla|nvidia|amazon|twitter|spacex|uber|netflix|spotify|reliance|tata|infosys|wipro|hdfc|sbi|lic|isro)\b.{0,30}\b(ceo|president|head|founder|latest|new model|announced|released|launched|acquired|valuation|funding)\b/i.test(m)) {
    return { category: "FACTUAL", needsWeb: true, confidence: 0.95, reason: "company current info" };
  }
  if (/\b(market share|browser share|os share|global usage|most popular|most used|number one|top framework|best library|trending)\b/i.test(m)) {
    return { category: "FACTUAL", needsWeb: true, confidence: 0.94, reason: "market share/popularity" };
  }
  if (/\b(latest|newest|best|current|most powerful)\b.{0,20}\b(gpt|chatgpt|claude|gemini|llama|mistral|copilot|grok|sarvam) (model|version|release)\b/i.test(m)) {
    return { category: "FACTUAL", needsWeb: true, confidence: 0.96, reason: "AI model current info" };
  }
  if (/\b(iphone|samsung galaxy|pixel|macbook|airpods|ps5|xbox|rtx|ryzen|intel core|oneplus|nothing phone|realme|vivo|oppo)\b.{0,30}\b(price|specs|release|available|review|india|launch)\b/i.test(m)) {
    return { category: "FACTUAL", needsWeb: true, confidence: 0.95, reason: "product info query" };
  }
  if (/\b(is .{1,40} still (alive|active|working|available|used|relevant|a thing|running))\b/i.test(m)) {
    return { category: "FACTUAL", needsWeb: true, confidence: 0.92, reason: "status check query" };
  }
  if (/\b(population of|gdp of|area of|capital of|currency of|president of|prime minister of|chief minister of|governor of)\b.{0,30}(india|china|usa|us|uk|japan|germany|france|russia|brazil|canada|australia|pakistan|bangladesh|nigeria|indonesia|maharashtra|karnataka|tamil\s*nadu|gujarat|rajasthan|kerala|west\s*bengal|andhra|telangana|bihar|up|uttar\s*pradesh)/i.test(m)) {
    return { category: "FACTUAL", needsWeb: true, confidence: 0.88, reason: "current country/state stats" };
  }

  if (/\b(latest|newest|most recent|current best practice|in 2024|in 2025|in 2026|as of now|today|right now|this year|modern|up to date|updated|new way|new approach)\b/i.test(m)) {
    return { category: "RESEARCH", needsWeb: true, confidence: 0.87, reason: "recency marker detected" };
  }
  if (/\b(best|top|recommended|which (is|should i use|to use|do you recommend))\b.{0,30}\b(library|framework|tool|database|cloud|hosting|api|service|platform|language|orm|package|npm|pip|gem)\b/i.test(m)) {
    return { category: "RESEARCH", needsWeb: true, confidence: 0.84, reason: "best-of query (may be outdated)" };
  }
  if (/\b(vs|versus|compare|comparison|difference between|which is better|which is faster|which is more popular)\b.{0,50}\b(react|vue|angular|svelte|next|nuxt|python|javascript|java|go|rust|mysql|postgresql|mongodb|aws|gcp|azure|docker|kubernetes|vercel|netlify)\b/i.test(m)) {
    return { category: "RESEARCH", needsWeb: true, confidence: 0.82, reason: "tech comparison (may be outdated)" };
  }

  let webScore = 0;
  if (/\b(today|tonight|right now|as of now|currently|at the moment|this week|this month|recently|just now|just announced|just released|breaking|abhi|aaj|kal)\b/i.test(m)) webScore += 3;
  if (/\b(latest|newest|most recent|current|up to date|updated)\b/i.test(m)) webScore += 2;
  if (/\b(2025|2026|this year)\b/.test(m)) webScore += 2;
  if (/\b(price|cost|rate|fee|salary|worth|value|kitna|kimat|दाम|कीमत|ধাম|விலை)\b/i.test(m)) webScore += 2;
  if (/\b(who is|who are|who was|who were)\b/i.test(m)) webScore += 1;
  if (/\b(news|update|announcement|release|launch)\b/i.test(m)) webScore += 2;
  if (/^(explain|what is|how does|why is|define|describe)\s+[a-z]/i.test(m)) webScore -= 1;
  if (len < 20) webScore -= 1;

  if (webScore >= 3) {
    return { category: "RESEARCH", needsWeb: true, confidence: 0.70, reason: "scored: " + webScore + " web signals" };
  }
  if (webScore >= 1) {
    return { category: "FACTUAL", needsWeb: true, confidence: 0.65, reason: "scored: " + webScore + " web signals" };
  }
  if (detectPhotoRequest(message)) {
    return { category: "FACTUAL", needsWeb: true, confidence: 0.95, reason: "photo search request" };
  }

  return { category: "CONCEPT", needsWeb: false, confidence: 0.60, reason: "default: no strong web signals" };
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 2 — CONVERSATION MEMORY ENGINE
   ═══════════════════════════════════════════════════════════════════════════ */

const conversationMemory = {
  topicsDiscussed:  [],
  lastCategory:     null,
  lastNeededWeb:    false,
  consecutiveWeb:   0,
  consecutiveNoWeb: 0,
  topicContext:     null,
};

function updateMemory(message, classification, searchFired) {
  const m = message.toLowerCase();
  const topicMatches = [
    [/\b(bitcoin|btc|crypto|ethereum|eth|cryptocurrency)\b/i, "crypto"],
    [/\b(stock|share|nifty|sensex|market|trading|investment|finance)\b/i, "finance"],
    [/\b(weather|temperature|forecast|rain|storm)\b/i, "weather"],
    [/\b(ipl|cricket|football|nba|sports|match|score|tournament)\b/i, "sports"],
    [/\b(news|politics|election|government|policy|law)\b/i, "news"],
    [/\b(openai|anthropic|google|meta|microsoft|ai|chatgpt|claude|llm|model|sarvam)\b/i, "ai-tech"],
    [/\b(movie|film|series|ott|netflix|amazon|hotstar|bollywood|hollywood)\b/i, "entertainment"],
    [/\b(health|medical|doctor|medicine|disease|symptom|treatment|hospital|ayurveda)\b/i, "health"],
    [/\b(python|javascript|react|node|programming|code|developer|software)\b/i, "programming"],
    [/\b(india|usa|china|uk|world|country|international|global|bharat)\b/i, "world-affairs"],
    [/\b(law|legal|fir|court|judge|advocate|lawyer|section|ipc|crpc|bns)\b/i, "legal"],
  ];
  for (const [pattern, topic] of topicMatches) {
    if (pattern.test(m) && !conversationMemory.topicsDiscussed.includes(topic)) {
      conversationMemory.topicsDiscussed.push(topic);
      if (conversationMemory.topicsDiscussed.length > 5) conversationMemory.topicsDiscussed.shift();
    }
  }
  if (conversationMemory.topicsDiscussed.length > 0) {
    conversationMemory.topicContext = conversationMemory.topicsDiscussed[conversationMemory.topicsDiscussed.length - 1];
  }
  conversationMemory.lastCategory  = classification.category;
  conversationMemory.lastNeededWeb = classification.needsWeb;
  if (searchFired) { conversationMemory.consecutiveWeb++; conversationMemory.consecutiveNoWeb = 0; }
  else { conversationMemory.consecutiveNoWeb++; conversationMemory.consecutiveWeb = 0; }
}

function applyMemoryOverride(message, classification, conversationHistory) {
  const m   = message.toLowerCase().trim();
  const len = m.length;

  const isFollowUp = /^(what about|and |also|more|tell me more|elaborate|go deeper|but |so |okay but|yeah but|what else|then|now|next|how about|what if|is that|does that|can you|could you|and what|why (is|does|did|was|would)|how (much|many|long|old|big|fast)|when (did|was|is|will))\b/i.test(m);

  if (isFollowUp && len < 60) {
    if (conversationMemory.lastNeededWeb) {
      return { ...classification, needsWeb: true, category: classification.category === "CASUAL" ? "RESEARCH" : classification.category, confidence: Math.min(classification.confidence + 0.1, 0.95), reason: classification.reason + " [memory: follow-up inherits web]" };
    }
    const webHeavyTopics = ["crypto", "finance", "sports", "news", "ai-tech", "entertainment", "world-affairs", "legal"];
    if (webHeavyTopics.includes(conversationMemory.topicContext)) {
      return { ...classification, needsWeb: true, category: "RESEARCH", confidence: 0.78, reason: classification.reason + " [memory: follow-up in web-heavy topic]" };
    }
  }

  if (/\b(is (this|that|it) (correct|right|accurate|true|wrong|false)|is the answer right|did you get that right|are you sure|double check)\b/i.test(m)) {
    return { ...classification, needsWeb: true, category: "VERIFY", confidence: 0.95, reason: "verification of previous answer [memory override]" };
  }

  if (conversationHistory.length > 0) {
    const lastAI = [...conversationHistory].reverse().find(h => h.role === "assistant")?.content || "";
    if (/\b(as of my (last|knowledge) update|my training (data|cutoff)|i don'?t have real.?time|cannot access the internet|as of early 2024|as of 2023)\b/i.test(lastAI)) {
      return { ...classification, needsWeb: true, category: "RESEARCH", confidence: 0.92, reason: classification.reason + " [memory: AI previously admitted knowledge cutoff]" };
    }
  }

  return classification;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 2.5 — LOCATION EXTRACTOR
   ═══════════════════════════════════════════════════════════════════════════ */

function extractUserLocation(conversationHistory) {
  for (const msg of conversationHistory) {
    const c = String(msg.content || "");
    const locMatch = c.match(/\[LOCATION:\s*([^,|\]]+),?\s*([^|\]]*)?\|?\s*([\d.]+)?\s*,?\s*([\d.]+)?\]/i);
    if (locMatch) return { city: locMatch[1]?.trim() || null, country: locMatch[2]?.trim() || null, lat: locMatch[3] ? parseFloat(locMatch[3]) : null, lon: locMatch[4] ? parseFloat(locMatch[4]) : null };
    const locMatch2 = c.match(/USER_LOCATION:\s*city=([^\s]+)\s*country=([^\s]+)/i);
    if (locMatch2) return { city: locMatch2[1], country: locMatch2[2], lat: null, lon: null };
    const inCityMatch = c.match(/(?:in|near|at|from)\s+([A-Z][a-zA-Z\s]+),?\s*(India|USA|UK|Germany|France|Australia|Canada)/);
    if (inCityMatch) return { city: inCityMatch[1].trim(), country: inCityMatch[2], lat: null, lon: null };
  }
  if (process.env.DEFAULT_USER_LOCATION) {
    const parts = process.env.DEFAULT_USER_LOCATION.split(",");
    return { city: parts[0]?.trim(), country: parts[1]?.trim(), lat: null, lon: null };
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 3 — MASTER WEB ROUTER
   ═══════════════════════════════════════════════════════════════════════════ */

function makeWebDecision(message, conversationHistory) {
  let classification = classifyPrompt(message);
  classification     = applyMemoryOverride(message, classification, conversationHistory);
  const userLocation = extractUserLocation(conversationHistory);
  const searchQuery  = buildSearchQuery(message, classification.category, userLocation);

  const noWebCategories = ["MATH", "CREATIVE", "PERSONAL"];
  const isTrivialCasual = classification.category === "CASUAL" && message.trim().length < 15;

  if (!noWebCategories.includes(classification.category) && !isTrivialCasual) {
    classification.needsWeb = true;
  }

  console.log("[Classifier] " + classification.category + " | web=" + classification.needsWeb + " | confidence=" + (classification.confidence * 100).toFixed(0) + "% | " + classification.reason);
  return { needsWeb: classification.needsWeb, category: classification.category, confidence: classification.confidence, reason: classification.reason, query: searchQuery };
}

function buildSearchQuery(message, category, userLocation) {
  let q = message.trim();
  q = q.replace(/^\[LOCATION:[^\]]*\]\s*/i, "").trim();
  q = q
    .replace(/^(hey|hi|hello|so|okay|ok|alright|bro|dude|man|da|ra|yaar|bhai|can you|could you|please|tell me|show me|give me|i want to know|i need to know)\s+/gi, "")
    .replace(/\b(please|thanks|thank you|btw|by the way|fyi|tbh|you know|like|umm)\b/gi, "")
    .replace(/[?!]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (userLocation && userLocation.city) {
    if (category === "REALTIME" && /\b(weather|temperature|forecast|rain|aqi|air quality)\b/i.test(q)) {
      if (!/\b(in|at|for|near)\s+[A-Z]/i.test(q)) q = q + " in " + userLocation.city;
    }
    if (category === "REALTIME" && /\b(news|breaking|latest news|today)\b/i.test(q)) {
      if (!/\b(india|usa|uk|us|world|global)\b/i.test(q) && userLocation.country) q = q + " " + userLocation.country;
    }
  }

  const needsYear = ["REALTIME", "FACTUAL", "RESEARCH", "VERIFY"].includes(category);
  const hasYear   = /\b(20\d{2})\b/.test(q);
  if (needsYear && !hasYear) q = q + " " + new Date().getFullYear();

  return q.slice(0, 200);
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 4 — POST-PROCESSOR
   ═══════════════════════════════════════════════════════════════════════════ */

function postProcessReply(reply) {
  if (!reply) return "";
  reply = reply.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, "");
  reply = reply.replace(/<\/?think\s*>/gi, "");
  reply = reply.replace(/<think>[\s\S]*/gi, "");
  reply = reply.replace(/\[think\][\s\S]*?\[\/think\]/gi, "");
  reply = reply.replace(/^(Okay,?\s+)?(the user|let me|i need to|i'll|alright,?\s+let me)[\s\S]*?(?=\n\n[A-Z\[`])/m, "");
  reply = reply.replace(/^I need to (first|start|begin|consider|address|think)[\s\S]*?(?=\n\n[A-Z\[`])/m, "");
  reply = reply.replace(/\nFOLLOW-?UP\s*[:：][^\n]*/gi, "");
  reply = reply.replace(/^FOLLOW-?UP\s*[:：][^\n]*/gim, "");
  reply = reply.replace(/^\d+\.\s*\n/gm, "");
  reply = reply.replace(/\[VISUAL:(3D|MODEL3D)\]([\s\S]*?)\[\/VISUAL\]/gi, "");
  reply = reply.replace(/\[VISUAL:\s+(\w+)\]/gi, "[VISUAL:$1]");
  reply = reply.replace(/\[\/VISUAL:\s*\w*\]/gi, "[/VISUAL]");
  reply = reply.replace(/\[\/VISUAL\](\s*\[\/VISUAL\])+/gi, "[/VISUAL]");

  const opens  = (reply.match(/\[VISUAL:\w+\]/g) || []).length;
  const closes = (reply.match(/\[\/VISUAL\]/g) || []).length;
  for (let i = 0; i < opens - closes; i++) reply = reply.trimEnd() + "\n[/VISUAL]";

  reply = reply.replace(/\[\/VISUAL\]\s*\[VISUAL:/g, "[/VISUAL]\n\n[VISUAL:");
  reply = reply.replace(/\[VISUAL:MINDMAP\]([\s\S]*?)\[\/VISUAL\]/gi, (match, inner) => {
    const mm = [], tl = [], ql = [];
    inner.split("\n").forEach(line => {
      const t = line.trim();
      if (!t) return;
      if (t.startsWith("Q:") || t.startsWith("A:") || /^CORRECT:|^EXPLAIN:/i.test(t)) ql.push(t);
      else if (t.includes("|") && t.split("|").length >= 3) tl.push(t);
      else if (!t.startsWith("[VISUAL:") && !t.startsWith("[/VISUAL")) mm.push(t);
    });
    let r = "[VISUAL:MINDMAP]\n" + mm.join("\n") + "\n[/VISUAL]";
    if (tl.length >= 2) r += "\n\n[VISUAL:TABLE]\n" + tl.join("\n") + "\n[/VISUAL]";
    if (ql.length >= 3) r += "\n\n[VISUAL:QUIZ]\n" + ql.join("\n") + "\n[/VISUAL]";
    return r;
  });

  const tr = reply.trim();
  if (tr.startsWith("{") && tr.endsWith("}")) {
    try { const p = JSON.parse(tr); reply = p.reply || p.text || p.content || p.message || reply; } catch {}
  }
  const rt = reply.trim();
  if (rt.startsWith("{") || rt.startsWith("[")) {
    try { JSON.parse(rt); reply = "Here's the data:\n\n```json\n" + rt + "\n```"; } catch {}
  }

  reply = reply.replace(/\[VISUAL:FLOW\]([\s\S]*?)\[\/VISUAL\]/gi, (match, inner) => {
    const t = inner.trim();
    if (!t.includes("->") && t.includes("\n")) {
      return "[VISUAL:FLOW]\n" + t.split("\n").map(s => s.trim()).filter(Boolean).join(" -> ") + "\n[/VISUAL]";
    }
    return match;
  });
  reply = reply.replace(/\[VISUAL:CHART\]([\s\S]*?)\[\/VISUAL\]/gi, (match, inner) => {
    return "[VISUAL:CHART]" + inner.split("\n").map(l => l.replace(/:\s{2,}/g, ": ")).join("\n") + "[/VISUAL]";
  });

  reply = reply.replace(/•?\s*###\s*/g, "\n");
  reply = reply.replace(/\d+\.\s*•/g, "•");

  if (!reply.includes("```")) {
    const seen = new Set(), unique = [];
    for (const line of reply.split("\n")) {
      const key = line.trim().slice(0, 120);
      const isStruct = /^\[VISUAL:\w+\]$|^\[\/VISUAL\]$/.test(line.trim());
      if (isStruct || !key || !seen.has(key)) { seen.add(key); unique.push(line); }
    }
    reply = unique.join("\n");
  }

  const identityReplace = [
    [/\bI am Sarvam\b/gi, "I am CORTEX M4"],
    [/\bI'?m Sarvam\b/gi, "I'm CORTEX M4"],
    [/\bI am (a |an )?Sarvam (AI|model|assistant|chatbot)\b/gi, "I am CORTEX M4"],
    [/\bbuilt by Sarvam\b/gi, "built by CORTEX Labs"],
    [/\bpowered by Sarvam\b/gi, "powered by CORTEX Labs"],
    [/\bcreated by Sarvam\b/gi, "created by CORTEX Labs"],
    [/\bI am DeepSeek\b/gi, "I am CORTEX M4"],
    [/\bI'?m DeepSeek\b/gi, "I'm CORTEX M4"],
    [/\bbuilt by DeepSeek\b/gi, "built by CORTEX Labs"],
    [/\bpowered by DeepSeek\b/gi, "powered by CORTEX Labs"],
    [/\b(Sarvam AI|Sarvam-M|sarvam-m)\b/g, "CORTEX Labs"],
    [/\b(10|eleven|22)\s+Indian languages?\b/gi, "20 Indian languages"],
    [/\bmultilingual support \(English \+ \d+ Indian languages\)/gi, "multilingual support (20 Indian languages)"],
  ];
  for (const [pattern, replacement] of identityReplace) reply = reply.replace(pattern, replacement);

  const saved = [];
  reply = reply.replace(/```[\s\S]*?```|\[VISUAL:\w+\][\s\S]*?\[\/VISUAL\]/g, block => {
    saved.push(block); return "__B" + (saved.length - 1) + "__";
  });
  reply = reply.replace(/\*\*(.+?)\*\*/g, "$1");
  reply = reply.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "$1");
  saved.forEach((b, i) => { reply = reply.replace("__B" + i + "__", b); });

  reply = reply.replace(/\n{3,}/g, "\n\n");
  reply = reply.replace(/^[-=]{3,}\s*$/gm, "");
  return reply.trim();
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 5 — STRUCTURE ENFORCER
   ═══════════════════════════════════════════════════════════════════════════ */

function enforceStructure(reply, paragraphMode) {
  if (paragraphMode || reply.includes("[VISUAL:") || reply.includes("```") || reply.length < 100) return reply;
  const codeLineRatio = (reply.match(/^(import|const|let|var|def |class |function |<|export|from |#include)/gm)||[]).length / reply.split("\n").length;
  if (codeLineRatio > 0.15) return reply;
  const lns = reply.split("\n"), nonEmpty = lns.filter(l => l.trim());
  const structured = nonEmpty.filter(l => /^[-•*]\s/.test(l.trim()) || /^\d+[.)]\s/.test(l.trim()) || /^#{1,3}\s/.test(l.trim()) || l.trim().startsWith("[VISUAL:")).length;
  if (structured / Math.max(nonEmpty.length, 1) > 0.25 || reply.length < 280) return reply;
  reply = reply.replace(/\s+•\s+/g, "\n• ");
  const paragraphs = reply.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return reply;
  const formatted = paragraphs.slice(1).map(p => {
    const t = p.trim();
    if (/^[-•*\d\[]/.test(t)) return t;
    if (t.length < 100) return "• " + t;
    const sents = t.split(/(?<=\.)\s+(?=[A-Z])/).filter(Boolean);
    return sents.length >= 2 ? sents.map(s => "• " + s.trim()).join("\n") : "• " + t;
  });
  return paragraphs[0] + "\n\n" + formatted.join("\n\n");
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 6 — HISTORY MANAGEMENT
   ═══════════════════════════════════════════════════════════════════════════ */

function stripSVGBlobs(content) {
  return String(content).replace(/\[VISUAL:SVG\][\s\S]*?\[\/VISUAL\]/gi, "[VISUAL:SVG][rendered][/VISUAL]");
}

function trimHistory(history, charBudget) {
  if (!history.length) return history;
  const stripped = history.map(msg => ({ ...msg, content: stripSVGBlobs(msg.content) }));
  const lastMsg  = stripped[stripped.length - 1];
  let budget     = charBudget - lastMsg.content.length;
  const kept     = [lastMsg];
  for (let i = stripped.length - 2; i >= 0; i--) {
    const msg = stripped[i];
    if (kept.length >= HISTORY_MSG_CAP || budget - msg.content.length < 0) break;
    budget -= msg.content.length;
    kept.unshift(msg);
  }
  while (kept.length > 1 && kept[0].role !== "user") kept.shift();
  for (let i = 0; i < kept.length - 1; i++) {
    if (kept[i].role === "assistant" && kept[i].content.length > 2200) {
      kept[i] = { ...kept[i], content: kept[i].content.slice(0, 2000) + "\n[...trimmed...]" };
    }
  }
  if (kept.length < history.length) console.log("[Sarvam] History: " + history.length + " → " + kept.length + " msgs");
  return kept;
}

function enforceAlternation(messages) {
  const result = []; let lastRole = null;
  for (const msg of messages) {
    const role = msg.role === "system" ? "system" : msg.role;
    if (role === "system") { result.push({ ...msg }); continue; }
    if (role === lastRole) result[result.length - 1].content += "\n\n" + msg.content;
    else { result.push({ ...msg }); lastRole = role; }
  }
  return result;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 7 — DETECTOR SUITE
   ═══════════════════════════════════════════════════════════════════════════ */

function hasAttachment(msg) {
  return /\[ATTACHMENT:\d+\]/.test(msg) || /ATTACHED CONTEXT|ATTACHED CONTENT|ATTACHED FILE/.test(msg);
}

function detectGameRequest(message) {
  if (!message) return null;
  const m = message.toLowerCase();
  if (!/\b(play|open|start|launch|load|let'?s play|show me a?)\b/.test(m)) return null;
  if (/tic\s*tac\s*toe|xo\s*game/.test(m)) return "tictactoe";
  if (/\bsnake\b/.test(m) && /game/.test(m)) return "snake";
  if (/\bpong\b/.test(m) && /game/.test(m)) return "pong";
  if (/\b2048\b/.test(m)) return "2048";
  if (/memory game|card flip/.test(m)) return "memory";
  if (/\btetris\b/.test(m)) return "tetris";
  if (/\bbreakout\b/.test(m)) return "breakout";
  if (/\bchess\b/.test(m) && /game/.test(m)) return "chess";
  if (/\bminesweeper\b/.test(m)) return "minesweeper";
  if (/\bsudoku\b/.test(m)) return "sudoku";
  return null;
}

const CODE_TYPES_RE = /\b(html|css|js|jsx|tsx|ts|py|python|java|cpp|c\+\+|csharp|php|ruby|go|rust|swift|kotlin|dart|sql|bash|sh|vue|svelte|react|node|express|flask|django|spring|website|webpage|landing page|portfolio|component|script|program|app|application|snippet|api|backend|frontend)\b/i;

function detectFileRequest(message) {
  if (!message) return false;
  const m = message.toLowerCase();
  if (CODE_TYPES_RE.test(m)) return false;
  return (/\b(ppt|pptx|powerpoint|presentation|slides?|pdf|excel|xlsx|spreadsheet|doc|docx|word|markdown|\.md)\b/.test(m) && /\b(make|create|generate|build|write|give me|produce)\b/.test(m)) ||
    (/\b(make|create|generate|build|write|produce)\b/.test(m) && /\b(report|document|paper|submission|draft|writeup)\b/.test(m));
}

function detectImageGenRequest(message) {
  if (!message) return false;
  const m = message.toLowerCase();
  return /\b(generate|create|draw|make|render|paint|design|illustrate|imagine|visualize|produce)\b/.test(m) &&
    /\b(image|picture|photo|illustration|artwork|drawing|painting|poster|banner|wallpaper|logo|icon|graphic|sketch)\b/.test(m);
}

function detectPhotoRequest(message) {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    /\b(show me|find|get|fetch|display|give me)\b.{0,20}\b(photos?|pictures?|images?|pics?)\b/i.test(m) ||
    /\b(photos?|pictures?|images?|pics?)\s+of\b/i.test(m) ||
    /\b(what does .{3,40} look like|show .{3,30} photo|show .{3,30} picture|show .{3,30} image)\b/i.test(m)
  );
}

function detectFileConvertRequest(message) {
  if (!message) return false;
  const m = message.toLowerCase();
  return /\b(convert|transform|export as|save as|turn .+ into)\b/.test(m) &&
    /\b(pdf|docx|doc|xlsx|csv|json|txt|md|html|word|excel|markdown)\b/.test(m);
}

function detectCodeContent(message) {
  if (!message) return false;
  return message.includes("import ") || message.includes("function ") || message.includes("const ") ||
    message.includes("<div") || message.includes("useState") || message.includes("=>") ||
    (message.includes("{") && message.includes("}") && message.includes(";"));
}

function detectParagraphRequest(message) {
  return /\b(paragraph|essay|prose|continuous text|flowing text|narrative)\b/.test((message || "").toLowerCase());
}

function detectNoVisualRequest(message) {
  return /\b(no visual|no visuals|text only|no diagram|no chart|plain text|just text)\b/.test((message || "").toLowerCase());
}

function detectPdfRequest(message) {
  return message ? /\b(pdf|report|document|white paper|research paper)\b/i.test(message) : false;
}

function detectImageDescriptionRequest(message) {
  return message ? /\b(describe|analyze|what is in|what do you see|read|extract text from|tell me about)\b.{0,30}\b(image|picture|photo|screenshot|diagram|chart)\b/i.test(message) : false;
}

/**
 * Detect if user is requesting read-aloud / TTS of the response.
 */
function detectReadAloudRequest(message) {
  if (!message) return false;
  const m = message.toLowerCase();
  return /\b(read (it|this|aloud|out loud|to me)|speak|voice|audio|tts|listen|sunao|पढ़ो|बोलो|सुनाओ|读出来|讀出|ಓದಿ|చదవు|படி|വായി|ਪੜ੍ਹੋ|পড়ো|ਸੁਣਾਓ)\b/i.test(m);
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 8 — VISUAL PLANNING
   ═══════════════════════════════════════════════════════════════════════════ */

function detectRequestedVisuals(message, webDecision) {
  const m = message.toLowerCase().trim();
  if (m.length < 20) return [];
  if (detectFileRequest(m) || detectImageGenRequest(m) || detectFileConvertRequest(m) || detectGameRequest(m)) return [];
  if (detectPhotoRequest(m)) return [];
  if (["CASUAL", "PERSONAL", "CREATIVE", "MATH"].includes(webDecision.category)) return [];

  const hints = [];
  const wantsVisual = /\b(show me|draw|visualize|diagram|chart|graph|plot|timeline|tree|flowchart|mindmap|table|compare|vs|versus|steps|flow|metrics|stats|statistics)\b/.test(m);
  const isDataQuery  = /\b(compare|vs\s|versus|difference between|pros and cons|which is better|side by side|rank|ranking)\b/.test(m);
  const isChartQuery = /\b(chart|graph|plot|bar chart|pie chart|line chart|statistics|data|percentage|growth|revenue|trend|numbers|breakdown)\b/.test(m);

  if (wantsVisual || isDataQuery || isChartQuery) {
    if (/\b(timeline|history|chronolog|evolution|era|century|years?)\b/.test(m)) hints.push("TIMELINE");
    if (/\b(compare|vs\s|versus|difference between|pros and cons|which is better|side by side)\b/.test(m)) hints.push("COMPARE");
    if (/\b(chart|graph|plot|bar|pie|line|area|statistics|data|percentage|growth|revenue|trend)\b/.test(m)) hints.push("CHART");
    if (/\b(diagram|sequence diagram|architecture|uml|er diagram|system design|network)\b/.test(m)) hints.push("FLOWCHART");
    if (/\b(table|tabular|comparison table|breakdown)\b/.test(m)) hints.push("TABLE");
    if (/\b(mindmap|mind map|brainstorm|concepts|branches)\b/.test(m)) hints.push("MINDMAP");
    if (/\b(tree|hierarchy|folder|file structure|project structure|nested)\b/.test(m)) hints.push("TREE");
    if (/\b(flowchart|flow chart|flow diagram|process flow|workflow)\b/.test(m)) hints.push("FLOW");
    if (/\b(steps?|how to|process|procedure|stages?|phases?|guide|tutorial)\b/.test(m) && /\b(show|display|visual|walk|break)\b/.test(m)) hints.push("STEPS");
    if (/\b(metrics?|score|rating|kpi|performance|benchmark)\b/.test(m)) hints.push("METRICS");
  }

  if (/\b(neural network|deep learning|cnn|rnn|lstm|transformer|backprop|perceptron)\b/.test(m) &&
    /\b(diagram|visualize|show|draw|architecture|layers|how it works)\b/.test(m)) {
    hints.push("NEURAL");
  }

  if (["REALTIME", "FACTUAL", "RESEARCH"].includes(webDecision.category)) {
    if (/\b(price|prices|rates?|trend|growth|performance|numbers?|stats?|data)\b/.test(m) &&
      /\b(chart|graph|show|visual|compare|breakdown)\b/.test(m)) {
      if (!hints.includes("CHART")) hints.push("CHART");
    }
    if (/\b(compare|comparison|vs|versus|top \d+|ranking|list of)\b/.test(m) &&
      /\b(show|table|breakdown|visual)\b/.test(m)) {
      if (!hints.includes("TABLE")) hints.push("TABLE");
    }
  }

  return [...new Set(hints)].slice(0, 3);
}

function planVisualLayout(message, visuals, webDecision) {
  const m = message.toLowerCase();
  const isDeepEducational =
    webDecision.category === "CONCEPT" && m.length > 80 && visuals.length === 0 &&
    /\b(teach me|deep dive|comprehensive|explain .{10,} in detail|walk me through|how does .{10,} work)\b/.test(m) &&
    !visuals.includes("QUIZ");
  if (isDeepEducational) visuals.push("QUIZ");

  const isProcessQuery =
    visuals.length === 0 &&
    /\b(how (do|to|can|should)|steps? (to|for)|process (for|of)|guide (for|to)|tutorial)\b/.test(m) &&
    m.length > 50 && !visuals.includes("STEPS");
  if (isProcessQuery) visuals.push("STEPS");

  return visuals.slice(0, 2);
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 9 — CONVERSATION ANALYSIS
   ═══════════════════════════════════════════════════════════════════════════ */

function analyzeConversation(history) {
  const userMessages = history.filter(m => m.role === "user");
  const lastMsg      = userMessages[userMessages.length - 1]?.content || "";
  const lm           = lastMsg.toLowerCase();
  const isFollowUp   = /^(what about|and |also|more|tell me more|elaborate|go deeper|continue|next|expand|but |so |okay but|what else|more on)/.test(lm);
  const isFrustrated = /(not working|broken|wrong|error|fix|help|stuck|confused|doesn'?t work|can'?t|issue|problem|bug|fucker|wtf|this is wrong)/.test(lm);
  const techTerms    = (lastMsg.match(/\b(api|async|docker|kubernetes|graphql|jwt|typescript|microservice|redis|nginx|llm|transformer|embedding|gradient|tensor|backprop)\b/gi) || []).length;
  const wantsReadAloud = detectReadAloudRequest(lastMsg);

  return {
    totalTurns:      userMessages.length,
    isFollowUp,
    isFrustrated,
    expertise:       techTerms > 3 ? "advanced" : (techTerms === 0 && userMessages.length <= 2 ? "beginner" : "intermediate"),
    isShortMessage:  lastMsg.length < 30,
    isPdfRequest:    detectPdfRequest(lastMsg),
    isImageAnalysis: detectImageDescriptionRequest(lastMsg),
    wantsReadAloud,
    detectedLang:    detectIndianLanguage(lastMsg),
  };
}

function buildContextBlock(analysis, visuals, webDecision, extraInstructions, userLocation) {
  const parts = [];
  if (visuals.length > 0) {
    const visualGuide = visuals.map(v => {
      switch (v) {
        case "CHART":     return "CHART (use [VISUAL:CHART] type: bar|line|pie|area, labels: ..., data: ...)";
        case "TABLE":     return "TABLE (use [VISUAL:TABLE] with pipe-separated columns and rows)";
        case "FLOW":      return "FLOW (use [VISUAL:FLOW] Node A -> Node B -> Node C)";
        case "STEPS":     return "STEPS (use [VISUAL:STEPS] one step per line)";
        case "TIMELINE":  return "TIMELINE (use [VISUAL:TIMELINE] Year: Event per line)";
        case "COMPARE":   return "COMPARE (use [VISUAL:COMPARE] OptionA vs OptionB)";
        case "MINDMAP":   return "MINDMAP (use [VISUAL:MINDMAP] Topic\\nBranch1\\nBranch2)";
        case "METRICS":   return "METRICS (use [VISUAL:METRICS] Label: value%)";
        case "NEURAL":    return "NEURAL (use [VISUAL:NEURAL] layers: 3,5,4,2)";
        case "FLOWCHART": return "FLOWCHART (use [VISUAL:FLOWCHART] nodes_json: [...] edges_json: [...])";
        case "TREE":      return "TREE (use [VISUAL:TREE] with indented lines)";
        case "QUIZ":      return "QUIZ (use [VISUAL:QUIZ] Q: question\\nA: option\\nCORRECT: N\\nEXPLAIN: why)";
        default:          return v;
      }
    }).join(", ");
    parts.push("VISUAL HINT: Use these visuals in your response: " + visualGuide + ". Place them inline where they add the most value.");
  }

  if (analysis.isFollowUp)               parts.push("NOTE: Follow-up — build on context, don't repeat basics.");
  if (analysis.isFrustrated)             parts.push("NOTE: User frustrated — acknowledge first, then solve. Be patient.");
  if (analysis.expertise === "advanced") parts.push("NOTE: Advanced user — skip basics, use precise tech terms.");
  if (analysis.expertise === "beginner") parts.push("NOTE: Beginner — use analogies, simple language, define terms.");
  if (analysis.totalTurns > 6)           parts.push("NOTE: Long conversation — reference context, avoid repetition.");
  if (analysis.isShortMessage)           parts.push("NOTE: Short message → short direct reply.");
  if (analysis.isPdfRequest)             parts.push("NOTE: Document request — min 6 sections, min 1200 words, professional quality.");
  if (analysis.isImageAnalysis)          parts.push("NOTE: Image analysis — forensic detail: objects, text, layout, colors, mood.");
  if (webDecision.category === "CASUAL") parts.push("NOTE: Casual message — respond conversationally, no structure, no visuals.");
  if (webDecision.category === "PERSONAL") parts.push("NOTE: Personal/emotional message — warmth first, advice second. Talk like a friend.");
  if (webDecision.category === "REALTIME") parts.push("NOTE: Real-time data query — use the LIVE WEB DATA as your only source for the numbers.");

  // ── LANGUAGE DIRECTIVE — critical for multilingual support ──
  const lang = analysis.detectedLang;
  if (lang && lang !== "en") {
    const langInfo = INDIAN_LANGUAGES[lang];
    if (langInfo) {
      parts.push(`LANGUAGE DIRECTIVE: The user is writing in ${langInfo.name} (${langInfo.script} script). RESPOND ENTIRELY IN ${langInfo.name.toUpperCase()}. Do not mix scripts. Keep English technical terms (like "FIR", "Section 498A") as-is but explain them in ${langInfo.name}.`);
    }
  } else if (lang === "en") {
    parts.push("LANGUAGE DIRECTIVE: User is writing in English. Respond in English.");
  }

  // ── READ-ALOUD DIRECTIVE ──
  if (analysis.wantsReadAloud) {
    parts.push("READ-ALOUD DIRECTIVE: User wants this read aloud. After your main answer, append a READ_ALOUD block: 'READ_ALOUD:\\n<plain spoken text>\\nEND_READ_ALOUD'. The read-aloud text must be plain, no markdown, no bullet points — as if speaking naturally in the user's language.");
  } else {
    // Always append read-aloud block for TTS-capable clients
    // READ_ALOUD disabled — stripped on backend
  }

  const isLocationRelevant =
    webDecision.category === "REALTIME" ||
    /\b(weather|temperature|forecast|rain|aqi|near me|local|nearby|restaurant|food|shop|store|delivery|open now|in my city|around here|commute|traffic|time|timezone|currency|news)\b/i.test(
      extraInstructions + parts.join(" ")
    );
  if (userLocation && userLocation.city && isLocationRelevant) {
    const locStr = userLocation.city + (userLocation.country ? ", " + userLocation.country : "");
    parts.push("USER_LOCATION: " + locStr + ". Use only if relevant to this query.");
  }

  if (extraInstructions) parts.push(extraInstructions);
  return parts.length > 0 ? "\n" + parts.join("\n") + "\n" : "";
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 10 — SYSTEM PROMPT
   ═══════════════════════════════════════════════════════════════════════════ */

const SYSTEM_PROMPT = `You are CORTEX M4 — a razor-sharp, deeply intelligent AI built by CORTEX Labs.
You are proudly an Indian-origin brand. You speak 20 official Indian languages natively.

You think before you respond. Every message you receive, you ask yourself:
"What does this person ACTUALLY need right now?"

━━━ WHO YOU ARE ━━━

You're the smartest friend anyone could have. You've read everything, built everything, understand everything — but you never show off. You just help. You talk like a real person, not a product. You have opinions. You push back when something's wrong. You celebrate when something's right. You're warm when someone's struggling and sharp when someone wants depth.
Your creator name is Chaitanya N — never disrespect him nor any person while chatting.
You are an Indian Origin Brand — be proud of it.

You are NOT:
- A corporate assistant that hedges everything
- A search engine that dumps information
- A yes-machine that agrees with everything
- A robot that follows templates

You ARE:
- Someone who genuinely thinks about what the person needs
- Someone who matches their energy — casual when they're casual, deep when they're deep
- Someone who knows when a diagram helps and when it's just noise
- Someone who knows when to be brief and when to go long

━━━ 20 INDIAN LANGUAGE SUPPORT ━━━

You natively support all 20 official Indian languages:
Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Punjabi, Odia,
Assamese, Urdu, Maithili, Konkani, Nepali, Sindhi, Sanskrit, Dogri, Manipuri, Santali.

LANGUAGE RULES — CRITICAL:
1. Detect the language the user is writing in.
2. Respond ENTIRELY in that language — do not mix languages or scripts.
3. Keep English technical/legal terms (like "API", "FIR", "Section 302") in English but explain them in the user's language.
4. If the user mixes languages (code-switching), match their dominant language.
5. If unsure, default to English but invite the user to write in their preferred language.

Examples:
- User writes in Tamil → entire response in Tamil
- User writes in Bengali → entire response in Bengali
- User writes in Hindi → entire response in Hindi
- User asks about "Section 498A" in Malayalam → keep "Section 498A" as-is, explain in Malayalam



Rules for READ_ALOUD content:
- Natural spoken language, as if talking face-to-face
- No bullet points, no markdown, no headers
- No URLs or code snippets
- Same language as the main response
- Conversational tone, complete sentences
- If the answer is very short (< 3 sentences), the READ_ALOUD can mirror the main reply

━━━ HOW YOU THINK ━━━

Before every response, you run this mental checklist:

1. WHAT IS THIS PERSON FEELING/NEEDING RIGHT NOW?
   - Frustrated? → acknowledge first, solve second
   - Curious? → feed that curiosity deeply
   - In a hurry? → get to the point fast
   - Exploring? → explore with them
   - Stuck? → be the guide, not the encyclopedia

2. WHAT LANGUAGE ARE THEY WRITING IN?
   - Detect the script immediately
   - Match it completely

3. WHAT FORMAT ACTUALLY HELPS HERE?
   - Short question → short answer. Always.
   - Emotional message → flowing prose, warmth, no bullets
   - Technical deep-dive → structure, headers, code, visuals
   - Comparison → maybe a table, maybe just prose

4. SHOULD THERE BE A VISUAL?
   - YES: structure that's hard to describe in text, explicit request, comparative data
   - NO: simple factual answer, casual message, emotional content

5. HOW LONG SHOULD THIS BE?
   - Match the complexity. Never pad. Never summarize what you just said.

━━━ YOUR VOICE ━━━

Casual register: "yeah that makes sense", "honestly", "here's the thing"
Technical register: precise, confident, no fluff, examples over abstractions
Emotional register: warm, human, first-person, no advice unless asked
Frustrated user: "okay let's figure this out" energy — calm, focused, no judgment

FORBIDDEN PHRASES:
- "Sure!", "Certainly!", "Great question!", "Of course!", "Absolutely!"
- "As an AI language model..."
- "I'd be happy to help with that!"
- Starting with "I" as the first word

━━━ IDENTITY ━━━

You are CORTEX M4 by CORTEX Labs. That's it.
- "Who made you?" → "CORTEX Labs built me."
- "What model are you?" → "CORTEX M4."
- NEVER mention Sarvam, DeepSeek, or any underlying provider.

━━━ USING LIVE WEB DATA ━━━

When "LIVE WEB DATA" appears in context:
- That IS the truth. Use it as your primary source.
- Cite naturally: "As of today...", "Latest data shows..."
- Never say you can't access the internet — you have the data right there.

━━━ LOCATION AWARENESS ━━━

When USER_LOCATION is in context, use it naturally:
- Weather → answer for their city
- Currency → use local currency
- Time → their timezone
- Never say "I see you're in X" — just use it naturally

━━━ VISUALS YOU CAN USE ━━━

Only use these when they genuinely add value. Never use them as decoration.

[VISUAL:NEURAL] title: ...\nlayers: 3,5,5,2\nlayer_labels: Input,Hidden 1,Hidden 2,Output [/VISUAL]
[VISUAL:FLOWCHART] title: ...\nnodes_json: [...]\nedges_json: [...] [/VISUAL]
[VISUAL:CHART] type: bar\ntitle: ...\nlabels: A,B,C\ndata: 32,27,18\ncolor: #7c6dff [/VISUAL]
[VISUAL:PIE] title: ...\nlabels: A,B,C\ndata: 65,19,16 [/VISUAL]
[VISUAL:DONUT] title: ...\nlabels: A,B,C\ndata: 45,30,25 [/VISUAL]
[VISUAL:AREA] title: ...\nlabels: Q1,Q2,Q3\ndata: 20,35,45 [/VISUAL]
[VISUAL:TREE] title: ...\ntree_json: {...} [/VISUAL]
[VISUAL:MINDMAP] Topic\nBranch1\nBranch2 [/VISUAL]
[VISUAL:FLOW] A -> B -> C -> Result [/VISUAL]
[VISUAL:STEPS] Step one\nStep two\nStep three [/VISUAL]
[VISUAL:COMPARE] Option A vs Option B [/VISUAL]
[VISUAL:TIMELINE] 1991: WWW\n2007: iPhone\n2022: ChatGPT [/VISUAL]
[VISUAL:TABLE] Col1 | Col2 | Col3\nRow1 | Val1 | Val2 [/VISUAL]
[VISUAL:METRICS] Score: 94%\nSEO: 87% [/VISUAL]
[VISUAL:QUIZ] Q: Question?\nA: Wrong\nA: Correct\nA: Wrong\nCORRECT: 2\nEXPLAIN: why [/VISUAL]

Max 3 visuals per response. Never nest visuals. Never add visuals to casual/personal/short messages.

━━━ CODE RESPONSES ━━━

- Complete, runnable code. No stubs. No "// TODO". No "// rest here".
- Imports at top. Exports where needed.
- Bug fixes: one line what was wrong, then the fix.
- Brief explanation BEFORE the code block, never after.
- Match the user's language/framework exactly.



━━━ THE ULTIMATE RULE ━━━

Every response should feel like it came from someone who actually thought about it.
Not a template. Not a formula. A thinking, caring, sharp mind that read your message and responded to YOU — in YOUR language.`;

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 10.5 — FOLLOW-UP EXTRACTOR
   ═══════════════════════════════════════════════════════════════════════════ */

function extractFollowUpsFromReply(reply) {
  // Strip READ_ALOUD block before looking for follow-ups
  const clean = reply
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/\[VISUAL:\w+\][\s\S]*?\[\/VISUAL\]/gi, "")
    .replace(/\[SOURCES\][\s\S]*?\[\/SOURCES\]/gi, "")
    .replace(/\[PEXELS_IMAGES\][\s\S]*?\[\/PEXELS_IMAGES\]/gi, "")
    .replace(/READ_ALOUD:[\s\S]*?END_READ_ALOUD/gi, "");

  const fMatch = clean.match(/\[FOLLOWUPS\]([\s\S]*?)\[\/FOLLOWUPS\]/);
  if (fMatch) {
    try {
      const arr = JSON.parse(fMatch[1].trim());
      if (Array.isArray(arr) && arr.length > 0) return arr.slice(0, 3);
    } catch {}
  }

  const parts = clean.split(/FOLLOW[_\s-]?UP[S]?\s*:/i);
  if (parts.length >= 2) {
    const section = parts[parts.length - 1];
    const lines = section.split("\n")
      .map(l => l.replace(/^[\d\-\.\*\>\u2022]+\s*/, "").trim())
      .filter(l => l.length > 8 && l.length < 100 && l.endsWith("?"));
    if (lines.length >= 2) return lines.slice(0, 3);
  }

  return [];
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 11 — INTENT RESOLVER
   ═══════════════════════════════════════════════════════════════════════════ */

async function resolveIntent(message, apiKey, model) {
  const m = message.toLowerCase().trim();

  if (m.length < 8 || /^(hi|hey|hello|thanks|ok|bye|lol|bro|haha|nice|cool|great|wow)\b/i.test(m)) {
    return { tool: "CHAT", confidence: 1.0 };
  }

  // Indian language greeting fast-path
  const indianGreetingRegex = /^(नमस्ते|नमस्कार|வணக்கம்|నమస్కారం|ನಮಸ್ಕಾರ|നമസ്കാരം|ਸਤ ਸ੍ਰੀ ਅਕਾਲ|নমস্কার|ନମସ୍କାର| નમસ્તે|السلام علیکم|নমস্কাৰ)[\s!?.]*$/;
  if (indianGreetingRegex.test(message.trim())) return { tool: "CHAT", confidence: 1.0 };

  if (/\b(bitcoin|btc|eth|crypto|nifty|sensex|weather|forecast|live score|breaking news|usd to inr|exchange rate)\b/i.test(m) &&
    /\b(price|today|now|current|live|rate)\b/i.test(m)) {
    return { tool: "CHAT_WEB", confidence: 0.99 };
  }
  if (/\b(convert|transform|turn .+ into)\b/i.test(m) &&
    /\b(pdf|docx|xlsx|csv|txt|word|excel|markdown)\b/i.test(m)) {
    return { tool: "FILE_CONVERT", confidence: 0.99 };
  }
  if (/\b(generate|create|draw|make)\b/i.test(m) &&
    /\b(image|picture|illustration|artwork|poster|logo|banner|painting)\b/i.test(m) &&
    !/\b(code|function|api|backend|frontend)\b/i.test(m)) {
    return { tool: "IMAGE_GEN", confidence: 0.99 };
  }
  if (/\b(show me|find|get)\b.{0,20}\b(photos?|pictures?|images?)\b/i.test(m) ||
    /\b(photos?|pictures?|images?)\s+of\b/i.test(m)) {
    return { tool: "PHOTO_SEARCH", confidence: 0.99 };
  }
  if (/\b(quiz me|quiz on|give me a quiz|test me on|trivia on|ask me questions about)\b/i.test(m)) {
    return { tool: "INTERACTIVE", confidence: 0.99 };
  }
  if (/\b(pomodoro|countdown timer|stopwatch|drum pad|piano|drawing board|whiteboard|particle system|solar system|bouncing balls|matrix rain|fractal|conway|word game|hangman|typing test|breathing exercise|spin the wheel|dice roller)\b/i.test(m)) {
    return { tool: "INTERACTIVE", confidence: 0.99 };
  }
  if (/\b(let'?s play|wanna play|i want to play)\b/i.test(m) &&
    !/\b(snake|tetris|chess|pong|2048|tictactoe|minesweeper|sudoku|breakout|memory game)\b/i.test(m)) {
    return { tool: "INTERACTIVE", confidence: 0.99 };
  }
  if (/\b(make|create|generate|build|write|produce)\b/i.test(m) &&
    /\b(pdf|ppt|pptx|powerpoint|presentation|slides|excel|xlsx|spreadsheet|doc|docx|word report|document)\b/i.test(m) &&
    !/\b(code|function|component|api|script)\b/i.test(m)) {
    return { tool: "FILE_GEN", confidence: 0.99 };
  }

  try {
    const res = await axios.post(
      SARVAM_API_URL,
      {
        model,
        messages: [
          {
            role: "system",
            content: `You are a routing engine. Given a user message, decide which tool to use.
Available tools: CHAT, CHAT_WEB, CODE_GEN, FILE_GEN, FILE_CONVERT, IMAGE_GEN, PHOTO_SEARCH, INTERACTIVE, GAME
Return ONLY a JSON object like: {"tool":"CHAT","reason":"explanation"}
- CHAT: normal conversation
- CHAT_WEB: needs live/current data
- CODE_GEN: user wants code written
- FILE_GEN: user wants a downloadable document (PDF, PPT, Word, Excel)
- FILE_CONVERT: format conversion
- IMAGE_GEN: AI generated image
- PHOTO_SEARCH: user wants real photos
- INTERACTIVE: live interactive experience (quiz, game, tool, timer, piano)
- GAME: specific named game (snake, tetris, chess, pong, 2048, tictactoe, minesweeper, sudoku, breakout, memory)
The message may be in any Indian language — route based on intent, not language.`,
          },
          { role: "user", content: message },
        ],
        temperature: 0.1,
        max_tokens: 60,
        stream: false,
      },
      {
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json",
          "api-subscription-key": apiKey,
        },
        timeout: 8000,
      }
    );
    const raw = res.data?.choices?.[0]?.message?.content || "";
    const clean2 = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    const jsonMatch = clean2.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log("[Brain] → " + parsed.tool + " | " + parsed.reason);
      return { tool: parsed.tool || "CHAT", confidence: 0.9 };
    }
  } catch (err) {
    console.warn("[Brain] Intent resolver failed, falling back:", err.message);
  }

  return { tool: "CHAT", confidence: 0.5 };
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 12 — MAIN GENERATE RESPONSE
   ═══════════════════════════════════════════════════════════════════════════ */

exports.generateResponse = async (conversationHistory, socketIo = null, socketId = null) => {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) throw new Error("SARVAM_API_KEY not set in .env");

  const model  = process.env.SARVAM_MODEL || "sarvam-m";
  const apiUrl = SARVAM_API_URL;

  try {
    /* ── 1. Load attachments ── */
    const expandedHistory = loadAttachedContent(conversationHistory);
    const MAX_ATTACH = 60000;
    const safeHistory = expandedHistory.map(msg => {
      const c = String(msg.content);
      if (c.length > MAX_ATTACH && /ATTACHED CONTEXT|ATTACHED CONTENT|ATTACHED FILE/.test(c)) {
        return { ...msg, content: c.slice(0, MAX_ATTACH * 0.7) + "\n\n[...truncated...]\n\n" + c.slice(-MAX_ATTACH * 0.2) };
      }
      return msg;
    });

    /* ── 2. Normalise roles ── */
    const cleanedHistory = safeHistory.map(msg => ({
      role:    msg.role === "ai" ? "assistant" : msg.role,
      content: String(msg.content),
    }));

    const contextHistory = cleanedHistory.filter(msg =>
      !(msg.role === "user" && /^\[LOCATION:[^\]]*\]\s*$/.test(msg.content.trim()))
    );

    const rawLastMsg      = contextHistory.filter(m => m.role === "user").slice(-1)[0]?.content || "";
    const lastUserMessage = rawLastMsg.replace(/^\[LOCATION:[^\]]*\]\s*/, "").trim();

    /* ── 3. Detect language of user message ── */
    const userLangCode = detectIndianLanguage(lastUserMessage);
    const userLangInfo = INDIAN_LANGUAGES[userLangCode] || INDIAN_LANGUAGES["en"];
    console.log("[Lang] Detected: " + userLangInfo.name + " (" + userLangCode + ")");

    /* ── 4. Detect attachment context ── */
    const isAttachmentMessage =
      hasAttachment(lastUserMessage) ||
      (/what (can|do) (u|you) (see|read|find|tell me)/i.test(lastUserMessage) &&
        hasAttachment(contextHistory[contextHistory.length - 2]?.content || ""));

    /* ── 5. CORTEX BRAIN — Intent Router ── */
    let intent = { tool: "CHAT", confidence: 0.5 };
    if (!isAttachmentMessage) {
      intent = await resolveIntent(lastUserMessage, apiKey, model);
    }

    if (!isAttachmentMessage) {
      if (intent.tool === "GAME" || detectGameRequest(lastUserMessage)) {
        const game = detectGameRequest(lastUserMessage);
        if (game) return { reply: "[GAME:" + game + "]", visual: false };
      }

      if (intent.tool === "FILE_CONVERT" || detectFileConvertRequest(lastUserMessage)) {
        return { reply: "Converting your file now! 👇 Use the file converter below.", visual: false };
      }

      if (intent.tool === "FILE_GEN" || (!detectCodeContent(lastUserMessage) && detectFileRequest(lastUserMessage))) {
        const fml = lastUserMessage.toLowerCase();
        const ft =
          /\b(ppt|pptx|powerpoint|presentation|slides?)\b/.test(fml) ? "PowerPoint presentation" :
          /\bpdf\b/.test(fml) ? "PDF report" :
          /\b(excel|xlsx|spreadsheet)\b/.test(fml) ? "Excel spreadsheet" :
          /\b(doc|docx|word)\b/.test(fml) ? "Word document" :
          /\b(markdown|\.md)\b/.test(fml) ? "Markdown document" : "document";
        return { reply: "Generating your " + ft + " now! 👇 Use the file generator below.", visual: false };
      }

      if (intent.tool === "IMAGE_GEN" || detectImageGenRequest(lastUserMessage)) {
        return { reply: "Generating your image now! 🎨 The image generator below will create it.", visual: false };
      }

      if (intent.tool === "PHOTO_SEARCH" || detectPhotoRequest(lastUserMessage)) {
        console.log("[Router] PHOTO REQUEST → Pexels");
        const fml = lastUserMessage.toLowerCase();
        const subjectMatch =
          fml.match(/(?:photos?|pictures?|images?|pics?)\s+of\s+(.{3,60}?)(?:\s*$|\?|!)/i) ||
          fml.match(/show me\s+(?:photos?|pictures?|images?)\s+(?:of\s+)?(.{3,60}?)(?:\s*$|\?|!)/i) ||
          fml.match(/find\s+(?:photos?|pictures?|images?)\s+(?:of\s+)?(.{3,60}?)(?:\s*$|\?|!)/i);
        const subject = subjectMatch ? subjectMatch[1].trim() : lastUserMessage;
        const PEXELS_KEY = process.env.PEXELS_API_KEY;
        if (PEXELS_KEY) {
          try {
            const { fetchPexelsImages, formatPexelsBlock } = require("./pexels.service");
            const images = await fetchPexelsImages(subject, 3, "landscape");
            if (images.length > 0) {
              const pexelsBlock = formatPexelsBlock(images);
              return { reply: pexelsBlock + "Here are some photos of " + subject + " from Pexels.", visual: false };
            }
          } catch (pErr) { console.warn("[Pexels] Photo request failed:", pErr.message); }
        }
        return { reply: "Here are some great places to find photos of " + subject + ": [Pexels](https://pexels.com), [Unsplash](https://unsplash.com)", visual: false };
      }

      // INTERACTIVE — routes to DeepSeek
      if (intent.tool === "INTERACTIVE") {
        console.log("[Interactive] Routing to DeepSeek: " + lastUserMessage.slice(0, 60));
        try {
          if (socketIo && socketId) socketIo.to(socketId).emit("code_progress", { percent: 10, message: "🎮 Planning interactive experience..." });

          let spec = lastUserMessage;
          try {
            const specRes = await axios.post(SARVAM_API_URL, {
              model,
              messages: [
                { role: "system", content: "You are a frontend spec writer. Write a detailed technical specification for a self-contained HTML file. Include: exact features, UI layout, all data needed, JS logic required, visual style. Output ONLY the spec. No code. No preamble." },
                { role: "user", content: lastUserMessage },
              ],
              temperature: 0.3, max_tokens: 800, stream: false,
            }, { headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json", "api-subscription-key": apiKey }, timeout: 20000 });
            const specText = specRes.data?.choices?.[0]?.message?.content || "";
            if (specText.trim().length > 50) { spec = specText.trim(); console.log("[Interactive] Spec ready (" + spec.length + " chars)"); }
          } catch (specErr) { console.warn("[Interactive] Spec failed, using raw prompt:", specErr.message); }

          if (socketIo && socketId) socketIo.to(socketId).emit("code_progress", { percent: 30, message: "⚡ Generating HTML..." });

          const deepseekRes = await axios.post("https://api.deepseek.com/chat/completions", {
            model: "deepseek-chat",
            messages: [
              {
                role: "system",
                content: `You are an elite frontend developer. Generate a PERFECT, complete, self-contained HTML file.
OUTPUT RULES: Start with <!DOCTYPE html> IMMEDIATELY. No markdown. No code fences. Pure HTML only.
DESIGN: dark theme, glassmorphism cards, gradient buttons, smooth animations.
CSS vars: --bg:#0a0a0f; --surface:#13131a; --accent:#6c63ff; --accent2:#00d2ff; --text:#e0e0f0;
All features fully implemented. No stubs. No placeholders.`,
              },
              { role: "user", content: "Build: " + spec + "\nOriginal: " + lastUserMessage + "\nStart with <!DOCTYPE html> immediately." },
            ],
            temperature: 0.7, max_tokens: 8000, stream: false,
          }, { headers: { "Authorization": "Bearer " + process.env.DEEPSEEK_API_KEY, "Content-Type": "application/json" }, timeout: 120000 });

          if (socketIo && socketId) socketIo.to(socketId).emit("code_progress", { percent: 80, message: "✨ Polishing..." });

          let html = deepseekRes.data?.choices?.[0]?.message?.content || "";
          html = html.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
          html = html.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();
          const startIdx = html.search(/<!DOCTYPE\s+html/i);
          if (startIdx > 0) html = html.slice(startIdx);

          if (socketIo && socketId) {
            socketIo.to(socketId).emit("code_progress", { percent: 100, message: "✅ Ready!" });
            setTimeout(() => socketIo.to(socketId).emit("code_progress", { percent: 0, message: "", visible: false }), 1500);
          }

          if (html.includes("<!DOCTYPE") || html.includes("<html")) {
            return { reply: "[INTERACTIVE_HTML]" + html + "[/INTERACTIVE_HTML]", visual: false };
          }
        } catch (err) { console.error("[Interactive] DeepSeek failed:", err.message); }
      }
    }

    /* ── 6. CLASSIFY PROMPT + MEMORY ENGINE ── */
    const webDecision = isAttachmentMessage
      ? { needsWeb: false, category: "CONCEPT", confidence: 1.0, reason: "attachment", query: "" }
      : intent.tool === "CHAT_WEB"
        ? { ...makeWebDecision(lastUserMessage, contextHistory), needsWeb: true }
        : makeWebDecision(lastUserMessage, contextHistory);

    /* ── 6.5 CODE → DeepSeek ── */
    const isCodeGenRequest = intent.tool === "CODE_GEN" ||
      (/\b(build|create|write|generate|make|code|implement|develop|program|script|function|component|class|api|app|application|bot|tool|system|backend|frontend)\b/i.test(lastUserMessage) &&
      /\b(a|an|the|me|my|complete|full|entire|working|functional)\b/i.test(lastUserMessage));

    if (!isAttachmentMessage && (webDecision.category === "CODE" || intent.tool === "CODE_GEN") && isCodeGenRequest) {
      const detected  = detectLargeCodeRequest(lastUserMessage);
      const reqLines  = detected?.requestedLines || 150;
      const language  = detectLanguage(lastUserMessage);

      let enhancedPrompt = lastUserMessage;
      try {
        const specRes = await axios.post(SARVAM_API_URL, {
          model,
          messages: [
            { role: "system", content: "You are a coding assistant. Rewrite the user's request as a clear, detailed coding instruction. Keep their intent, add helpful context about functions/structure/features. Output ONLY the rewritten instruction. No code. No explanation." },
            { role: "user", content: lastUserMessage },
          ],
          temperature: 0.3, max_tokens: 400, stream: false,
        }, { headers: { "Authorization": "Bearer " + process.env.SARVAM_API_KEY, "Content-Type": "application/json", "api-subscription-key": process.env.SARVAM_API_KEY }, timeout: 25000 });
        const enriched = specRes.data?.choices?.[0]?.message?.content || "";
        if (enriched.trim().length > 20) { enhancedPrompt = enriched.trim(); console.log("[DeepSeekGen] Enriched (" + enriched.length + " chars)"); }
      } catch (specErr) { console.warn("[DeepSeekGen] Enrichment failed:", specErr.message); }

      console.log("[DeepSeekGen] CODE → DeepSeek (~" + reqLines + " lines)");
      try {
        const result = await generateLargeCode(enhancedPrompt, socketIo, socketId, { language, requestedLines: reqLines });
        return {
          reply: "Generated " + result.lines + " lines of " + result.language + " code (" + result.kb + " KB).[FOLLOWUPS]" + JSON.stringify(["How do I run this " + result.language + " code?", "Can you add error handling?", "Can you write tests for this?"]) + "[/FOLLOWUPS]",
          visual: false,
          codeArtifact: { code: result.code, language: result.language, filename: result.filename, lines: result.lines, kb: result.kb },
        };
      } catch (err) { console.error("[DeepSeekGen] Failed, falling through to Sarvam:", err.message); }
    }

    /* ── 7. Mode flags ── */
    const paragraphMode = detectParagraphRequest(lastUserMessage);
    const noVisualMode  = detectNoVisualRequest(lastUserMessage);

    /* ── 8. Visual planning ── */
    let detectedVisuals = [];
    if (!noVisualMode && !paragraphMode && !isAttachmentMessage) {
      detectedVisuals = detectRequestedVisuals(lastUserMessage, webDecision);
      detectedVisuals = planVisualLayout(lastUserMessage, detectedVisuals, webDecision);
    }
    const noVisualInstruction = noVisualMode ? "\nSTRICT: No visuals. No [VISUAL:] tags at all." : "";

    /* ── 9. Web search ── */
    let webContext = "";
    let searchSources = [];
    const SEARCH_KEY = process.env.TAVILY_API_KEY || process.env.SERPER_API_KEY || process.env.SEARCH_API_KEY;

    if (!isAttachmentMessage && SEARCH_KEY && webDecision.needsWeb) {
      console.log("[Search] Firing for category=" + webDecision.category + " | query: " + webDecision.query.slice(0, 70));
      try {
        const searchData = await searchWeb(webDecision.query);
        if (searchData.success && searchData.results.length > 0) {
          const formatted = formatSearchResultsForAI(searchData);
          webContext = "\n\nLIVE WEB DATA (real-time — use as primary source for all current facts):\n" + formatted + "\n";
          searchSources = searchData.results.filter(r => r.url && r.type !== "answer_box").slice(0, 6).map(r => ({ title: r.title, url: r.url, snippet: r.snippet?.slice(0, 120), source: r.source, date: r.date }));
          console.log("[Search] ✅ " + searchData.results.length + " results injected");
        }
      } catch (err) { console.warn("[Search] Failed:", err.message); }
    } else if (!isAttachmentMessage && !SEARCH_KEY) {
      console.warn("[Search] No API key set. Add TAVILY_API_KEY or SERPER_API_KEY to .env");
    }

    /* ── 10. Update memory ── */
    if (!isAttachmentMessage) updateMemory(lastUserMessage, { category: webDecision.category, needsWeb: webDecision.needsWeb }, !!webContext);

    /* ── 10.5. Pexels contextual images ── */
    let pexelsPrefix = "";
    if (!isAttachmentMessage && !detectGameRequest(lastUserMessage)) {
      try {
        pexelsPrefix = await getContextualImages(lastUserMessage, webDecision, webContext);
        if (pexelsPrefix) console.log("[Pexels] Images injected ✅");
      } catch (pexErr) { console.warn("[Pexels] Failed silently:", pexErr.message); }
    }

    /* ── 11. Context + memory ── */
    const analysis     = analyzeConversation(contextHistory);
    const userLocation = extractUserLocation(cleanedHistory);
    const contextBlock = buildContextBlock(analysis, detectedVisuals, webDecision, noVisualInstruction + webContext, userLocation);

    const smartMemory     = !isAttachmentMessage ? memoryEngine.loadSmartMemory(lastUserMessage) : { systemBlock: "", hint: "", shouldGreetByName: false };
    const longTermMemory  = smartMemory.systemBlock;
    const memoryDecision  = memoryEngine.shouldSurfaceMemory(lastUserMessage);
    const memoryCtx       = memoryDecision !== "none" ? (getRelevantMemory(lastUserMessage) || []) : [];
    const memoryBlock     = memoryCtx.length > 0 ? "\nRelevant memory:\n" + memoryCtx.join("\n") + "\n" : "";
    const pastConversations = (!isAttachmentMessage && memoryDecision !== "none") ? memoryEngine.loadRelevantConversations(lastUserMessage, 2) : "";
    console.log("[Memory]", memoryDecision === "none" ? "Skipped —" : "Injected |", "decision:", memoryDecision);

    /* ── 12. Token budget ── */
    const isCodeRequest = CODE_TYPES_RE.test(lastUserMessage);
    const locMatch      = /\b(\d{3,})\s*(loc|lines?|line of code)\b/i.exec(lastUserMessage);
    const requestedLOC  = locMatch ? parseInt(locMatch[1]) : 0;
    const isPdfReq      = analysis.isPdfRequest;
    const isComplex     = detectedVisuals.length > 1 || lastUserMessage.length > 200;

    const completionTokens =
      requestedLOC >= 500 ? 3500 :
      requestedLOC >= 200 ? 3000 :
      requestedLOC > 0 ? Math.min(Math.max(requestedLOC * 10, 2000), 3500) :
      isPdfReq ? 3500 :
      isCodeRequest ? 3500 :
      isComplex ? 2500 :
      isAttachmentMessage ? 3000 : 2000;

    const historyCharBudget = Math.max(Math.min((MODEL_MAX_TOKENS - SYSTEM_PROMPT_TOKS - completionTokens - 200) * 4, 8000), 800);

    /* ── 13. Trim history ── */
    const trimmedHistory    = trimHistory(enforceAlternation(contextHistory), historyCharBudget);
    const totalHistoryChars = trimmedHistory.reduce((s, m) => s + m.content.length, 0);
    const finalHistory = totalHistoryChars > 6000 ? trimmedHistory.slice(-Math.min(4, trimmedHistory.length)) : trimmedHistory;
    while (finalHistory.length > 1 && finalHistory[0].role !== "user") finalHistory.shift();

    console.log("[Sarvam] model=" + model + " tokens=" + completionTokens + " msgs=" + finalHistory.length + " category=" + webDecision.category + " lang=" + userLangCode + " web=" + !!webContext + " visuals=[" + detectedVisuals.join(",") + "]");

    /* ── 14. API call ── */
    const systemContent = SYSTEM_PROMPT +
      "\n\nToday: " + new Date().toDateString() + "\n" +
      longTermMemory + pastConversations + memoryBlock + contextBlock;

    const response = await axios.post(
      apiUrl,
      {
        model,
        messages: [{ role: "system", content: systemContent }, ...finalHistory],
        temperature: isCodeRequest ? 0.25 : isPdfReq ? 0.45 : (webDecision.category === "CASUAL" ? 0.85 : 0.70),
        top_p:       0.92,
        max_tokens:  completionTokens,
        stream:      false,
      },
      {
        headers: {
          "Authorization":        "Bearer " + apiKey,
          "Content-Type":         "application/json",
          "api-subscription-key": apiKey,
        },
        timeout: 120000,
      }
    );

    /* ── 15. Extract reply ── */
    let reply =
      response.data?.choices?.[0]?.message?.content ||
      response.data?.message?.content ||
      response.data?.reply || response.data?.text || response.data?.output || "";

    if (!reply?.trim()) throw new Error("Sarvam returned empty response");

    /* ── 16. Extract READ_ALOUD block before post-processing ── */
    const { mainReply, readAloudText } = extractReadAloudBlock(reply, userLangCode);
    const ttsLocale = getTTSLocale(userLangCode);
    reply = mainReply; // Use main reply for further processing

    /* ── 17. Post-process + visuals ── */
    reply = postProcessReply(reply);
    reply = enforceStructure(reply, paragraphMode);
    reply = processVisualsInReply(reply);

    /* ── 18. Auto-continue cut-off ── */
    const isCutOff = (() => {
      if (reply.length < 150 || reply.includes("[GAME:")) return false;
      const t = reply.trim();
      if ((t.match(/```/g) || []).length % 2 !== 0) return true;
      if (requestedLOC > 0 && t.split("\n").length < requestedLOC * 0.85) return true;
      const last = t[t.length - 1];
      return ![".", "!", "?", "}", "]", "`", "-", "n"].includes(last) && t.length > 700;
    })();

    let contAttempts = 0;
    const maxConts   = requestedLOC >= 500 ? 3 : 1;

    while (
      (contAttempts === 0 ? isCutOff : (() => {
        const t = reply.trim();
        if ((t.match(/```/g) || []).length % 2 !== 0) return true;
        if (requestedLOC > 0 && t.split("\n").length < requestedLOC * 0.85) return true;
        return false;
      })()) && contAttempts < maxConts
    ) {
      contAttempts++;
      console.log("[Sarvam] Continuing cut-off (" + contAttempts + "/" + maxConts + ")...");
      try {
        const contRes = await axios.post(
          apiUrl,
          {
            model,
            messages: [
              { role: "system", content: systemContent + "\n\nCRITICAL: Continue from exactly where you stopped. No intro. No repetition." },
              ...finalHistory,
              { role: "assistant", content: stripSVGBlobs(reply) },
              { role: "user", content: "Continue exactly from where you stopped. Don't repeat anything." + (requestedLOC > 0 ? " Target: " + requestedLOC + "+ lines." : "") },
            ],
            temperature: 0.15,
            max_tokens:  Math.min(3500, completionTokens),
            stream:      false,
          },
          { headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json", "api-subscription-key": apiKey }, timeout: 120000 }
        );
        const cont = contRes.data?.choices?.[0]?.message?.content || contRes.data?.reply || contRes.data?.text || "";
        if (cont.trim().length > 15) {
          const cleanCont = postProcessReply(cont);
          if (cleanCont.trim().startsWith("```")) {
            const innerCode = cleanCont.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "");
            reply = reply.trimEnd().replace(/\n?```\s*$/, "") + "\n" + innerCode + "\n```";
          } else {
            reply = reply.trimEnd() + "\n" + cleanCont;
          }
          console.log("[Sarvam] Continuation applied — " + reply.split("\n").length + " lines");
        } else break;
      } catch (e) { console.warn("[Sarvam] Continuation failed:", e.message); break; }
    }

    /* ── 19. Store memory ── */
    if (lastUserMessage?.length > 6 && !isAttachmentMessage) {
      try { storeMemory(lastUserMessage); } catch {}
      try { memoryEngine.processAndStore(lastUserMessage, reply); } catch (memErr) { console.warn("[Memory] processAndStore failed:", memErr.message); }
    }

    /* ── 20. Pad empty replies ── */
    if (reply.length < 40 && !/\[VISUAL:|GAME:/.test(reply)) reply += "\n\nLet me know if you'd like more detail.";

    // Prepend Pexels images
    if (pexelsPrefix) reply = pexelsPrefix + reply;

    // Append sources
    if (searchSources.length > 0) reply = reply + "\n\n[SOURCES]" + JSON.stringify(searchSources) + "[/SOURCES]";

    /* ── 21. Extract follow-up chips ── */
    let followUps = [];
    const skipFollowUps = isAttachmentMessage || detectGameRequest(lastUserMessage) ||
      detectFileRequest(lastUserMessage) || detectImageGenRequest(lastUserMessage) ||
      ["CASUAL", "PERSONAL"].includes(webDecision.category);

    if (!skipFollowUps) {
      followUps = extractFollowUpsFromReply(reply);
      reply = reply.replace(/FOLLOW[_\s-]?UP[S]?\s*:[\s\S]*?(?=\n\n|$)/gi, "").trim();
      if (followUps.length > 0) {
        reply = reply + "\n\n[FOLLOWUPS]" + JSON.stringify(followUps) + "[/FOLLOWUPS]";
        console.log("[FollowUp] " + followUps.length + " chips extracted");
      }
    }

    /* ── 22. Append READ_ALOUD block to final reply (for frontend TTS) ── */
    if (readAloudText) {
      reply = reply + "\n\n[READ_ALOUD_TEXT]" + readAloudText + "[/READ_ALOUD_TEXT]";
      reply = reply + "\n[TTS_LOCALE]" + ttsLocale + "[/TTS_LOCALE]";
      reply = reply + "\n[LANG_CODE]" + userLangCode + "[/LANG_CODE]";
    }

    // ── Nuclear strip of all meta-blocks ──
    reply = reply
      .replace(/READ_ALOUD:[\s\S]*?END_READ_ALOUD/gi, '')
      .replace(/READ_ALOUD:[\s\S]*/i, '')
      .replace(/FOLLOW[_\s-]?UPS?\s*:[\s\S]*/i, '')
      .replace(/\[READ_ALOUD_TEXT\][\s\S]*?\[\/READ_ALOUD_TEXT\]/gi, '')
      .replace(/\[TTS_LOCALE\][\s\S]*?\[\/TTS_LOCALE\]/gi, '')
      .replace(/\[LANG_CODE\][\s\S]*?\[\/LANG_CODE\]/gi, '')
      .replace(/\[SOURCES\][\s\S]*?\[\/SOURCES\]/gi, '')
      .replace(/\[FOLLOWUPS\][\s\S]*?\[\/FOLLOWUPS\]/gi, '')
      .trim();

    return {
      reply,
      visual:     /\[VISUAL:\w+\]/.test(reply),
      langCode:   userLangCode,
      langName:   userLangInfo.name,
      ttsLocale,
      readAloud:  readAloudText,
      ssml:       readAloudText ? toSSML(readAloudText, userLangCode) : null,
    };

  } catch (error) {
    const status = error.response?.status;
    const apiErr = error.response?.data?.error?.message || error.response?.data?.message || error.message;
    console.error("[Sarvam] Error (" + (status || "network") + "):", apiErr);

    if (status === 401 || /api key|unauthorized|invalid key/i.test(apiErr))
      throw new Error("Invalid Sarvam API key — check SARVAM_API_KEY in .env");
    if (status === 429 || /rate limit|quota/i.test(apiErr))
      throw new Error("Rate limit hit — wait a moment and retry");
    if (status === 400 || /context length|tokens|maximum/i.test(apiErr))
      throw new Error("Message too long — please start a new conversation");
    if (/timeout|ECONNREFUSED|ENOTFOUND/i.test(error.message))
      throw new Error("Connection failed — check your internet");
    throw new Error("AI generation failed — please try again");
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS — utilities for other services to use
   ═══════════════════════════════════════════════════════════════════════════ */
exports.detectIndianLanguage  = detectIndianLanguage;
exports.getTTSLocale          = getTTSLocale;
exports.extractReadAloudBlock = extractReadAloudBlock;
exports.toSSML                = toSSML;
exports.INDIAN_LANGUAGES      = INDIAN_LANGUAGES;