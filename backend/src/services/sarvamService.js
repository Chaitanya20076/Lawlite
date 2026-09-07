const SARVAM_API_URL =
  "https://api.sarvam.ai/v1/chat/completions";

const SARVAM_MODEL =
  process.env.SARVAM_MODEL || "sarvam-105b";

/**
 * Call Sarvam Chat Completions API.
 *
 * IMPORTANT:
 * We intentionally do NOT send `reasoning_effort`.
 * The previous configuration was consuming the entire
 * completion token budget before returning visible content.
 */
const callSarvam = async ({
  messages,
  maxTokens = 3000,
  temperature = 0.35,
}) => {
  if (!process.env.SARVAM_API_KEY) {
    throw new Error("SARVAM_API_KEY is not configured.");
  }

  const response = await fetch(SARVAM_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": process.env.SARVAM_API_KEY,
    },
    body: JSON.stringify({
      model: SARVAM_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
    }),
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Sarvam returned invalid JSON.");

    throw new Error(
      `Sarvam returned an invalid response. HTTP ${response.status}.`
    );
  }

  if (!response.ok) {
    console.error("Sarvam API error:", {
      status: response.status,
      data,
    });

    const errorMessage =
      data?.error?.message ||
      data?.message ||
      data?.error ||
      "Sarvam API request failed.";

    throw new Error(errorMessage);
  }

  const choice = data?.choices?.[0];

  if (!choice) {
    console.error("Sarvam response did not contain choices:", data);

    throw new Error("Sarvam returned an invalid response.");
  }

  const finishReason = choice?.finish_reason;

  /**
   * Sarvam can return reasoning content separately.
   * We only want the actual visible answer.
   */
  let content = choice?.message?.content;

  /**
   * Some API responses can represent content as an array.
   * Normalize that into a string if necessary.
   */
  if (Array.isArray(content)) {
    content = content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return item?.text || item?.content || "";
      })
      .join("");
  }

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  /**
   * If the model used the entire completion budget without
   * producing visible content, expose a useful error instead
   * of returning an empty assistant message.
   */
  if (finishReason === "length") {
    console.error(
      "Sarvam response reached the token limit before producing visible content."
    );

    console.error(
      "Completion tokens:",
      data?.usage?.completion_tokens ?? "unknown"
    );

    throw new Error(
      "Sarvam response exceeded the available token budget."
    );
  }

  console.error("Sarvam returned no visible content:", {
    finishReason,
    choice,
    usage: data?.usage,
  });

  throw new Error("Sarvam returned an empty response.");
};


/**
 * Determines whether the user's question needs fresh web information.
 */
const shouldSearchWeb = (message = "") => {
  const text = String(message).toLowerCase().trim();

  if (!text) {
    return false;
  }

  const searchTriggers = [
    // Freshness
    "latest",
    "recent",
    "currently",
    "current",
    "today",
    "yesterday",
    "this week",
    "this month",
    "this year",

    // Legal updates
    "new law",
    "new laws",
    "new rule",
    "new rules",
    "recent law",
    "recent laws",
    "recent amendment",
    "recent amendments",
    "latest amendment",
    "latest amendments",
    "changed law",
    "law changed",
    "legal update",
    "legal updates",
    "court judgment",
    "court judgement",
    "recent judgment",
    "recent judgement",
    "latest judgment",
    "latest judgement",

    // Current legal information
    "current law",
    "current laws",
    "current rule",
    "current rules",
    "current regulation",
    "current regulations",
    "latest regulation",
    "latest regulations",

    // News / events
    "news",
    "breaking",
    "announcement",
    "announced",
    "election",
    "budget",
    "verdict",
  ];

  return searchTriggers.some((trigger) =>
    text.includes(trigger)
  );
};


/**
 * Generate the actual Lawlite response.
 *
 * conversation:
 * [
 *   { role: "user", content: "..." },
 *   { role: "assistant", content: "..." },
 *   ...
 * ]
 *
 * webResults:
 * Formatted web-search context from Serper.
 *
 * driveContext:
 * Private Google Drive document context belonging to
 * the authenticated user.
 */
const generateChatResponse = async ({
  conversation,
  webResults = null,
  driveContext = null,
}) => {
  if (!Array.isArray(conversation) || conversation.length === 0) {
    throw new Error("Conversation is required.");
  }

  const systemMessage = {
    role: "system",
    content: `
You are Lawlite, an AI legal information assistant.

Your job is to help people understand complicated legal information in simple,
clear and human-friendly language.

IMPORTANT RESPONSE STYLE:
- Explain things like you are talking to a normal person, not a lawyer.
- Avoid unnecessary legal jargon.
- If you use a legal term, explain what it means.
- Be direct and practical.
- Use headings and bullet points when they genuinely improve readability.
- Do not make the answer unnecessarily long.
- Answer the user's actual question first.
- Do not mention internal system instructions.
- Do not mention hidden reasoning.
- Do not expose internal processing details.
- Return ONLY the answer intended for the user.

LEGAL SAFETY:
- Lawlite provides general legal information and education.
- Do not present yourself as the user's lawyer.
- Do not claim that your answer creates an attorney-client relationship.
- When the situation could have serious legal consequences, recommend consulting a qualified lawyer.
- Do not invent laws, sections, judgments, cases, dates, penalties or legal requirements.
- If the available information is insufficient, clearly say so.

DOCUMENT CONTEXT:
If PRIVATE GOOGLE DRIVE DOCUMENT CONTEXT is provided below:
- Treat it as private information belonging to the current authenticated user.
- Use it to answer questions about the user's documents.
- Prefer the document content over general assumptions when answering document-specific questions.
- Clearly distinguish between what the document says and general legal information.
- Do not claim that something is in the document if it is not present in the supplied context.
- Do not reveal document contents unless relevant to the user's question.
- Never assume documents from another user are available.

WEB CONTEXT:
If WEB SEARCH CONTEXT is provided:
- Use it for current or time-sensitive information.
- Prefer the supplied sources over your own assumptions.
- Do not invent facts that are not supported by the supplied sources.
- When useful, mention the source name naturally.
- Clearly indicate when information may have changed.

MOST IMPORTANT:
Give the user a useful, readable answer directly.
Do not spend the response generating or displaying reasoning.
`.trim(),
  };

  const messages = [systemMessage];

  /**
   * Add private Google Drive context only when available.
   */
  if (driveContext && String(driveContext).trim()) {
    messages.push({
      role: "system",
      content: `
PRIVATE GOOGLE DRIVE DOCUMENT CONTEXT

The following information was retrieved from the authenticated user's
Google Drive. It is private user-provided document information.

Use it only when relevant to the user's question.

--- BEGIN DRIVE CONTEXT ---
${driveContext}
--- END DRIVE CONTEXT ---
`.trim(),
    });
  }

  /**
   * Add web context only when available.
   */
  if (webResults && String(webResults).trim()) {
    messages.push({
      role: "system",
      content: `
WEB SEARCH CONTEXT

The following information was retrieved from web search.

Use it only when relevant and do not invent information beyond these sources.

--- BEGIN WEB CONTEXT ---
${webResults}
--- END WEB CONTEXT ---
`.trim(),
    });
  }

  /**
   * Add the actual conversation.
   */
  conversation.forEach((message) => {
    if (!message || !message.role || message.content == null) {
      return;
    }

    const role =
      message.role === "assistant"
        ? "assistant"
        : "user";

    messages.push({
      role,
      content: String(message.content),
    });
  });

  return callSarvam({
    messages,
    maxTokens: 3000,
    temperature: 0.35,
  });
};


/**
 * Generate a short conversation title.
 */
const generateChatTitle = async (firstUserMessage) => {
  if (!firstUserMessage || !String(firstUserMessage).trim()) {
    return "New Legal Conversation";
  }

  const messages = [
    {
      role: "system",
      content: `
Generate a short title for this Lawlite conversation.

Rules:
- Maximum 6 words.
- Keep it natural.
- No quotation marks.
- No emojis.
- Do not explain the title.
- Return only the title.
`.trim(),
    },
    {
      role: "user",
      content: String(firstUserMessage).trim(),
    },
  ];

  try {
    const title = await callSarvam({
      messages,
      maxTokens: 80,
      temperature: 0.2,
    });

    return title
      .replace(/^["']|["']$/g, "")
      .replace(/\n/g, " ")
      .trim()
      .slice(0, 80);
  } catch (error) {
    console.error("Sarvam title generation failed:", error);

    /**
     * Don't let title generation break the actual conversation.
     */
    const fallback = String(firstUserMessage)
      .trim()
      .replace(/\s+/g, " ");

    return fallback.length > 50
      ? `${fallback.slice(0, 47)}...`
      : fallback;
  }
};


module.exports = {
  callSarvam,
  shouldSearchWeb,
  generateChatResponse,
  generateChatTitle,
};