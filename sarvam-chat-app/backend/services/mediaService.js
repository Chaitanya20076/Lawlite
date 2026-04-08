/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           LAWLITE — mediaService.js                         ║
 * ║     Pexels API integration for contextual legal images      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Fetches relevant images from Pexels based on AI reply context.
 * Returns curated image sets with attribution data.
 */

"use strict";

const axios = require("axios");

const PEXELS_BASE = "https://api.pexels.com/v1";
const REQUEST_TIMEOUT = 10_000;

// ─────────────────────────────────────────────
//  LEGAL TOPIC → SEARCH QUERY MAPPER
//  Maps legal intent/keywords to better Pexels search terms
// ─────────────────────────────────────────────

const LEGAL_VISUAL_MAP = {
  // Document types
  "nda": "business contract signing",
  "contract": "business contract desk",
  "agreement": "handshake business deal",
  "lease": "apartment keys property",
  "employment": "office workplace professional",
  "gdpr": "data privacy digital security",
  "compliance": "law books legal documents",
  "court": "courtroom justice law",
  "trademark": "intellectual property creative",
  "patent": "innovation invention technology",
  "privacy": "digital privacy security laptop",
  "arbitration": "negotiation mediation table",
  "litigation": "courthouse legal justice",
  "tenant": "apartment building rental",
  "landlord": "property real estate",
  "consumer": "shopping retail consumer rights",
  "startup": "startup office entrepreneur",
  "ip": "creative intellectual property",
  "will": "estate planning documents",
  "deed": "property documents keys",
  "default": "legal justice scales law",
};

/**
 * Extracts the best Pexels search query from AI reply text.
 * @param {string} replyText
 * @param {string} userMessage
 * @returns {string} search query
 */
function extractSearchQuery(replyText, userMessage = "") {
  const combined = (replyText + " " + userMessage).toLowerCase();

  for (const [keyword, query] of Object.entries(LEGAL_VISUAL_MAP)) {
    if (keyword !== "default" && combined.includes(keyword)) {
      return query;
    }
  }

  // Try to extract nouns from the message
  const legalTerms = combined.match(
    /\b(contract|law|legal|court|judge|agreement|rights|property|business|document|compliance|regulation|act|section)\b/g
  );

  if (legalTerms && legalTerms.length > 0) {
    const unique = [...new Set(legalTerms)].slice(0, 2);
    return unique.join(" ") + " professional";
  }

  return LEGAL_VISUAL_MAP.default;
}

/**
 * Fetches contextual images from Pexels for a given legal reply.
 *
 * @param {object} opts
 * @param {string} opts.replyText      - The AI reply to extract context from
 * @param {string} [opts.userMessage]  - Original user message for extra context
 * @param {number} [opts.count]        - Number of images to return (default: 3)
 * @param {string} [opts.query]        - Override the auto-detected query
 *
 * @returns {Promise<Array<{
 *   id: number,
 *   url: string,
 *   thumb: string,
 *   medium: string,
 *   photographer: string,
 *   photographerUrl: string,
 *   pexelsUrl: string,
 *   alt: string,
 *   width: number,
 *   height: number,
 * }>>}
 */
async function fetchContextualImages({
  replyText,
  userMessage = "",
  count = 3,
  query = null,
}) {
  try {
    const searchQuery = query || extractSearchQuery(replyText, userMessage);

    console.log(`[MediaService] Fetching Pexels images for: "${searchQuery}"`);

    const response = await axios.get(`${PEXELS_BASE}/search`, {
      headers: {
        Authorization: process.env.PEXELS_API_KEY,
      },
      params: {
        query: searchQuery,
        per_page: Math.min(count * 2, 10), // fetch extra, filter best
        orientation: "landscape",
        size: "medium",
      },
      timeout: REQUEST_TIMEOUT,
    });

    const photos = response.data?.photos || [];

    if (photos.length === 0) {
      console.warn(`[MediaService] No Pexels results for: "${searchQuery}"`);
      return [];
    }

    // Map to clean format, take first `count`
    return photos.slice(0, count).map((photo) => ({
      id: photo.id,
      url: photo.src.original,
      thumb: photo.src.tiny,
      medium: photo.src.medium,
      large: photo.src.large,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      pexelsUrl: photo.url,
      alt: photo.alt || searchQuery,
      width: photo.width,
      height: photo.height,
    }));
  } catch (err) {
    console.error("[MediaService] Pexels fetch error:", err.response?.data || err.message);
    return []; // fail silently — images are supplementary
  }
}

/**
 * Quick single image fetch for document covers / thumbnails.
 * @param {string} topic
 * @returns {Promise<object|null>}
 */
async function fetchCoverImage(topic) {
  const results = await fetchContextualImages({
    replyText: topic,
    userMessage: topic,
    count: 1,
  });
  return results[0] || null;
}

/**
 * Determines if a reply is "visual-worthy" — should we show images?
 * We show images for substantive answers, not short conversational replies.
 * @param {string} replyText
 * @returns {boolean}
 */
function isVisualWorthy(replyText) {
  // Show images for replies that are reasonably detailed
  const wordCount = replyText.trim().split(/\s+/).length;
  if (wordCount < 80) return false;

  // Must mention legal/professional content
  const hasLegalContent = /\b(contract|agreement|clause|law|act|section|rights|compliance|gdpr|nda|court|legal|document|policy)\b/i.test(replyText);

  return hasLegalContent;
}

module.exports = {
  fetchContextualImages,
  fetchCoverImage,
  extractSearchQuery,
  isVisualWorthy,
};