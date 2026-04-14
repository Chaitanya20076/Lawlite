"use strict";

const axios = require("axios");

async function searchWeb(query) {
  const TAVILY_KEY = process.env.TAVILY_API_KEY;
  const SERPER_KEY = process.env.SERPER_API_KEY;

  if (TAVILY_KEY) {
    try {
      const res = await axios.post("https://api.tavily.com/search", {
        api_key: TAVILY_KEY,
        query,
        search_depth: "basic",
        max_results: 6,
        include_answer: true,
      }, { timeout: 10000 });

      const results = (res.data.results || []).map(r => ({
        title:   r.title   || "",
        url:     r.url     || "",
        snippet: r.content ? r.content.slice(0, 300) : "",
        source:  r.url     || "",
        date:    r.published_date || "",
        type:    "organic",
      }));

      if (res.data.answer) {
        results.unshift({ title: "Direct Answer", snippet: res.data.answer, url: "", type: "answer_box" });
      }

      return { success: true, results, query };
    } catch (err) {
      console.warn("[WebSearch] Tavily failed:", err.message);
    }
  }

  if (SERPER_KEY) {
    try {
      const res = await axios.post("https://google.serper.dev/search", { q: query }, {
        headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
        timeout: 10000,
      });

      const results = (res.data.organic || []).slice(0, 6).map(r => ({
        title:   r.title   || "",
        url:     r.link    || "",
        snippet: r.snippet || "",
        source:  r.link    || "",
        date:    r.date    || "",
        type:    "organic",
      }));

      if (res.data.answerBox?.answer) {
        results.unshift({ title: "Direct Answer", snippet: res.data.answerBox.answer, url: "", type: "answer_box" });
      }

      return { success: true, results, query };
    } catch (err) {
      console.warn("[WebSearch] Serper failed:", err.message);
    }
  }

  return { success: false, results: [], query };
}

function formatSearchResultsForAI(searchData) {
  if (!searchData.success || !searchData.results.length) return "";
  return searchData.results.map((r, i) => {
    const parts = [];
    if (r.title)   parts.push(`[${i + 1}] ${r.title}`);
    if (r.url)     parts.push(`URL: ${r.url}`);
    if (r.snippet) parts.push(r.snippet);
    if (r.date)    parts.push(`Date: ${r.date}`);
    return parts.join("\n");
  }).join("\n\n");
}

module.exports = { searchWeb, formatSearchResultsForAI };