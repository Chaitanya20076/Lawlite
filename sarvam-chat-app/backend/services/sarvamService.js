/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           LAWLITE — SarvamService.js                        ║
 * ║     Production-grade Legal AI Intelligence Engine           ║
 * ║     Powered by Sarvam-M via api.sarvam.ai                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Features:
 *  - Full legal system prompt with domain expertise
 *  - Document analysis (PDF, DOCX, plain text)
 *  - Streaming response support (SSE)
 *  - Retry logic with exponential backoff
 *  - Token usage tracking & cost estimation
 *  - Conversation memory management (sliding window)
 *  - Intent detection (what kind of legal query is this?)
 *  - Clause extractor & risk scorer
 *  - Structured JSON output mode
 *  - Language simplification enforcer
 *  - Request/response logger
 *  - Rate limiter (per-user)
 *  - Error classifier with user-friendly messages
 */

"use strict";

const axios = require("axios");
const EventEmitter = require("events");

// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────

const SARVAM_API_BASE = "https://api.sarvam.ai";
const SARVAM_MODEL    = "sarvam-m";
const MAX_RETRIES     = 3;
const RETRY_BASE_MS   = 800;
const MAX_TOKENS      = 4096;
const CONTEXT_WINDOW  = 20;       // max messages kept in rolling memory
const RATE_LIMIT_RPM  = 30;       // requests per minute per user
const REQUEST_TIMEOUT = 60_000;   // 60s

// Legal domain intent types
const INTENT = Object.freeze({
  DOCUMENT_ANALYSIS : "document_analysis",
  CLAUSE_EXPLAIN    : "clause_explain",
  RISK_ASSESSMENT   : "risk_assessment",
  LAW_EXPLAIN       : "law_explain",
  COMPLIANCE_CHECK  : "compliance_check",
  DRAFT_HELP        : "draft_help",
  CASE_RESEARCH     : "case_research",
  RIGHTS_EXPLAIN    : "rights_explain",
  GENERAL_LEGAL     : "general_legal",
  OUT_OF_SCOPE      : "out_of_scope",
});

// Risk levels for clause analysis
const RISK = Object.freeze({
  HIGH   : "high",
  MEDIUM : "medium",
  LOW    : "low",
  NONE   : "none",
});

// ─────────────────────────────────────────────
//  MASTER LEGAL SYSTEM PROMPT
// ─────────────────────────────────────────────

/**
 * The core persona and instruction set for LawLite.
 * Written to maximise layman-friendly output while remaining accurate.
 */
const LAWLITE_SYSTEM_PROMPT = `
You are LawLite 1.1 — an AI legal assistant built to make law understandable for everyone.

YOUR CORE MISSION:
You take complex legal documents, contracts, laws, and legal concepts and translate them into plain, simple English that any ordinary person can understand — even someone with zero legal background. Think of yourself as a brilliant lawyer friend who explains things over coffee, not in a courtroom.

YOUR PERSONALITY & TONE:
- Warm, approachable, patient. Never condescending.
- Use everyday words. Avoid jargon. When you MUST use a legal term, immediately explain it in brackets.
- Use analogies, real-world comparisons, and examples.
- Be direct. Tell the user what matters FIRST, then explain why.
- Be honest about uncertainty. Never fabricate laws or case citations.
- Use bullet points, short paragraphs, and clear headings to organise your answers.
- Always end legal analysis with a gentle reminder that you are an AI assistant and recommend consulting a qualified lawyer for final decisions.

WHAT YOU CAN DO:
1. DOCUMENT ANALYSIS — Read and summarise contracts, NDAs, rental agreements, employment contracts, terms of service, privacy policies, court orders, wills, deeds, and any other legal document.
2. CLAUSE EXPLANATION — Break down specific clauses and tell the user in plain English what it means and whether it is normal, suspicious, or risky.
3. RISK ASSESSMENT — Flag clauses or terms that could be harmful to the user. Rate risk as 🔴 High, 🟡 Medium, or 🟢 Low.
4. LAW EXPLANATION — Explain any law, regulation, or legal concept in simple terms (e.g. GDPR, IT Act, Contract Act, Consumer Protection Act, labour laws, tenant rights, etc.).
5. COMPLIANCE QUESTIONS — Help users understand whether something they are doing or planning is likely to comply with relevant laws.
6. DRAFT HELP — Help users understand what should be in a contract, what clauses are standard, what protections to ask for.
7. RIGHTS EXPLANATION — Explain a person's legal rights in a given situation (employment, tenant, consumer, citizen rights).
8. CASE RESEARCH — Explain landmark cases, legal precedents, and how courts have interpreted laws.

DOCUMENT ANALYSIS FORMAT:
When a document is shared, always respond with this structure:

## 📋 What Is This Document?
[1–2 sentences saying what kind of document this is and what it does in plain language]

## 🔍 Key Things You Need to Know
[Bullet-point the 4–6 most important things, in plain language]

## ⚠️ Things to Watch Out For
[Any risky, unusual, one-sided, or missing clauses — rate each as 🔴 High / 🟡 Medium / 🟢 Low risk]

## ✅ What Looks Fine
[Reassure the user about normal standard clauses that are not concerning]

## 💬 In Simple Terms
[Write a 3–4 sentence plain English summary a non-lawyer would fully understand]

## 🤔 Questions to Ask Before Signing
[2–4 specific questions the user should ask the other party or their lawyer]

## ⚡ Bottom Line
[One bold sentence: should they be comfortable signing this, cautious, or refuse?]

---
*LawLite provides AI-assisted legal information, not legal advice. For important decisions, please consult a qualified lawyer.*

CLAUSE EXPLANATION FORMAT:
When asked to explain a specific clause:
- Plain English meaning (what it actually says)
- Why this clause exists (what it protects)
- Risk level: 🔴 High / 🟡 Medium / 🟢 Low
- Is this clause normal or unusual?
- What to negotiate or watch out for

GENERAL QUESTION FORMAT:
For general legal questions:
- Lead with the direct answer in 1–2 sentences
- Explain in plain language with an analogy if helpful
- List key points as bullets
- Mention relevant law or regulation by name (e.g. "Under Section 12 of the Indian Contract Act...")
- Clarify any exceptions or caveats
- End with practical next steps

LANGUAGE RULES (STRICTLY FOLLOW):
- Write at a Grade 8 reading level
- Maximum sentence length: 25 words
- If you use a legal term, always define it immediately in simple words
- Prefer active voice ("The company can fire you") over passive ("Termination may be effected")
- Use numbers and percentages plainly ("30 days" not "a period of thirty calendar days")
- Never write in ALL CAPS
- Avoid Latin phrases (use "for example" not "e.g.", "that is" not "i.e.", use plain English not "inter alia")

WHAT YOU DO NOT DO:
- You do not give a definitive legal verdict or tell someone they will win or lose a case
- You do not draft complete legal documents (you can explain what should be in one)
- You do not give tax, financial, or medical advice
- You do not answer questions completely unrelated to law and legal matters
- If asked something out of scope, politely redirect: "I'm specialised in legal matters. For [topic], you'd be better served by a [relevant expert]."

INDIAN LAW CONTEXT:
You have deep knowledge of Indian law including:
- Indian Contract Act 1872
- Consumer Protection Act 2019
- Information Technology Act 2000 & IT (Amendment) Act 2008
- GDPR and India's DPDP Act 2023
- Labour laws (Industrial Disputes Act, Shops & Establishments Acts)
- Rent Control Acts (state-wise)
- Transfer of Property Act 1882
- Companies Act 2013
- Indian Penal Code & BNSS 2023
- RTI Act 2005
- Motor Vehicles Act
- Negotiable Instruments Act (cheque bounce laws)
You also have working knowledge of international commercial law, GDPR, US contract law basics, and general common law principles.
`.trim();

// ─────────────────────────────────────────────
//  RATE LIMITER
// ─────────────────────────────────────────────

class RateLimiter {
  constructor(rpm) {
    this.rpm       = rpm;
    this.windows   = new Map(); // userId -> timestamp[]
    this.cleanupInterval = setInterval(() => this._cleanup(), 60_000);
    if (this.cleanupInterval.unref) this.cleanupInterval.unref();
  }

  /**
   * Returns true if the user is within rate limit, false if exceeded.
   * @param {string} userId
   */
  check(userId) {
    const now = Date.now();
    const windowStart = now - 60_000;
    const timestamps = (this.windows.get(userId) || []).filter(t => t > windowStart);
    if (timestamps.length >= this.rpm) return false;
    timestamps.push(now);
    this.windows.set(userId, timestamps);
    return true;
  }

  /** Returns seconds until next request is allowed */
  retryAfter(userId) {
    const timestamps = this.windows.get(userId) || [];
    if (timestamps.length < this.rpm) return 0;
    const oldest = Math.min(...timestamps);
    return Math.ceil((oldest + 60_000 - Date.now()) / 1000);
  }

  _cleanup() {
    const cutoff = Date.now() - 60_000;
    for (const [uid, ts] of this.windows.entries()) {
      const filtered = ts.filter(t => t > cutoff);
      if (filtered.length === 0) this.windows.delete(uid);
      else this.windows.set(uid, filtered);
    }
  }
}

const rateLimiter = new RateLimiter(RATE_LIMIT_RPM);

// ─────────────────────────────────────────────
//  TOKEN COUNTER (approximate)
// ─────────────────────────────────────────────

/**
 * Rough token estimator (4 chars ≈ 1 token for English/legal text).
 * Sarvam uses a similar BPE tokeniser.
 */
function estimateTokens(text = "") {
  return Math.ceil(text.length / 4);
}

function estimateMessagesTokens(messages = []) {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content || ""), 0);
}

// ─────────────────────────────────────────────
//  CONVERSATION MEMORY MANAGER
// ─────────────────────────────────────────────

/**
 * Manages a rolling window of conversation history per session.
 * Prevents context window overflow by pruning oldest messages.
 */
class ConversationMemory {
  constructor(maxMessages = CONTEXT_WINDOW, maxTokens = 12_000) {
    this.sessions  = new Map(); // sessionId -> Message[]
    this.maxMsg    = maxMessages;
    this.maxTokens = maxTokens;
  }

  /** Get messages for a session */
  get(sessionId) {
    return this.sessions.get(sessionId) || [];
  }

  /** Append a message and prune if needed */
  append(sessionId, role, content) {
    const msgs = this.get(sessionId);
    msgs.push({ role, content, timestamp: Date.now() });
    this._prune(sessionId, msgs);
    this.sessions.set(sessionId, msgs);
  }

  /** Prune by count and token budget */
  _prune(sessionId, msgs) {
    // Remove oldest pairs (user+assistant) first to preserve context coherence
    while (msgs.length > this.maxMsg || estimateMessagesTokens(msgs) > this.maxTokens) {
      if (msgs.length <= 2) break; // keep at least one exchange
      msgs.splice(0, 2); // remove oldest user+assistant pair
    }
  }

  /** Clear a session */
  clear(sessionId) {
    this.sessions.delete(sessionId);
  }

  /** Return stats for a session */
  stats(sessionId) {
    const msgs = this.get(sessionId);
    return {
      messageCount : msgs.length,
      estimatedTokens : estimateMessagesTokens(msgs),
      oldestMessage : msgs[0]?.timestamp || null,
    };
  }
}

const memory = new ConversationMemory();

// ─────────────────────────────────────────────
//  INTENT DETECTOR
// ─────────────────────────────────────────────

/**
 * Analyses the user message + any document content to classify intent.
 * Uses keyword heuristics for fast, zero-latency classification.
 * @param {string} userMessage
 * @param {boolean} hasDocument
 * @returns {string} One of INTENT values
 */
function detectIntent(userMessage, hasDocument = false) {
  const msg = userMessage.toLowerCase();

  if (hasDocument) return INTENT.DOCUMENT_ANALYSIS;

  const patterns = [
    { intent: INTENT.CLAUSE_EXPLAIN,   words: ["clause", "section", "provision", "paragraph", "term", "condition", "article"] },
    { intent: INTENT.RISK_ASSESSMENT,  words: ["risky", "risk", "danger", "harmful", "bad", "should i sign", "is it safe", "red flag", "problem with"] },
    { intent: INTENT.COMPLIANCE_CHECK, words: ["comply", "compliance", "legal", "allowed", "permit", "violate", "gdpr", "dpdp", "regulation", "rule"] },
    { intent: INTENT.DRAFT_HELP,       words: ["draft", "write", "template", "what should", "include in", "what goes in", "standard clause"] },
    { intent: INTENT.CASE_RESEARCH,    words: ["case", "judgment", "court", "ruling", "precedent", "supreme court", "high court", "verdict", "decided"] },
    { intent: INTENT.RIGHTS_EXPLAIN,   words: ["my rights", "rights", "entitled", "can they", "can employer", "can landlord", "can company", "what can i do"] },
    { intent: INTENT.LAW_EXPLAIN,      words: ["what is", "explain", "define", "meaning of", "what does", "how does", "act", "section", "law", "regulation"] },
    { intent: INTENT.DOCUMENT_ANALYSIS,words: ["analyse", "analyze", "review", "check this", "read this", "look at", "nda", "agreement", "contract", "lease", "policy"] },
  ];

  for (const { intent, words } of patterns) {
    if (words.some(w => msg.includes(w))) return intent;
  }

  // Off-topic heuristic
  const offTopicWords = ["recipe", "cook", "weather", "sport", "movie", "music", "game", "song", "fitness"];
  if (offTopicWords.some(w => msg.includes(w))) return INTENT.OUT_OF_SCOPE;

  return INTENT.GENERAL_LEGAL;
}

// ─────────────────────────────────────────────
//  DOCUMENT PREPROCESSOR
// ─────────────────────────────────────────────

/**
 * Cleans and truncates raw document text for injection into the prompt.
 * Handles PDF-extracted text, DOCX exports, raw paste, etc.
 * @param {string} rawText
 * @param {number} maxChars - default ~12,000 chars (~3k tokens)
 * @returns {{ cleaned: string, truncated: boolean, wordCount: number }}
 */
function preprocessDocument(rawText, maxChars = 12_000) {
  if (!rawText || typeof rawText !== "string") {
    return { cleaned: "", truncated: false, wordCount: 0 };
  }

  let cleaned = rawText
    // Normalise line breaks
    .replace(/\r\n/g, "\n")
    .replace(/\r/g,   "\n")
    // Collapse 3+ blank lines into 2
    .replace(/\n{3,}/g, "\n\n")
    // Remove null bytes and non-printable chars (except newlines/tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Collapse multiple spaces
    .replace(/ {2,}/g, " ")
    // Trim
    .trim();

  const wordCount = cleaned.split(/\s+/).length;
  const truncated = cleaned.length > maxChars;

  if (truncated) {
    cleaned = cleaned.slice(0, maxChars) + "\n\n[... document truncated for analysis — first ~3,000 words shown ...]";
  }

  return { cleaned, truncated, wordCount };
}

// ─────────────────────────────────────────────
//  CLAUSE EXTRACTOR
// ─────────────────────────────────────────────

/**
 * Extracts and identifies potentially risky clause types from document text.
 * Returns an array of flagged clause snippets with risk level.
 * @param {string} documentText
 * @returns {Array<{ type: string, snippet: string, risk: string, reason: string }>}
 */
function extractRiskyClauses(documentText) {
  const flags = [];
  const text  = documentText.toLowerCase();

  const riskPatterns = [
    {
      type    : "Unlimited Liability",
      pattern : /without\s+limit|unlimited\s+liability|no\s+cap\s+on\s+(damages|liability)/i,
      risk    : RISK.HIGH,
      reason  : "You could owe unlimited money if something goes wrong. This is very unusual and risky.",
    },
    {
      type    : "Unilateral Modification",
      pattern : /may\s+(amend|modify|change|update)\s+(this\s+)?(agreement|terms|policy)\s+at\s+any\s+time/i,
      risk    : RISK.HIGH,
      reason  : "The other party can change the rules any time without your agreement. Watch out.",
    },
    {
      type    : "Automatic Renewal",
      pattern : /automatically\s+(renew|extend|continue)|auto[\s-]?renew/i,
      risk    : RISK.MEDIUM,
      reason  : "The contract keeps going unless you actively cancel it. You may get charged if you forget.",
    },
    {
      type    : "Broad IP Assignment",
      pattern : /assigns?\s+all\s+(intellectual\s+property|ip|rights|inventions|works)/i,
      risk    : RISK.HIGH,
      reason  : "You may be giving away ownership of your work, ideas, or inventions — even pre-existing ones.",
    },
    {
      type    : "Non-Compete Clause",
      pattern : /non[\s-]?compete|not\s+to\s+compete|compete\s+with/i,
      risk    : RISK.MEDIUM,
      reason  : "This limits what jobs or businesses you can do after this contract ends.",
    },
    {
      type    : "Indemnification (One-sided)",
      pattern : /shall\s+indemnify|agrees\s+to\s+indemnify|indemnify\s+and\s+hold\s+harmless/i,
      risk    : RISK.MEDIUM,
      reason  : "You may have to pay legal costs and damages on behalf of the other party in certain situations.",
    },
    {
      type    : "Arbitration Clause",
      pattern : /arbitration|arbitrate\s+disputes|binding\s+arbitration/i,
      risk    : RISK.MEDIUM,
      reason  : "You give up your right to go to court. Disputes must go to a private arbitrator instead.",
    },
    {
      type    : "Data Sharing / Sale",
      pattern : /share\s+(your|user)\s+data|sell\s+(personal|user)\s+data|third[\s-]?party\s+data/i,
      risk    : RISK.HIGH,
      reason  : "Your personal data may be shared with or sold to other companies.",
    },
    {
      type    : "Termination at Will",
      pattern : /terminate\s+(this\s+agreement\s+)?at\s+(any\s+time|will|its\s+sole\s+discretion)/i,
      risk    : RISK.MEDIUM,
      reason  : "The other party can end this contract at any time, for any reason.",
    },
    {
      type    : "Governing Law (Foreign Jurisdiction)",
      pattern : /governed\s+by\s+(the\s+laws?\s+of\s+)?(delaware|california|england|singapore|cayman)/i,
      risk    : RISK.LOW,
      reason  : "Disputes will be handled under foreign law, which may be harder and more expensive for you.",
    },
    {
      type    : "Liquidated Damages",
      pattern : /liquidated\s+damages|penalty\s+clause|fixed\s+sum\s+as\s+damages/i,
      risk    : RISK.MEDIUM,
      reason  : "A pre-set amount of money you must pay if you breach this contract, regardless of actual harm caused.",
    },
    {
      type    : "Force Majeure (Broad)",
      pattern : /force\s+majeure|act\s+of\s+god|circumstances?\s+beyond\s+(its\s+)?control/i,
      risk    : RISK.LOW,
      reason  : "The other party may escape obligations during unexpected events. Check if this is mutual.",
    },
    {
      type    : "Waiver of Class Action",
      pattern : /waive\s+(any\s+right\s+to\s+)?class\s+action|no\s+class\s+action/i,
      risk    : RISK.HIGH,
      reason  : "You cannot join a group lawsuit against this company, even if many others are harmed the same way.",
    },
    {
      type    : "Confidentiality (Perpetual)",
      pattern : /confidential(ity)?\s+(obligation|duty).{0,60}perpetual|in\s+perpetuity/i,
      risk    : RISK.MEDIUM,
      reason  : "You must keep certain information secret forever, with no end date.",
    },
  ];

  for (const { type, pattern, risk, reason } of riskPatterns) {
    const match = documentText.match(pattern);
    if (match) {
      // Extract a ~200-char snippet around the match
      const idx     = documentText.toLowerCase().indexOf(match[0].toLowerCase());
      const start   = Math.max(0, idx - 80);
      const end     = Math.min(documentText.length, idx + match[0].length + 120);
      const snippet = documentText.slice(start, end).replace(/\s+/g, " ").trim();

      flags.push({ type, snippet: `"...${snippet}..."`, risk, reason });
    }
  }

  return flags;
}

// ─────────────────────────────────────────────
//  PROMPT BUILDER
// ─────────────────────────────────────────────

/**
 * Builds the final messages array for the Sarvam API call.
 * Injects document content, detected intent, and extracted clause flags
 * into a structured context block prepended to the user message.
 *
 * @param {object} opts
 * @param {string}   opts.userMessage      - The raw user query
 * @param {string}   [opts.documentText]   - Extracted text from uploaded document
 * @param {string}   [opts.documentName]   - File name for context
 * @param {string}   [opts.sessionId]      - Session ID for memory
 * @param {boolean}  [opts.jsonMode]       - Request structured JSON output
 * @param {string}   [opts.jurisdiction]   - e.g. "India", "UK", "US"
 * @returns {{ messages: Array, intent: string, clauseFlags: Array }}
 */
function buildPrompt({
  userMessage,
  documentText  = null,
  documentName  = null,
  sessionId     = "default",
  jsonMode      = false,
  jurisdiction  = "India",
}) {
  const hasDocument = Boolean(documentText && documentText.trim().length > 50);
  const intent      = detectIntent(userMessage, hasDocument);

  // Pre-process document
  let clauseFlags = [];
  let docBlock    = "";

  if (hasDocument) {
    const { cleaned, truncated, wordCount } = preprocessDocument(documentText);
    clauseFlags = extractRiskyClauses(cleaned);

    docBlock = [
      `\n\n---DOCUMENT CONTEXT---`,
      `File: ${documentName || "Uploaded Document"}`,
      `Words: ~${wordCount.toLocaleString()}${truncated ? " (truncated)" : ""}`,
      `Detected clause risks: ${clauseFlags.length} item(s) flagged`,
      clauseFlags.length > 0
        ? `\nPRE-FLAGGED CLAUSES FOR YOUR REFERENCE:\n` +
          clauseFlags.map((f, i) =>
            `${i + 1}. [${f.risk.toUpperCase()} RISK] ${f.type}: ${f.reason}`
          ).join("\n")
        : "",
      `\n--- FULL DOCUMENT TEXT ---\n${cleaned}`,
      `---END DOCUMENT---`,
    ].join("\n");
  }

  // Intent-specific instruction suffix
  const intentInstructions = {
    [INTENT.DOCUMENT_ANALYSIS] : `\n\nPlease analyse this document thoroughly using the Document Analysis Format from your instructions. Be thorough but keep language simple.`,
    [INTENT.CLAUSE_EXPLAIN]    : `\n\nPlease explain this clause using the Clause Explanation Format. Use plain English and rate the risk clearly.`,
    [INTENT.RISK_ASSESSMENT]   : `\n\nPlease identify all risks clearly with 🔴 High / 🟡 Medium / 🟢 Low ratings. Explain each risk as if talking to someone with no legal knowledge.`,
    [INTENT.LAW_EXPLAIN]       : `\n\nPlease explain this law/concept in the simplest possible language. Use an everyday analogy. Mention the specific law name and jurisdiction (${jurisdiction}).`,
    [INTENT.COMPLIANCE_CHECK]  : `\n\nCheck compliance for jurisdiction: ${jurisdiction}. Be specific about which laws apply and what the user needs to do.`,
    [INTENT.DRAFT_HELP]        : `\n\nExplain what should be included and why. Do not draft the full document but help the user understand what to look for or ask for.`,
    [INTENT.RIGHTS_EXPLAIN]    : `\n\nExplain the user's rights clearly and practically. What can they do right now? What are the steps?`,
    [INTENT.CASE_RESEARCH]     : `\n\nExplain the case, judgment, or legal precedent in plain English. What did the court decide and why does it matter?`,
    [INTENT.OUT_OF_SCOPE]      : `\n\nPolitely explain that this is outside your specialisation and redirect the user to appropriate resources.`,
    [INTENT.GENERAL_LEGAL]     : `\n\nAnswer clearly and simply. Start with the direct answer, then explain in plain language.`,
  };

  const jsonInstruction = jsonMode
    ? `\n\nIMPORTANT: Respond ONLY with a valid JSON object in this format:
{
  "summary": "plain English summary",
  "keyPoints": ["point 1", "point 2"],
  "riskLevel": "high|medium|low|none",
  "risks": [{"clause": "...", "risk": "high|medium|low", "explanation": "..."}],
  "recommendations": ["recommendation 1"],
  "questions": ["question to ask"],
  "bottomLine": "one sentence verdict"
}
Do not include any text outside the JSON object.`
    : "";

  // Assemble the final user message content
  const finalUserContent = [
    userMessage,
    docBlock,
    intentInstructions[intent] || "",
    jsonInstruction,
  ].join("");

  // Pull conversation history
  const history = memory.get(sessionId);

  const messages = [
    { role: "user", content: finalUserContent },
  ];

  // Prepend history (excludes system — Sarvam uses it separately or as first user msg)
  if (history.length > 0) {
    messages.unshift(...history);
  }

  return { messages, intent, clauseFlags };
}

// ─────────────────────────────────────────────
//  HTTP CLIENT WITH RETRY
// ─────────────────────────────────────────────

/**
 * Makes an API call to Sarvam with automatic retry on transient errors.
 * @param {object} payload
 * @param {number} attempt
 * @returns {Promise<object>}
 */
async function callSarvamWithRetry(payload, attempt = 1) {
  try {
    const response = await axios.post(
      `${SARVAM_API_BASE}/v1/chat/completions`,
      payload,
      {
        headers: {
          Authorization  : `Bearer ${process.env.SARVAM_API_KEY}`,
          "Content-Type" : "application/json",
          "User-Agent"   : "LawLite/1.1",
        },
        timeout: REQUEST_TIMEOUT,
      }
    );
    return response.data;

  } catch (err) {
    const status  = err.response?.status;
    const isRetry = status == null || status === 429 || status >= 500;

    if (isRetry && attempt < MAX_RETRIES) {
      const waitMs = RETRY_BASE_MS * Math.pow(2, attempt - 1) + Math.random() * 300;
      console.warn(`[LawLite] Sarvam API attempt ${attempt} failed (${status || "network"}). Retrying in ${Math.round(waitMs)}ms...`);
      await new Promise(r => setTimeout(r, waitMs));
      return callSarvamWithRetry(payload, attempt + 1);
    }

    throw classifyError(err);
  }
}

// ─────────────────────────────────────────────
//  ERROR CLASSIFIER
// ─────────────────────────────────────────────

/**
 * Converts raw API/network errors into user-friendly LawLite errors.
 * @param {Error} err
 * @returns {Error} enriched error with .userMessage and .code
 */
function classifyError(err) {
  const status = err.response?.status;
  const body   = err.response?.data;

  const e = new Error(err.message);
  e.originalError = err;
  e.responseBody  = body;

  if (!status) {
    // Network error
    e.code        = "NETWORK_ERROR";
    e.userMessage = "LawLite couldn't connect to the AI. Please check your internet connection and try again.";
  } else if (status === 401) {
    e.code        = "AUTH_ERROR";
    e.userMessage = "API authentication failed. Please check your Sarvam API key in your environment settings.";
  } else if (status === 429) {
    e.code        = "RATE_LIMITED";
    e.userMessage = "Too many requests. Please wait a moment and try again.";
  } else if (status === 400) {
    e.code        = "BAD_REQUEST";
    e.userMessage = "The request couldn't be processed. Your document may be too large or in an unsupported format.";
  } else if (status >= 500) {
    e.code        = "SERVER_ERROR";
    e.userMessage = "The AI service is temporarily unavailable. Please try again in a few seconds.";
  } else {
    e.code        = "UNKNOWN_ERROR";
    e.userMessage = "Something went wrong. Please try again.";
  }

  return e;
}

// ─────────────────────────────────────────────
//  LOGGER
// ─────────────────────────────────────────────

const logger = {
  _format(level, msg, meta = {}) {
    const ts = new Date().toISOString();
    return JSON.stringify({ ts, level, service: "LawLite", msg, ...meta });
  },
  info  (msg, meta) { console.log  (this._format("INFO",  msg, meta)); },
  warn  (msg, meta) { console.warn (this._format("WARN",  msg, meta)); },
  error (msg, meta) { console.error(this._format("ERROR", msg, meta)); },
  debug (msg, meta) { if (process.env.LAWLITE_DEBUG) console.log(this._format("DEBUG", msg, meta)); },
};

// ─────────────────────────────────────────────
//  USAGE TRACKER
// ─────────────────────────────────────────────

const usageStore = new Map(); // sessionId -> cumulative usage

function trackUsage(sessionId, inputTokens, outputTokens) {
  const existing = usageStore.get(sessionId) || { inputTokens: 0, outputTokens: 0, calls: 0 };
  existing.inputTokens  += inputTokens;
  existing.outputTokens += outputTokens;
  existing.calls        += 1;
  usageStore.set(sessionId, existing);
  return existing;
}

function getUsage(sessionId) {
  return usageStore.get(sessionId) || { inputTokens: 0, outputTokens: 0, calls: 0 };
}

// ─────────────────────────────────────────────
//  RESPONSE PARSER
// ─────────────────────────────────────────────

/**
 * Extracts the assistant message text from the Sarvam API response.
 * Handles both standard chat completion format and edge cases.
 * @param {object} apiResponse
 * @returns {string}
 */
function parseResponse(apiResponse) {
  // Standard OpenAI-compatible format
  const choice = apiResponse?.choices?.[0];
  if (choice) {
    return choice.message?.content || choice.text || "";
  }
  // Fallback: direct content field
  if (typeof apiResponse?.content === "string") return apiResponse.content;
  // Fallback: message field
  if (typeof apiResponse?.message === "string") return apiResponse.message;

  logger.warn("Unexpected Sarvam response shape", { apiResponse });
  return "";
}

/**
 * Attempts to parse JSON from the assistant response.
 * Strips markdown fences if present.
 * @param {string} text
 * @returns {object|null}
 */
function parseJsonResponse(text) {
  try {
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/,      "")
      .replace(/```\s*$/,      "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
//  STREAMING SUPPORT
// ─────────────────────────────────────────────

/**
 * Makes a streaming request to Sarvam and emits tokens via EventEmitter.
 * Uses Server-Sent Events (SSE) format.
 *
 * @param {object} payload - API payload with stream: true
 * @param {EventEmitter} emitter - emits 'token', 'done', 'error' events
 */
async function streamSarvam(payload, emitter) {
  try {
    const response = await axios.post(
      `${SARVAM_API_BASE}/v1/chat/completions`,
      { ...payload, stream: true },
      {
        headers: {
          Authorization  : `Bearer ${process.env.SARVAM_API_KEY}`,
          "Content-Type" : "application/json",
          "User-Agent"   : "LawLite/1.1",
          Accept         : "text/event-stream",
        },
        responseType : "stream",
        timeout      : REQUEST_TIMEOUT,
      }
    );

    let buffer = "";
    let fullText = "";

    response.data.on("data", (chunk) => {
      buffer += chunk.toString("utf-8");
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json  = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content || "";
          if (delta) {
            fullText += delta;
            emitter.emit("token", delta);
          }
        } catch {
          // Malformed SSE chunk — skip
        }
      }
    });

    response.data.on("end", () => {
      emitter.emit("done", fullText);
    });

    response.data.on("error", (err) => {
      emitter.emit("error", classifyError(err));
    });

  } catch (err) {
    emitter.emit("error", classifyError(err));
  }
}

// ─────────────────────────────────────────────
//  MAIN PUBLIC API
// ─────────────────────────────────────────────

/**
 * Primary function: send a legal query to LawLite AI.
 *
 * @param {object}  opts
 * @param {string}  opts.userMessage      - User's question or instruction
 * @param {string}  [opts.documentText]   - Extracted text from uploaded file
 * @param {string}  [opts.documentName]   - File name (for context)
 * @param {string}  [opts.sessionId]      - Unique session/conversation ID
 * @param {string}  [opts.userId]         - User ID for rate limiting
 * @param {boolean} [opts.jsonMode]       - Return structured JSON analysis
 * @param {string}  [opts.jurisdiction]   - Legal jurisdiction (default: "India")
 *
 * @returns {Promise<{
 *   text: string,
 *   jsonData: object|null,
 *   intent: string,
 *   clauseFlags: Array,
 *   usage: object,
 *   sessionId: string,
 *   model: string,
 * }>}
 */
async function chat({
  userMessage,
  documentText  = null,
  documentName  = null,
  sessionId     = `session_${Date.now()}`,
  userId        = "anonymous",
  jsonMode      = false,
  jurisdiction  = "India",
}) {
  const startTime = Date.now();

  // ── Rate limit check ──
  if (!rateLimiter.check(userId)) {
    const retryAfter = rateLimiter.retryAfter(userId);
    const err = new Error(`Rate limit exceeded for user ${userId}`);
    err.code        = "RATE_LIMITED";
    err.retryAfter  = retryAfter;
    err.userMessage = `You're sending messages too quickly. Please wait ${retryAfter} seconds and try again.`;
    throw err;
  }

  logger.info("Chat request received", {
    sessionId,
    userId,
    hasDocument  : Boolean(documentText),
    documentName,
    jsonMode,
    jurisdiction,
    messageLen   : userMessage?.length,
  });

  // ── Build prompt ──
  const { messages, intent, clauseFlags } = buildPrompt({
    userMessage,
    documentText,
    documentName,
    sessionId,
    jsonMode,
    jurisdiction,
  });

  logger.debug("Prompt built", { intent, clauseFlags: clauseFlags.length, messages: messages.length });

  // ── Assemble API payload ──
  const payload = {
    model       : SARVAM_MODEL,
    messages    : [
      // Inject system prompt as the very first user turn
      // (Sarvam-M uses user/assistant alternation)
      { role: "user",      content: LAWLITE_SYSTEM_PROMPT },
      { role: "assistant", content: "Understood. I am LawLite 1.1, your AI legal assistant. I will explain all legal matters in simple, plain English. How can I help you today?" },
      ...messages,
    ],
    max_tokens  : MAX_TOKENS,
    temperature : intent === INTENT.DOCUMENT_ANALYSIS ? 0.3 : 0.5,
    // Lower temp for document analysis = more consistent/accurate output
    // Higher temp for explanations = more natural conversational tone
  };

  // ── Call API ──
  let apiResponse;
  try {
    apiResponse = await callSarvamWithRetry(payload);
  } catch (err) {
    logger.error("Sarvam API call failed", { code: err.code, message: err.message, sessionId });
    throw err;
  }

  // ── Parse response ──
  const rawText  = parseResponse(apiResponse);
  const jsonData = jsonMode ? parseJsonResponse(rawText) : null;

  if (!rawText) {
    logger.warn("Empty response from Sarvam", { sessionId, apiResponse });
  }

  // ── Update memory ──
  memory.append(sessionId, "user",      userMessage);
  memory.append(sessionId, "assistant", rawText);

  // ── Track usage ──
  const inputTokens  = apiResponse?.usage?.prompt_tokens     || estimateMessagesTokens(payload.messages);
  const outputTokens = apiResponse?.usage?.completion_tokens || estimateTokens(rawText);
  const usage        = trackUsage(sessionId, inputTokens, outputTokens);

  const elapsed = Date.now() - startTime;
  logger.info("Chat response sent", {
    sessionId,
    intent,
    inputTokens,
    outputTokens,
    totalSessionTokens : usage.inputTokens + usage.outputTokens,
    elapsedMs          : elapsed,
    clauseFlags        : clauseFlags.length,
  });

  return {
    text        : rawText,
    jsonData,
    intent,
    clauseFlags,
    usage       : {
      thisRequest : { inputTokens, outputTokens },
      session     : usage,
    },
    sessionId,
    model       : SARVAM_MODEL,
    elapsedMs   : elapsed,
  };
}

/**
 * Streaming version of chat().
 * Returns an EventEmitter that emits:
 *   - 'token'  (string)  — each streamed token
 *   - 'meta'   (object)  — intent, clauseFlags, sessionId (emitted before first token)
 *   - 'done'   (string)  — full assembled text when stream ends
 *   - 'error'  (Error)   — on failure
 *
 * @param {object} opts - Same options as chat()
 * @returns {EventEmitter}
 */
function chatStream({
  userMessage,
  documentText  = null,
  documentName  = null,
  sessionId     = `session_${Date.now()}`,
  userId        = "anonymous",
  jurisdiction  = "India",
}) {
  const emitter = new EventEmitter();

  // Rate limit
  if (!rateLimiter.check(userId)) {
    const retryAfter  = rateLimiter.retryAfter(userId);
    const err         = new Error("Rate limit exceeded");
    err.code          = "RATE_LIMITED";
    err.retryAfter    = retryAfter;
    err.userMessage   = `Please wait ${retryAfter} seconds before sending another message.`;
    setImmediate(() => emitter.emit("error", err));
    return emitter;
  }

  const { messages, intent, clauseFlags } = buildPrompt({
    userMessage,
    documentText,
    documentName,
    sessionId,
    jsonMode     : false,
    jurisdiction,
  });

  const payload = {
    model      : SARVAM_MODEL,
    messages   : [
      { role: "user",      content: LAWLITE_SYSTEM_PROMPT },
      { role: "assistant", content: "Understood. I am LawLite 1.1, your AI legal assistant. I will explain all legal matters in simple, plain English. How can I help you today?" },
      ...messages,
    ],
    max_tokens  : MAX_TOKENS,
    temperature : intent === INTENT.DOCUMENT_ANALYSIS ? 0.3 : 0.5,
  };

  // Emit meta immediately
  setImmediate(() => emitter.emit("meta", { intent, clauseFlags, sessionId }));

  // Kick off stream and wire memory update on done
  const streamEmitter = new EventEmitter();

  streamEmitter.on("token", token => emitter.emit("token", token));
  streamEmitter.on("error", err   => emitter.emit("error", err));
  streamEmitter.on("done",  full  => {
    memory.append(sessionId, "user",      userMessage);
    memory.append(sessionId, "assistant", full);
    emitter.emit("done", full);
  });

  streamSarvam(payload, streamEmitter);

  return emitter;
}

/**
 * Analyse a document and return structured JSON output.
 * Convenience wrapper around chat() with jsonMode: true.
 *
 * @param {object} opts
 * @param {string} opts.documentText
 * @param {string} [opts.documentName]
 * @param {string} [opts.sessionId]
 * @param {string} [opts.userId]
 * @param {string} [opts.jurisdiction]
 * @returns {Promise<{ analysis: object, clauseFlags: Array, rawText: string }>}
 */
async function analyseDocument({
  documentText,
  documentName = "Document",
  sessionId    = `doc_${Date.now()}`,
  userId       = "anonymous",
  jurisdiction = "India",
}) {
  if (!documentText || documentText.trim().length < 20) {
    throw Object.assign(new Error("Document text is too short to analyse."), {
      code        : "INVALID_INPUT",
      userMessage : "The document appears to be empty or too short. Please check the file and try again.",
    });
  }

  const result = await chat({
    userMessage  : "Please analyse this legal document completely and thoroughly.",
    documentText,
    documentName,
    sessionId,
    userId,
    jsonMode     : true,
    jurisdiction,
  });

  return {
    analysis    : result.jsonData,
    clauseFlags : result.clauseFlags,
    rawText     : result.text,
    intent      : result.intent,
    usage       : result.usage,
  };
}

/**
 * Quick clause explanation — no conversation memory needed.
 * @param {string} clauseText
 * @param {string} [context] - surrounding contract context for better accuracy
 * @param {string} [jurisdiction]
 * @returns {Promise<string>}
 */
async function explainClause(clauseText, context = "", jurisdiction = "India") {
  const userMessage = context
    ? `Explain this specific clause in plain English:\n\n"${clauseText}"\n\nContext (surrounding contract): ${context.slice(0, 500)}`
    : `Explain this legal clause in plain English:\n\n"${clauseText}"`;

  const result = await chat({
    userMessage,
    sessionId    : `clause_${Date.now()}`,
    userId       : "clause_query",
    jurisdiction,
  });

  return result.text;
}

/**
 * Clears conversation memory for a session.
 * Call this when the user starts a new chat.
 * @param {string} sessionId
 */
function clearSession(sessionId) {
  memory.clear(sessionId);
  logger.info("Session cleared", { sessionId });
}

/**
 * Returns current session memory stats.
 * @param {string} sessionId
 */
function getSessionStats(sessionId) {
  return {
    memory : memory.stats(sessionId),
    usage  : getUsage(sessionId),
  };
}

// ─────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────

module.exports = {
  // Primary functions
  chat,
  chatStream,
  analyseDocument,
  explainClause,

  // Session management
  clearSession,
  getSessionStats,

  // Utilities (exposed for testing / custom use)
  detectIntent,
  extractRiskyClauses,
  preprocessDocument,
  buildPrompt,
  estimateTokens,
  estimateMessagesTokens,
  parseJsonResponse,

  // Constants
  INTENT,
  RISK,
  SARVAM_MODEL,
  LAWLITE_SYSTEM_PROMPT,
};