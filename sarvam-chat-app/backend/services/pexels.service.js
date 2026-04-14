"use strict";

const axios = require("axios");

async function fetchPexelsImages(query, count = 3, orientation = "landscape") {
  const KEY = process.env.PEXELS_API_KEY;
  if (!KEY) return [];
  try {
    const res = await axios.get("https://api.pexels.com/v1/search", {
      headers: { Authorization: KEY },
      params: { query, per_page: count, orientation },
      timeout: 8000,
    });
    return (res.data.photos || []).map(p => ({
      url:             p.src.medium,
      medium:          p.src.medium,
      large:           p.src.large,
      photographer:    p.photographer,
      photographerUrl: p.photographer_url,
      pexelsUrl:       p.url,
      alt:             p.alt || query,
    }));
  } catch (err) {
    console.warn("[Pexels] fetchPexelsImages failed:", err.message);
    return [];
  }
}

function formatPexelsBlock(images) {
  if (!images || images.length === 0) return "";
  const items = images.map(img =>
    `[PEXELS_IMG url="${img.url}" large="${img.large}" photographer="${img.photographer}" photographerUrl="${img.photographerUrl}" pexelsUrl="${img.pexelsUrl}" alt="${img.alt}"]`
  ).join("\n");
  return `[PEXELS_IMAGES]\n${items}\n[/PEXELS_IMAGES]\n\n`;
}

async function getContextualImages(userMessage, webDecision, webContext) {
  const KEY = process.env.PEXELS_API_KEY;
  if (!KEY) return "";

  const visualCategories = ["REALTIME", "FACTUAL", "RESEARCH", "CONCEPT"];
  if (!visualCategories.includes(webDecision?.category)) return "";

  const skipPatterns = /\b(code|function|script|algorithm|law|legal|contract|clause|section|ipc|crpc|fir|bns|court|judge|lawyer|advocate|tax|gst|compliance|gdpr|privacy|policy|regulation|act|rule|statute)\b/i;
  if (skipPatterns.test(userMessage)) return "";

  const photoPatterns = /\b(show|photo|picture|image|what does|look like|landscape|wildlife|nature|city|food|travel|space|animal|plant|architecture|art)\b/i;
  if (!photoPatterns.test(userMessage)) return "";

  const subjectMatch = userMessage.match(/(?:show me |photos? of |picture of |image of )?([a-zA-Z\s]{4,40})/i);
  const subject = subjectMatch ? subjectMatch[1].trim() : userMessage.slice(0, 40);

  const images = await fetchPexelsImages(subject, 3, "landscape");
  return images.length > 0 ? formatPexelsBlock(images) : "";
}

module.exports = { fetchPexelsImages, formatPexelsBlock, getContextualImages };