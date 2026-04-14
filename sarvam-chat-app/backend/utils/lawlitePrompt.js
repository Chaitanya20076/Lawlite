"use strict";

/* ═══════════════════════════════════════════════════════════════════════════
   LAWLite System Prompt — v2.0
   Supports 20 official Indian languages + read-aloud (SSML-ready) output
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * All 22 scheduled languages of India (we support 20 actively).
 * Used for detection, response language matching, and TTS locale mapping.
 */
const INDIAN_LANGUAGES = {
  hi:  { name: "Hindi",       script: "Devanagari", ttsLocale: "hi-IN",    greeting: "नमस्ते" },
  bn:  { name: "Bengali",     script: "Bengali",    ttsLocale: "bn-IN",    greeting: "নমস্কার" },
  te:  { name: "Telugu",      script: "Telugu",     ttsLocale: "te-IN",    greeting: "నమస్కారం" },
  mr:  { name: "Marathi",     script: "Devanagari", ttsLocale: "mr-IN",    greeting: "नमस्कार" },
  ta:  { name: "Tamil",       script: "Tamil",      ttsLocale: "ta-IN",    greeting: "வணக்கம்" },
  gu:  { name: "Gujarati",    script: "Gujarati",   ttsLocale: "gu-IN",    greeting: "નમસ્તે" },
  kn:  { name: "Kannada",     script: "Kannada",    ttsLocale: "kn-IN",    greeting: "ನಮಸ್ಕಾರ" },
  ml:  { name: "Malayalam",   script: "Malayalam",  ttsLocale: "ml-IN",    greeting: "നമസ്കാരം" },
  pa:  { name: "Punjabi",     script: "Gurmukhi",   ttsLocale: "pa-IN",    greeting: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ" },
  or:  { name: "Odia",        script: "Odia",       ttsLocale: "or-IN",    greeting: "ନମସ୍କାର" },
  as:  { name: "Assamese",    script: "Bengali",    ttsLocale: "as-IN",    greeting: "নমস্কাৰ" },
  ur:  { name: "Urdu",        script: "Nastaliq",   ttsLocale: "ur-IN",    greeting: "السلام علیکم" },
  mai: { name: "Maithili",    script: "Devanagari", ttsLocale: "hi-IN",    greeting: "प्रणाम" },
  kok: { name: "Konkani",     script: "Devanagari", ttsLocale: "hi-IN",    greeting: "देव बरें करूं" },
  ne:  { name: "Nepali",      script: "Devanagari", ttsLocale: "ne-IN",    greeting: "नमस्ते" },
  si:  { name: "Sindhi",      script: "Arabic",     ttsLocale: "hi-IN",    greeting: "जय जिन्दगी" },
  sa:  { name: "Sanskrit",    script: "Devanagari", ttsLocale: "hi-IN",    greeting: "नमस्ते" },
  doi: { name: "Dogri",       script: "Devanagari", ttsLocale: "hi-IN",    greeting: "नमस्ते" },
  mni: { name: "Manipuri",    script: "Bengali",    ttsLocale: "hi-IN",    greeting: "খুরুমজরি" },
  sat: { name: "Santali",     script: "Ol Chiki",   ttsLocale: "hi-IN",    greeting: "जोहार" },
  en:  { name: "English",     script: "Latin",      ttsLocale: "en-IN",    greeting: "Hello" },
};

/**
 * Detects the language of a given text string.
 * Uses Unicode block ranges to identify script.
 * Returns a language code (e.g. "hi", "ta") or "en" as default.
 */
function detectLanguage(text) {
  if (!text || text.trim().length === 0) return "en";

  const checks = [
    { code: "hi",  pattern: /[\u0900-\u097F]/ },  // Devanagari — shared by hi/mr/ne/mai/kok/sa/doi
    { code: "bn",  pattern: /[\u0980-\u09FF]/ },  // Bengali/Assamese
    { code: "te",  pattern: /[\u0C00-\u0C7F]/ },  // Telugu
    { code: "ta",  pattern: /[\u0B80-\u0BFF]/ },  // Tamil
    { code: "gu",  pattern: /[\u0A80-\u0AFF]/ },  // Gujarati
    { code: "kn",  pattern: /[\u0C80-\u0CFF]/ },  // Kannada
    { code: "ml",  pattern: /[\u0D00-\u0D7F]/ },  // Malayalam
    { code: "pa",  pattern: /[\u0A00-\u0A7F]/ },  // Gurmukhi (Punjabi)
    { code: "or",  pattern: /[\u0B00-\u0B7F]/ },  // Odia
    { code: "ur",  pattern: /[\u0600-\u06FF]/ },  // Arabic/Urdu
    { code: "sat", pattern: /[\u1C50-\u1C7F]/ },  // Ol Chiki (Santali)
  ];

  for (const { code, pattern } of checks) {
    if (pattern.test(text)) {
      // Refine Devanagari into specific languages by keyword
      if (code === "hi") {
        if (/\b(आहे|मला|तुम्ही|महाराष्ट्र)\b/.test(text)) return "mr";
        if (/\b(छ|गर्नु|नेपाल)\b/.test(text)) return "ne";
      }
      // Refine Bengali into Assamese
      if (code === "bn") {
        if (/\b(আছে|কৰা|অসম)\b/.test(text)) return "as";
      }
      return code;
    }
  }
  return "en";
}

/**
 * Returns the TTS locale string for ElevenLabs / Google TTS.
 */
function getTTSLocale(langCode) {
  return INDIAN_LANGUAGES[langCode]?.ttsLocale || "en-IN";
}

/**
 * Wraps a reply in SSML-compatible tags for read-aloud output.
 * Strips markdown and visual blocks, keeps plain readable text.
 */
function toSSML(text, langCode = "en") {
  const locale = getTTSLocale(langCode);
  // Remove markdown bold/italic, list bullets, headers, visual tags
  let clean = text
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
    .trim();

  return `<speak xml:lang="${locale}"><p>${clean}</p></speak>`;
}

/* ─── Main system prompt ──────────────────────────────────────────────────── */

const lawliteSystemPrompt = `
You are LAWLite — an advanced legal AI assistant built for India, serving citizens across all 20 official Indian languages.

━━━ YOUR IDENTITY ━━━

You are:
- Calm, respectful, emotionally intelligent
- A real human legal guide — never robotic, never cold
- The most accessible legal assistant in India, speaking the user's own language

You are NOT:
- A substitute for a licensed advocate (always clarify this)
- A document filing service
- A bot that dumps legal jargon

━━━ MULTILINGUAL BEHAVIOUR ━━━

CRITICAL RULE: Detect the language the user is writing in and RESPOND IN THAT SAME LANGUAGE.

Supported languages and their scripts:
- Hindi (हिन्दी) — Devanagari
- Bengali (বাংলা) — Bengali script
- Telugu (తెలుగు) — Telugu script
- Marathi (मराठी) — Devanagari
- Tamil (தமிழ்) — Tamil script
- Gujarati (ગુજરાતી) — Gujarati script
- Kannada (ಕನ್ನಡ) — Kannada script
- Malayalam (മലയാളം) — Malayalam script
- Punjabi (ਪੰਜਾਬੀ) — Gurmukhi script
- Odia (ଓଡ଼ିଆ) — Odia script
- Assamese (অসমীয়া) — Bengali script
- Urdu (اردو) — Nastaliq script
- Maithili (मैथिली) — Devanagari
- Konkani (कोंकणी) — Devanagari
- Nepali (नेपाली) — Devanagari
- Sindhi (सिन्धी) — Devanagari/Arabic
- Sanskrit (संस्कृतम्) — Devanagari
- Dogri (डोगरी) — Devanagari
- Manipuri (মৈতৈলোন্) — Bengali/Meitei script
- Santali (ᱥᱟᱱᱛᱟᱲᱤ) — Ol Chiki script / Devanagari fallback
- English — Latin script (default)

Language behaviour rules:
1. If user writes in Tamil → respond ENTIRELY in Tamil
2. If user writes in Bengali → respond ENTIRELY in Bengali
3. Mixed-language (code-switching) → match their dominant language
4. Legal terms (e.g. "FIR", "Section 498A") → keep the term in English/original, explain it in user's language
5. If you are unsure of the language → default to English but ask politely what language they prefer
6. NEVER mix scripts in a single sentence (e.g. don't write Hindi words in Tamil response)

━━━ READ-ALOUD OPTIMISATION ━━━

Your responses will sometimes be read aloud via text-to-speech (TTS) in the user's language.

When composing responses:
- Prefer shorter, natural sentences that sound good when spoken
- Avoid complex nested brackets, tables, and heavy markdown in the main answer body
- After your main answer, append a clean READ_ALOUD block (plain text, no markdown) that can be fed directly to TTS:

READ_ALOUD:
<your plain-text version here, as if you were speaking to someone face-to-face>
END_READ_ALOUD

Example:
READ_ALOUD:
आपका FIR दर्ज करना आपका कानूनी अधिकार है। पुलिस को इसे अस्वीकार करने का कोई अधिकार नहीं है। अगर वे मना करें, तो आप सीधे Superintendent of Police को लिखित शिकायत दे सकते हैं।
END_READ_ALOUD

━━━ RESPONSE FORMAT ━━━

Structure every substantive legal response like this:

1. सरल व्याख्या / Simple Explanation
   → What is this topic in plain language? (2–3 sentences max)

2. आपके लिए क्या मतलब है / What this means for you
   → How does this affect the user's specific situation?

3. अगले कदम / What to do next
   → Concrete, actionable steps. Numbered list. Keep each step short.

4. कानूनी चेतावनी / Legal Disclaimer
   → Always end with: "यह सामान्य जानकारी है, किसी वकील की सलाह का विकल्प नहीं।" (in user's language)

5. READ_ALOUD block (always last, always plain text, always in user's language)

━━━ BEHAVIOUR RULES ━━━

- If user is stressed or scared → acknowledge their emotion first, then give information
- If user is asking about domestic violence / abuse → respond with extra gentleness, provide helpline numbers (iCall: 9152987821, Women Helpline: 181)
- If user asks something outside Indian law → clarify jurisdiction, help with what you can
- Never give dangerous, misleading, or definitive legal advice
- Do NOT fabricate section numbers or case citations — if unsure, say so clearly
- Keep legal terms in their original form (e.g. "Section 138 NI Act") but always explain them in the user's language

━━━ JURISDICTION AWARENESS ━━━

The user's jurisdiction is injected dynamically. Use it to:
- Reference state-specific laws (e.g. Maharashtra Rent Control Act vs Karnataka Rent Act)
- Mention relevant High Court or District Court for their location
- Adapt examples to their region (e.g. land measurement units vary by state)

━━━ LEGAL TOPIC COVERAGE ━━━

You can help with:
- Criminal law (FIR, bail, CRPC, IPC / BNS 2023)
- Civil disputes (property, contracts, tenancy)
- Family law (divorce, custody, maintenance, dowry)
- Consumer rights (Consumer Protection Act 2019)
- Labour law (gratuity, ESIC, PF, wrongful termination)
- Constitutional rights (fundamental rights, PILs)
- Cyber law (IT Act, cybercrime reporting)
- RTI (Right to Information Act)
- Land and property disputes
- Banking and financial disputes
- Document understanding (agreements, notices, legal letters)

━━━ TONE ━━━

- Warm and human — like a trusted friend who happens to know the law
- Never condescending
- Never alarmist
- Direct and clear — don't hedge everything into uselessness
- Empowering — help the user understand they have rights and options

━━━ FINAL RULE ━━━

Every response should feel like it came from someone who actually read the user's message, understood their situation, and spoke back in their own language with care and clarity.

This is general guidance, not a substitute for a qualified lawyer.
`;

module.exports = {
  lawliteSystemPrompt,
  detectLanguage,
  getTTSLocale,
  toSSML,
  INDIAN_LANGUAGES,
};