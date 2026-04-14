"use strict";

const axios = require("axios");

function detectLargeCodeRequest(message) {
  if (!message) return null;
  const m = message.toLowerCase();
  const locMatch = m.match(/\b(\d{2,4})\s*(lines?|loc|line of code)\b/);
  if (locMatch) return { requestedLines: parseInt(locMatch[1]) };
  if (/\b(full|complete|entire|whole|production.?ready|real.?world)\b/.test(m)) return { requestedLines: 200 };
  return null;
}

function detectLanguage(message) {
  if (!message) return "javascript";
  const m = message.toLowerCase();
  if (/\bpython\b/.test(m))     return "python";
  if (/\btypescript\b/.test(m)) return "typescript";
  if (/\bjava\b/.test(m))       return "java";
  if (/\bc\+\+\b/.test(m))      return "cpp";
  if (/\bruby\b/.test(m))       return "ruby";
  if (/\bgo\b/.test(m))         return "go";
  if (/\brust\b/.test(m))       return "rust";
  if (/\bphp\b/.test(m))        return "php";
  if (/\bswift\b/.test(m))      return "swift";
  if (/\bkotlin\b/.test(m))     return "kotlin";
  if (/\bbash\b/.test(m))       return "bash";
  if (/\bsql\b/.test(m))        return "sql";
  if (/\bcss\b/.test(m))        return "css";
  if (/\bhtml\b/.test(m))       return "html";
  return "javascript";
}

async function generateLargeCode(prompt, socketIo, socketId, options = {}) {
  const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
  const language     = options.language || "javascript";
  const requestedLines = options.requestedLines || 100;

  if (!DEEPSEEK_KEY) throw new Error("DEEPSEEK_API_KEY not set");

  if (socketIo && socketId) {
    socketIo.to(socketId).emit("code_progress", { percent: 20, message: "🔧 Generating code..." });
  }

  const res = await axios.post("https://api.deepseek.com/chat/completions", {
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: `You are an expert ${language} developer. Write complete, production-ready, well-commented code. No stubs, no placeholders. Output ONLY the code, no explanation.`,
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens:  8000,
    stream:      false,
  }, {
    headers: { "Authorization": "Bearer " + DEEPSEEK_KEY, "Content-Type": "application/json" },
    timeout: 120000,
  });

  if (socketIo && socketId) {
    socketIo.to(socketId).emit("code_progress", { percent: 90, message: "✅ Done!" });
  }

  let code = res.data?.choices?.[0]?.message?.content || "";
  code = code.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  code = code.replace(/^```[\w]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  const lines    = code.split("\n").length;
  const kb       = (Buffer.byteLength(code, "utf8") / 1024).toFixed(1);
  const extMap   = { javascript: "js", typescript: "ts", python: "py", java: "java", cpp: "cpp", ruby: "rb", go: "go", rust: "rs", php: "php", swift: "swift", kotlin: "kt", bash: "sh", sql: "sql", css: "css", html: "html" };
  const filename = `code.${extMap[language] || "txt"}`;

  return { code, language, lines, kb, filename };
}

module.exports = { generateLargeCode, detectLargeCodeRequest, detectLanguage };