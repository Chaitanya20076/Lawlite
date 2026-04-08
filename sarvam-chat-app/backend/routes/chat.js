const express = require("express");
const router = express.Router();
const axios = require("axios");
const path = require("path");
const upload = require("../middleware/upload");
const extractText = require("../services/fileParser");

const { chat } = require("../services/sarvamService");
const searchWeb = require("../services/tavilyService");
const { fetchContextualImages, isVisualWorthy } = require("../services/mediaService");
const { generateDocument, detectDocumentRequest } = require("../services/documentService");

// ================= MAIN CHAT ROUTE =================
router.post("/", upload.array("files"), async (req, res) => {
  console.log("FILES RECEIVED:", req.files?.length || 0);

  const { message, userId } = req.body;
  const web = req.body.web === "true";

  // ── Check if this is a document generation request ──
  const { isDocRequest, docType, topic } = detectDocumentRequest(message || "");
  if (isDocRequest) {
    // Redirect to doc generation flow
    return res.json({
      reply: `📄 Generating your **${docType.toUpperCase()}** on "${topic}"...\n\nI'll build this now — it'll be ready in a moment.`,
      isDocRequest: true,
      docType,
      topic,
      requestId: `doc_${Date.now()}`,
    });
  }

  let documentText = "";

  // ── Handle uploaded files ──
  if (req.files && req.files.length > 0) {
    console.log("📂 Processing uploaded files...");
    for (const file of req.files) {
      try {
        const text = await extractText(file);
        documentText += "\n\n--- FILE: " + file.originalname + " ---\n" + text;
      } catch (err) {
        console.error(`File parse error (${file.originalname}):`, err.message);
      }
    }
  }

  console.log("WEB FLAG:", web);

  try {
    let enhancedPrompt = message;

    // ── Web search augmentation ──
    if (web) {
      console.log("🌐 Using Tavily search...");
      const webData = await searchWeb(message);

      if (webData && webData.results) {
        const context = webData.results
          .slice(0, 3)
          .map(r => {
            const trimmed = r.content.slice(0, 300);
            return `Source: ${r.url}\n${trimmed}`;
          })
          .join("\n\n");

        enhancedPrompt = `
User Question:
${message.slice(0, 1000)}

Relevant Web Information:
${context}

Instructions:
Use this information ONLY if it improves accuracy.
Otherwise ignore it.
`;
      }
    }

    // ── AI response ──
    const result = await chat({
      userMessage: enhancedPrompt,
      documentText,
      documentName: "User Upload",
      sessionId: userId || `session_${Date.now()}`,
      userId: userId || "anonymous",
    });

    let reply = result.text || "No response from LAWLite";
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    // ── Fetch contextual images if reply is visual-worthy ──
    let images = [];
    if (process.env.PEXELS_API_KEY && isVisualWorthy(reply)) {
      images = await fetchContextualImages({
        replyText: reply,
        userMessage: message,
        count: 3,
      });
    }

    res.json({ reply, images });

  } catch (err) {
    console.error("CHAT ERROR:", err);
    res.status(500).json({ error: "Server error", reply: "⚠️ Something went wrong. Please try again." });
  }
});

// ================= DOCUMENT GENERATION ROUTE =================
router.post("/generate-doc", async (req, res) => {
  const { userMessage, userId } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: "No message provided" });
  }

  console.log("📄 Document generation request:", userMessage.slice(0, 80));

  try {
    const result = await generateDocument({
      userMessage,
      extraContext: "",
    });

    // Set download headers
    res.setHeader("Content-Type", result.mimeType || "application/pdf");
res.setHeader("Content-Transfer-Encoding", "binary");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.setHeader("X-Doc-Title", encodeURIComponent(result.title));
    res.setHeader("X-Doc-Type", result.docType);
    res.setHeader("X-Doc-Slides", result.slideCount || "");
    res.setHeader("X-Doc-Sections", result.sectionCount || "");
    res.setHeader("X-Live-Code", encodeURIComponent(result.liveCode || ""));

    res.send(result.buffer);

  } catch (err) {
    console.error("DOC GEN ERROR:", err);
    res.status(500).json({
      error: "Document generation failed",
      message: err.message,
    });
  }
});

// ================= IMAGE SEARCH ROUTE =================
router.post("/images", async (req, res) => {
  const { query, replyText } = req.body;

  if (!process.env.PEXELS_API_KEY) {
    return res.status(503).json({ images: [], error: "Pexels not configured" });
  }

  try {
    const images = await fetchContextualImages({
      replyText: replyText || query || "",
      userMessage: query || "",
      count: 4,
      query: query || null,
    });

    res.json({ images });
  } catch (err) {
    console.error("IMAGE SEARCH ERROR:", err);
    res.json({ images: [] });
  }
});

// ================= 🔊 TTS ROUTE =================
router.post("/tts", async (req, res) => {
  try {
    const text = req.body.text;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    console.log("🔊 TTS REQUEST TEXT:", text.slice(0, 50));

    const response = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}`,
      headers: {
        "xi-api-key": process.env.ELEVEN_API_KEY,
        "Content-Type": "application/json",
      },
      data: {
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.85,
        },
      },
      responseType: "arraybuffer",
    });

    console.log("✅ TTS SUCCESS");
    res.set({ "Content-Type": "audio/mpeg" });
    res.send(response.data);

  } catch (err) {
    console.error("❌ TTS ERROR:", err.response?.data?.toString() || err.message);
    res.status(500).json({ error: "TTS failed" });
  }
});

module.exports = router;