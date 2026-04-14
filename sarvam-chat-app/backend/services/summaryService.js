/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           LAWLITE — summaryService.js                       ║
 * ║     AI-powered conversation summarization                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use strict";

const axios = require("axios");

const SARVAM_API_BASE = "https://api.sarvam.ai";
const SARVAM_MODEL    = "sarvam-m";

/**
 * Uses Sarvam AI to summarize a conversation into a short title + summary.
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} jurisdiction
 * @returns {Promise<{ title: string, summary: string }>}
 */
async function summarizeConversation(messages, jurisdiction = "India") {
  try {
    // Build a readable transcript
    const transcript = messages
      .slice(-12) // last 12 messages max for summary context
      .map(m => `${m.role === "user" ? "User" : "LawLite"}: ${m.content.slice(0, 300)}`)
      .join("\n");

    const prompt = `You are a legal conversation summarizer. 
    
Given this conversation transcript, generate:
1. A short title (max 6 words, like "Bangalore Landlord Deposit Dispute")
2. A 2-3 sentence plain English summary of what was discussed and what advice was given.

Conversation:
${transcript}

Jurisdiction: ${jurisdiction}

Respond ONLY in this exact JSON format, nothing else:
{"title": "short title here", "summary": "2-3 sentence summary here"}`;

    const response = await axios.post(
      `${SARVAM_API_BASE}/v1/chat/completions`,
      {
        model      : SARVAM_MODEL,
        messages   : [{ role: "user", content: prompt }],
        max_tokens : 300,
        temperature: 0.3,
      },
      {
        headers: {
          Authorization : `Bearer ${process.env.SARVAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30_000,
      }
    );

    const raw = response.data?.choices?.[0]?.message?.content || "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed  = JSON.parse(cleaned);

    return {
      title  : parsed.title   || "Legal Conversation",
      summary: parsed.summary || "Legal matter discussed.",
    };
  } catch (err) {
    console.error("[SummaryService] Summarization failed:", err.message);
    // Fallback — don't crash, just use generic title
    return {
      title  : "Legal Conversation",
      summary: "A legal matter was discussed.",
    };
  }
}

module.exports = { summarizeConversation };