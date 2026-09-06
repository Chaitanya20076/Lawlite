const express = require("express");

const {
  shouldSearchWeb,
  generateChatResponse,
  generateChatTitle,
} = require("../services/sarvamService");

const {
  searchWeb,
} = require("../services/serperService");

const router = express.Router();


// ==========================================
// CHAT RESPONSE
// ==========================================

router.post("/", async (req, res) => {
  try {
    const {
      conversation = [],
    } = req.body;

    if (!Array.isArray(conversation)) {
      return res.status(400).json({
        success: false,
        message:
          "Conversation must be an array.",
      });
    }

    if (conversation.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Conversation cannot be empty.",
      });
    }

    const cleanConversation =
      conversation
        .filter(
          (message) =>
            message &&
            ["user", "assistant"].includes(
              message.role
            ) &&
            typeof message.content ===
              "string"
        )
        .map((message) => ({
          role: message.role,
          content:
            message.content.trim(),
        }))
        .filter(
          (message) =>
            message.content.length > 0
        );

    if (cleanConversation.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No valid messages were provided.",
      });
    }


    // ========================================
    // FIND THE LATEST USER MESSAGE
    // ========================================

    const latestUserMessage =
      [...cleanConversation]
        .reverse()
        .find(
          (message) =>
            message.role === "user"
        );

    if (!latestUserMessage) {
      return res.status(400).json({
        success: false,
        message:
          "A user message is required.",
      });
    }


    // ========================================
    // DECIDE WHETHER WEB SEARCH IS NEEDED
    // ========================================

    const needsWebSearch =
  shouldSearchWeb(
    latestUserMessage.content
  );


    // ========================================
    // SEARCH WEB IF NEEDED
    // ========================================

    let webContext = null;

    if (needsWebSearch) {
      console.log(
        "🌐 Lawlite web search:",
        latestUserMessage.content
      );

      const searchResults =
        await searchWeb({
          query:
            latestUserMessage.content,
          num: 5,
        });

      const organicResults =
        searchResults?.organic || [];

      webContext =
        organicResults
          .map(
            (result, index) =>
              `SOURCE ${index + 1}
Title: ${result.title || ""}
URL: ${result.link || ""}
Snippet: ${result.snippet || ""}`
          )
          .join("\n\n");

      if (!webContext) {
        webContext =
          "No useful web results were found.";
      }
    }


    // ========================================
    // GENERATE FINAL SARVAM RESPONSE
    // ========================================

    const answer =
      await generateChatResponse({
        conversation:
          cleanConversation,

        webResults:
          webContext,
      });


    return res.json({
      success: true,
      message: answer,

      webSearchUsed:
        needsWebSearch,
    });

  } catch (error) {
    console.error(
      "Chat route error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate a response right now.",
    });
  }
});


// ==========================================
// CHAT TITLE
// ==========================================

router.post("/title", async (req, res) => {
  try {
    const {
      message,
    } = req.body;

    if (
      !message ||
      typeof message !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    const title =
      await generateChatTitle({
        firstMessage: message.trim(),
      });

    return res.json({
      success: true,
      title,
    });

  } catch (error) {
    console.error(
      "Chat title error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate chat title.",
    });
  }
});

// ==========================================
// TEMPORARY WEB SEARCH TEST
// ==========================================

router.post("/web-search", async (req, res) => {
  try {
    const { query } = req.body;

    if (
      !query ||
      typeof query !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Search query is required.",
      });
    }

    const results = await searchWeb({
      query: query.trim(),
      num: 5,
    });

    return res.json({
      success: true,
      results,
    });

  } catch (error) {
    console.error(
      "Web search route error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to search the web right now.",
    });
  }
});
module.exports = router;