"use strict";

const express = require("express");
const router = express.Router();
const axios = require("axios");
const path = require("path");
const upload = require("../middleware/upload");
const extractText = require("../services/fileParser");

const sarvamService = require("../services/sarvamService");

// ── Persistent Memory Engine ──────────────────────────────────
const {
  loadSessionHistory,
  appendTurn,
  clearSession,
} = require("../services/memory.engine");

/**
 * chat()
 * ──────
 * Loads persistent history from Firestore (or in-memory cache),
 * calls the AI, then saves the new turn back to Firestore.
 */
async function chat({ userMessage, documentText, documentName, sessionId, userId, jurisdiction }) {
  // 1. Load history (Firestore → in-memory cache)
  let history = await loadSessionHistory(userId, sessionId);

  // 2. Build user content (attach doc text inline if present)
  const userContent = documentText
    ? `${userMessage}\n\nATTACHED CONTENT — ${documentName}:\n${documentText}`
    : userMessage;

  // 3. Append the NEW user message for this turn
  const historyWithUser = [...history, { role: "user", content: userContent }];

  // 4. Call the AI
  const result = await sarvamService.generateResponse(historyWithUser);
  const assistantReply = result.reply || result.text || "";

  // 5. Persist new turn (fire-and-forget to not block response)
  appendTurn({
    userId,
    sessionId,
    userMessage : userContent,
    assistantReply,
    jurisdiction,
  }).catch(err => console.error("[Memory] appendTurn failed:", err.message));

  return { text: assistantReply };
}

const {
  detectIndianLanguage,
  getTTSLocale,
  extractReadAloudBlock,
  toSSML,
  INDIAN_LANGUAGES,
} = require("../services/sarvamService");

const searchWeb = require("../services/tavilyService");
const { fetchContextualImages, isVisualWorthy } = require("../services/mediaService");
const { generateDocument, detectDocumentRequest } = require("../services/documentService");
const { saveConversation, getUserConversations, deleteConversation } = require("../services/firestoreService");
const { summarizeConversation } = require("../services/summaryService");

// Track message count per session for metadata saves (separate from memory)
const sessionMessageCount = new Map();

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function parseReplyForClient(rawReply) {
  let reply = rawReply;

  const readAloudMatch = reply.match(/\[READ_ALOUD_TEXT\]([\s\S]*?)\[\/READ_ALOUD_TEXT\]/);
  const readAloudText  = readAloudMatch ? readAloudMatch[1].trim() : null;
  reply = reply.replace(/\[READ_ALOUD_TEXT\][\s\S]*?\[\/READ_ALOUD_TEXT\]/g, "").trim();

  const localeMatch = reply.match(/\[TTS_LOCALE\]([\s\S]*?)\[\/TTS_LOCALE\]/);
  const ttsLocale   = localeMatch ? localeMatch[1].trim() : "en-IN";
  reply = reply.replace(/\[TTS_LOCALE\][\s\S]*?\[\/TTS_LOCALE\]/g, "").trim();

  const langMatch = reply.match(/\[LANG_CODE\]([\s\S]*?)\[\/LANG_CODE\]/);
  const langCode  = langMatch ? langMatch[1].trim() : "en";
  reply = reply.replace(/\[LANG_CODE\][\s\S]*?\[\/LANG_CODE\]/g, "").trim();

  return { reply, readAloudText, ttsLocale, langCode };
}

function buildSSML(text, ttsLocale) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<speak xml:lang="${ttsLocale}"><p>${escaped}</p></speak>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN CHAT ROUTE
   ═══════════════════════════════════════════════════════════════════════════ */

router.post("/", upload.array("files"), async (req, res) => {
  console.log("FILES RECEIVED:", req.files?.length || 0);

  const { message, userId } = req.body;
  const web          = req.body.web === "true";
  const jurisdiction = req.body.jurisdiction || req.body.country || "India";
  const state        = req.body.state || "";
  const sessionId    = req.body.sessionId || `session_${Date.now()}`;

  const incomingLangCode = detectIndianLanguage(message || "");
  const incomingLangInfo = INDIAN_LANGUAGES[incomingLangCode] || INDIAN_LANGUAGES["en"];

  const { isDocRequest, docType, topic } = detectDocumentRequest(message || "");
  if (isDocRequest) {
    return res.json({
      reply        : `📄 Generating your ${docType.toUpperCase()} on "${topic}"...\n\nI'll build this now — it'll be ready in a moment.`,
      isDocRequest : true,
      docType,
      topic,
      requestId    : `doc_${Date.now()}`,
      langCode     : incomingLangCode,
      langName     : incomingLangInfo.name,
    });
  }

  let documentText = "";

  if (req.files && req.files.length > 0) {
    console.log("📂 Processing uploaded files...");
    for (const file of req.files) {
      try {
        const text = await extractText(file);
        documentText += "\n\n--- FILE: " + file.originalname + " ---\n" + text;
      } catch (err) {
        console.error("File parse error (" + file.originalname + "):", err.message);
      }
    }
  }

  console.log("WEB FLAG:", web);
  console.log("[Lang] Incoming message language:", incomingLangInfo.name);

  try {
    let enhancedPrompt = message;

    let webSources = [];
    if (web) {
      console.log("🌐 Using Tavily search...");
      const webData = await searchWeb(message);
      if (webData && webData.results) {
        webSources = webData.results
          .filter(r => r.url && r.type !== "answer_box")
          .slice(0, 4)
          .map(r => ({ title: r.title, url: r.url, snippet: r.snippet }));

        const context = webData.results
          .slice(0, 3)
          .map(r => "Source: " + r.url + "\n" + (r.snippet || r.content || "").slice(0, 300))
          .join("\n\n");

        enhancedPrompt = `
User Question:
${message.slice(0, 1000)}

Relevant Web Information:
${context}

Instructions:
Use this information ONLY if it improves accuracy. Otherwise ignore it.
Respond in the same language the user used: ${incomingLangInfo.name}.
`;
      }
    }

    const resolvedJurisdiction = state ? `${state}, ${jurisdiction}` : jurisdiction;

    // Call AI (memory loading + saving happens inside chat())
    const result = await chat({
      userMessage  : enhancedPrompt,
      documentText,
      documentName : "User Upload",
      sessionId,
      userId       : userId || "anonymous",
      jurisdiction : resolvedJurisdiction,
    });

    let rawReply = result.text || "No response from LAWLite";

    const visualMatches = [...rawReply.matchAll(/\[VISUAL:(\w+)\]([\s\S]*?)\[\/VISUAL\]/gi)];
    const visualBlocks  = visualMatches.map(m => ({ type: m[1].toUpperCase(), content: m[2].trim() }));

    rawReply = rawReply
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/READ_ALOUD:[\s\S]*?END_READ_ALOUD/gi, '')
      .replace(/READ_ALOUD:[\s\S]*/i, '')
      .replace(/FOLLOW[_\s-]?UPS?\s*:[\s\S]*/i, '')
      .replace(/\[READ_ALOUD_TEXT\][\s\S]*?\[\/READ_ALOUD_TEXT\]/gi, '')
      .replace(/\[FOLLOWUPS\][\s\S]*?\[\/FOLLOWUPS\]/gi, '')
      .trim();

    let replyForClient = rawReply.replace(/\[VISUAL:[^\]]*\][\s\S]*?\[\/VISUAL\]/gi, '').trim();

    if (!replyForClient) {
      replyForClient = '📊 Here is the visual breakdown:';
    }
    rawReply = rawReply.replace(/READ_ALOUD:[\s\S]*?END_READ_ALOUD/gi, "").trim();
    rawReply = rawReply.replace(/READ_ALOUD:[\s\S]*/i, "").trim();

    const { reply: _reply, readAloudText, ttsLocale, langCode } = parseReplyForClient(replyForClient);
    const reply = _reply || '📊 Here is the visual breakdown:';

    const ssml = readAloudText ? buildSSML(readAloudText, ttsLocale) : null;

    let images = [];
    if (process.env.PEXELS_API_KEY && isVisualWorthy(reply)) {
      images = await fetchContextualImages({
        replyText   : reply,
        userMessage : message,
        count       : 3,
      });
    }

    res.json({
      reply,
      images,
      sources     : webSources,
      visualBlocks,
      langCode,
      langName    : INDIAN_LANGUAGES[langCode]?.name || "English",
      ttsLocale,
      readAloudText,
      ssml,
      rtlScript   : INDIAN_LANGUAGES[langCode]?.rtlScript || false,
    });

    // ── Save metadata summary to conversations collection (unchanged) ──
    const count = (sessionMessageCount.get(sessionId) || 0) + 1;
    sessionMessageCount.set(sessionId, count);

    const shouldSave = count % 2 === 0;
    if (shouldSave && userId && userId !== "anonymous") {
      // Grab session history from cache for summary title generation
      const { loadSessionHistory: _load } = require("../services/memory.engine");
      const sessionMessages = await _load(userId, sessionId).catch(() => []);
      if (sessionMessages.length >= 2) {
        summarizeConversation(sessionMessages, resolvedJurisdiction)
          .then(({ title, summary }) =>
            saveConversation({
              userId,
              sessionId,
              title,
              summary,
              messageCount : count,
              jurisdiction : resolvedJurisdiction,
              lastMessage  : message?.slice(0, 100) || "",
              langCode,
            })
          )
          .then(() => console.log("[Debug] ✅ Conversation metadata saved to Firestore"))
          .catch(err => console.error("[AutoSummarize] Failed:", err.message));
      }
    }

  } catch (err) {
    console.error("CHAT ERROR:", err);
    res.status(500).json({ error: "Server error", reply: "⚠️ Something went wrong. Please try again." });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   DOCUMENT GENERATION ROUTE
   ═══════════════════════════════════════════════════════════════════════════ */

router.post("/generate-doc", async (req, res) => {
  const { userMessage, userId, jurisdiction, country, state, sessionId } = req.body;
  const resolvedJurisdiction = state
    ? `${state}, ${jurisdiction || country || "India"}`
    : (jurisdiction || country || "India");
  const resolvedSessionId = sessionId || `session_${Date.now()}`;

  if (!userMessage) return res.status(400).json({ error: "No message provided" });

  console.log("📄 Document generation request:", userMessage.slice(0, 80));

  try {
    const result = await generateDocument({
      userMessage,
      extraContext : "Jurisdiction: " + resolvedJurisdiction,
      sessionId    : resolvedSessionId,
    });

    res.setHeader("Content-Type",             result.mimeType || "application/pdf");
    res.setHeader("Content-Transfer-Encoding","binary");
    res.setHeader("Content-Disposition",      `attachment; filename="${result.filename}"`);
    res.setHeader("X-Doc-Title",              encodeURIComponent(result.title));
    res.setHeader("X-Doc-Type",               result.docType);
    res.setHeader("X-Doc-Slides",             result.slideCount || "");
    res.setHeader("X-Doc-Sections",           result.sectionCount || "");
    res.setHeader("X-Live-Code",              encodeURIComponent(result.liveCode || ""));
    res.send(result.buffer);

  } catch (err) {
    console.error("DOC GEN ERROR:", err);
    res.status(500).json({ error: "Document generation failed", message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   IMAGE SEARCH ROUTE
   ═══════════════════════════════════════════════════════════════════════════ */

router.post("/images", async (req, res) => {
  const { query, replyText } = req.body;
  if (!process.env.PEXELS_API_KEY) return res.status(503).json({ images: [], error: "Pexels not configured" });
  try {
    const images = await fetchContextualImages({ replyText: replyText || query || "", userMessage: query || "", count: 4, query: query || null });
    res.json({ images });
  } catch (err) {
    console.error("IMAGE SEARCH ERROR:", err);
    res.json({ images: [] });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   TTS ROUTE
   ═══════════════════════════════════════════════════════════════════════════ */

router.post("/tts", async (req, res) => {
  try {
    const { text, langCode, ttsLocale, ssml } = req.body;
    if (!text && !ssml) return res.status(400).json({ error: "No text provided" });

    const resolvedLang   = langCode || detectIndianLanguage(text || "");
    const resolvedLocale = ttsLocale || getTTSLocale(resolvedLang);
    const langInfo       = INDIAN_LANGUAGES[resolvedLang] || INDIAN_LANGUAGES["en"];

    console.log("🔊 TTS REQUEST | lang:", langInfo.name, "| locale:", resolvedLocale, "| text:", (text || "").slice(0, 50));

    const response = await axios({
      method  : "POST",
      url     : `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}`,
      headers : {
        "xi-api-key"  : process.env.ELEVEN_API_KEY,
        "Content-Type": "application/json",
      },
      data: {
        text      : text || "",
        model_id  : "eleven_multilingual_v2",
        voice_settings: {
          stability        : 0.4,
          similarity_boost : 0.85,
          style            : 0.2,
          use_speaker_boost: true,
        },
        ...(resolvedLang !== "en" ? { language_code: resolvedLocale } : {}),
      },
      responseType: "arraybuffer",
    });

    console.log("✅ TTS SUCCESS | lang:", langInfo.name);

    res.set({
      "Content-Type" : "audio/mpeg",
      "X-Lang-Code"  : resolvedLang,
      "X-Lang-Name"  : langInfo.name,
      "X-TTS-Locale" : resolvedLocale,
    });
    res.send(response.data);

  } catch (err) {
    console.error("❌ TTS ERROR:", err.response?.data?.toString() || err.message);
    res.status(500).json({ error: "TTS failed", langCode: req.body.langCode || "en" });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   READ-ALOUD ROUTE
   ═══════════════════════════════════════════════════════════════════════════ */

router.post("/read-aloud", async (req, res) => {
  try {
    const { text, langCode, readAloudText } = req.body;
    const rawText = readAloudText || text || "";
    if (!rawText.trim()) return res.status(400).json({ error: "No text provided" });

    const resolvedLang   = langCode || detectIndianLanguage(rawText);
    const resolvedLocale = getTTSLocale(resolvedLang);
    const langInfo       = INDIAN_LANGUAGES[resolvedLang] || INDIAN_LANGUAGES["en"];

    const spokenText = rawText
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/^#{1,4}\s+/gm, "")
      .replace(/^[-•*]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      .replace(/\[VISUAL:\w+\][\s\S]*?\[\/VISUAL\]/gi, "")
      .replace(/\[SOURCES\][\s\S]*?\[\/SOURCES\]/gi, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 2000);

    console.log("🔊 READ-ALOUD | lang:", langInfo.name, "| locale:", resolvedLocale, "| chars:", spokenText.length);

    const response = await axios({
      method  : "POST",
      url     : `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}`,
      headers : {
        "xi-api-key"  : process.env.ELEVEN_API_KEY,
        "Content-Type": "application/json",
      },
      data: {
        text      : spokenText,
        model_id  : "eleven_multilingual_v2",
        voice_settings: {
          stability        : 0.45,
          similarity_boost : 0.85,
          style            : 0.2,
          use_speaker_boost: true,
        },
        ...(resolvedLang !== "en" ? { language_code: resolvedLocale } : {}),
      },
      responseType: "arraybuffer",
    });

    console.log("✅ READ-ALOUD SUCCESS | lang:", langInfo.name);

    res.set({
      "Content-Type" : "audio/mpeg",
      "X-Lang-Code"  : resolvedLang,
      "X-Lang-Name"  : langInfo.name,
      "X-TTS-Locale" : resolvedLocale,
    });
    res.send(response.data);

  } catch (err) {
    console.error("❌ READ-ALOUD ERROR:", err.response?.data?.toString() || err.message);
    res.status(500).json({ error: "Read-aloud failed" });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   LANGUAGE ROUTES
   ═══════════════════════════════════════════════════════════════════════════ */

router.get("/languages", (req, res) => {
  const languages = Object.entries(INDIAN_LANGUAGES)
    .filter(([code]) => code !== "en")
    .map(([code, info]) => ({
      code,
      name     : info.name,
      script   : info.script,
      ttsLocale: info.ttsLocale,
      rtlScript: info.rtlScript,
    }));
  res.json({ languages, total: languages.length, englishIncluded: true });
});

router.post("/detect-language", (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });
  const langCode = detectIndianLanguage(text);
  const langInfo = INDIAN_LANGUAGES[langCode] || INDIAN_LANGUAGES["en"];
  res.json({
    langCode,
    langName : langInfo.name,
    script   : langInfo.script,
    ttsLocale: langInfo.ttsLocale,
    rtlScript: langInfo.rtlScript,
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   HISTORY ROUTES
   ═══════════════════════════════════════════════════════════════════════════ */

router.get("/history/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.json({ conversations: [] });
  try {
    const conversations = await getUserConversations(userId);
    res.json({ conversations });
  } catch (err) {
    res.json({ conversations: [] });
  }
});

router.post("/summarize", async (req, res) => {
  const { sessionId, userId, jurisdiction, state } = req.body;
  if (!sessionId || !userId || userId === "anonymous") return res.json({ ok: false });
  try {
    const sessionMessages = await loadSessionHistory(userId, sessionId);
    if (!sessionMessages || sessionMessages.length < 2) return res.json({ ok: false, reason: "too short" });
    const resolvedJurisdiction = state ? `${state}, ${jurisdiction}` : (jurisdiction || "India");
    const { title, summary } = await summarizeConversation(sessionMessages, resolvedJurisdiction);
    await saveConversation({
      userId,
      sessionId,
      title,
      summary,
      messageCount : sessionMessages.length,
      jurisdiction : resolvedJurisdiction,
      lastMessage  : sessionMessages[sessionMessages.length - 2]?.content?.slice(0, 100) || "",
    });
    res.json({ ok: true, title, summary });
  } catch (err) {
    console.error("[Summarize Route] Error:", err.message);
    res.json({ ok: false });
  }
});

router.delete("/history/:userId/:sessionId", async (req, res) => {
  const { userId, sessionId } = req.params;
  try {
    await deleteConversation(userId, sessionId);
    clearSession(sessionId); // also evict from memory cache
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   NEW SESSION ROUTE — call this when user starts a fresh chat
   ═══════════════════════════════════════════════════════════════════════════ */

router.post("/new-session", (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) clearSession(sessionId);
  const newSessionId = `session_${Date.now()}`;
  res.json({ sessionId: newSessionId });
});

module.exports = router;