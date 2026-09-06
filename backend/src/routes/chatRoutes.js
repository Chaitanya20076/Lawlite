const express = require("express");

const {
  generateChatResponse,
  generateChatTitle,
} = require("../services/sarvamService");

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
        message: "Conversation must be an array.",
      });
    }

    if (conversation.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Conversation cannot be empty.",
      });
    }

    const cleanConversation = conversation
      .filter(
        (message) =>
          message &&
          ["user", "assistant"].includes(
            message.role
          ) &&
          typeof message.content === "string"
      )
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }))
      .filter(
        (message) =>
          message.content.length > 0
      );

    if (cleanConversation.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid messages were provided.",
      });
    }

    const answer =
      await generateChatResponse({
        conversation: cleanConversation,
      });

    return res.json({
      success: true,
      message: answer,
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


module.exports = router;