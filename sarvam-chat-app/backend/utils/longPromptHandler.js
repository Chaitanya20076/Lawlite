"use strict";

/**
 * longPromptHandler.js
 * Expands [ATTACHMENT:N] tokens in conversation history
 * with actual file content stored in memory.
 */

// In-memory store: attachmentId → text content
const attachmentStore = new Map();

/**
 * Store extracted file text so it can be referenced by ID.
 * Call this after parsing an uploaded file.
 * @param {string} id   - e.g. "1", "2" (matches [ATTACHMENT:1])
 * @param {string} text - extracted plain text from the file
 */
function storeAttachment(id, text) {
  attachmentStore.set(String(id), text);
}

/**
 * Expand [ATTACHMENT:N] tokens in every message's content
 * with the real file text, so the AI sees the full document.
 * @param {Array} conversationHistory - array of {role, content} objects
 * @returns {Array} - new array with attachments expanded inline
 */
function loadAttachedContent(conversationHistory) {
  if (!Array.isArray(conversationHistory)) return conversationHistory;

  return conversationHistory.map(msg => {
    const content = String(msg.content || "");

    // Replace every [ATTACHMENT:N] with stored text
    const expanded = content.replace(/\[ATTACHMENT:(\d+)\]/g, (match, id) => {
      const text = attachmentStore.get(id);
      if (!text) return match; // leave token if not found
      return `\n\n--- ATTACHED CONTENT (file ${id}) ---\n${text}\n--- END ATTACHED CONTENT ---\n`;
    });

    if (expanded === content) return msg; // nothing changed
    return { ...msg, content: expanded };
  });
}

/**
 * Clear all stored attachments (call on new session if needed).
 */
function clearAttachments() {
  attachmentStore.clear();
}

module.exports = {
  storeAttachment,
  loadAttachedContent,
  clearAttachments,
};