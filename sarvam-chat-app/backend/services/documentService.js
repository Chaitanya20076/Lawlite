/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           LAWLITE — documentService.js                      ║
 * ║     DeepSeek-powered legal document generation engine       ║
 * ║     Generates PPT, PDF, DOCX with near-100% accuracy        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Flow:
 *  1. User asks "generate a PPT about GDPR compliance"
 *  2. DeepSeek generates structured JSON content
 *  3. We build the actual file (pptx / pdf / docx) from that JSON
 *  4. Return a download buffer + filename
 *
 * Dependencies:
 *   npm install pptxgenjs pdf-lib @pdf-lib/fontkit docx axios
 */

"use strict";

const axios = require("axios");
const PptxGenJS = require("pptxgenjs");
const { PDFDocument, StandardFonts, rgb, degrees } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  Packer,
} = require("docx");

// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────

const DEEPSEEK_BASE = "https://api.deepseek.com";
const DEEPSEEK_MODEL = "deepseek-chat";
const MAX_TOKENS = 8000;
const REQUEST_TIMEOUT = 120_000; // 2 minutes for large docs

// LawLite brand colours
const BRAND = {
  gold: "#C9A84C",
  goldRgb: [0.788, 0.659, 0.298],
  dark: "#0D0F11",
  darkRgb: [0.051, 0.059, 0.067],
  surface: "#13161A",
  surfaceRgb: [0.075, 0.086, 0.102],
  text: "#F0ECE4",
  textRgb: [0.941, 0.925, 0.894],
  muted: "#8A8A8A",
  mutedRgb: [0.541, 0.541, 0.541],
};

// ─────────────────────────────────────────────
//  INTENT DETECTION
// ─────────────────────────────────────────────

/**
 * Detects if the user is requesting a document and what kind.
 * @param {string} message
 * @returns {{ isDocRequest: boolean, docType: string|null, topic: string }}
 */
function detectDocumentRequest(message) {
  const msg = message.toLowerCase();

  const pptPatterns = /\b(make|create|generate|build|prepare|draft)\b.{0,40}\b(ppt|powerpoint|presentation|slides|deck)\b|\b(ppt|powerpoint|presentation|slides|deck)\b.{0,40}\b(on|about|for|covering)\b/i;
  const pdfPatterns = /\b(make|create|generate|build|prepare|draft)\b.{0,40}\b(pdf|report|summary|brief|guide|handbook)\b|\b(pdf|report|guide)\b.{0,40}\b(on|about|for)\b/i;
  const docxPatterns = /\b(make|create|generate|build|prepare|draft)\b.{0,40}\b(word|doc|docx|document|contract|agreement|letter|memo)\b/i;

  if (pptPatterns.test(message)) {
    return { isDocRequest: true, docType: "pptx", topic: extractTopic(message, "pptx") };
  }
  if (pdfPatterns.test(message)) {
    return { isDocRequest: true, docType: "pdf", topic: extractTopic(message, "pdf") };
  }
  if (docxPatterns.test(message)) {
    return { isDocRequest: true, docType: "docx", topic: extractTopic(message, "docx") };
  }

  return { isDocRequest: false, docType: null, topic: "" };
}

/**
 * Extracts the topic from the document request.
 * @param {string} message
 * @param {string} docType
 * @returns {string}
 */
function extractTopic(message, docType) {
  // Remove the doc type keywords and extract topic
  const cleaned = message
    .replace(/\b(make|create|generate|build|prepare|draft|give me|show me)\b/gi, "")
    .replace(/\b(ppt|powerpoint|presentation|slides|deck|pdf|report|guide|word|doc|docx|document|contract|agreement|letter|memo|a|an|the|me|on|about|for|covering)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "Legal Document";
}

// ─────────────────────────────────────────────
//  DEEPSEEK CONTENT GENERATOR
// ─────────────────────────────────────────────

/**
 * Calls DeepSeek to generate structured document content as JSON.
 * This is the core intelligence layer — near-100% accurate legal content.
 *
 * @param {string} topic
 * @param {string} docType  - "pptx" | "pdf" | "docx"
 * @param {string} [extraContext] - original user message for nuance
 * @returns {Promise<object>} structured content JSON
 */
async function generateDocumentContent(topic, docType, extraContext = "") {
  const prompts = {
    pptx: `You are a senior legal expert creating a professional PowerPoint presentation.

Topic: "${topic}"
Additional context: ${extraContext || "None"}

Generate a comprehensive, accurate presentation with 8-12 slides. Return ONLY valid JSON, no markdown, no preamble:

{
  "title": "Presentation title",
  "subtitle": "Professional subtitle",
  "author": "LawLite Legal Intelligence",
  "slides": [
    {
      "slideNumber": 1,
      "type": "title",
      "title": "Main title",
      "subtitle": "Subtitle text",
      "notes": "Speaker notes"
    },
    {
      "slideNumber": 2,
      "type": "content",
      "title": "Slide title",
      "bullets": ["Point 1", "Point 2", "Point 3"],
      "notes": "Speaker notes"
    },
    {
      "slideNumber": 3,
      "type": "two_column",
      "title": "Comparison slide title",
      "leftHeading": "Left column heading",
      "leftPoints": ["Point 1", "Point 2"],
      "rightHeading": "Right column heading",
      "rightPoints": ["Point 1", "Point 2"],
      "notes": "Speaker notes"
    }
  ],
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"]
}

Rules:
- All content must be legally accurate for Indian jurisdiction unless specified otherwise
- Use plain English — no unexplained jargon
- Each bullet point: max 15 words
- Include an agenda slide, content slides, and a conclusion slide
- Minimum 8 slides, maximum 12 slides
- Mix slide types: title, content, two_column
- IMPORTANT: Write ALL content in English only. Do not use any other language.`,

    pdf: `You are a senior legal expert creating a professional PDF report/guide.

Topic: "${topic}"
Additional context: ${extraContext || "None"}

Generate comprehensive, accurate content. Return ONLY valid JSON, no markdown, no preamble:

{
  "title": "Document title",
  "subtitle": "Professional subtitle",
  "author": "LawLite Legal Intelligence",
  "date": "${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}",
  "executiveSummary": "2-3 sentence executive summary of the entire document",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Detailed paragraph content. Can be 3-5 sentences.",
      "bullets": ["Optional bullet 1", "Optional bullet 2"],
      "subsections": [
        {
          "heading": "Subsection heading",
          "content": "Subsection content paragraph"
        }
      ]
    }
  ],
  "conclusion": "Concluding paragraph",
  "disclaimer": "This document is for informational purposes only and does not constitute legal advice. Consult a qualified lawyer for your specific situation.",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
}

Rules:
- All content must be legally accurate for Indian jurisdiction unless specified otherwise
- Minimum 5 sections, maximum 10 sections
- Each section should have substantive content (3-5 sentences minimum)
- Include relevant Indian laws, acts, sections where applicable
- IMPORTANT: Write ALL content in English only. Do not use any other language.`,

    docx: `You are a senior legal expert creating a professional Word document.

Topic: "${topic}"
Additional context: ${extraContext || "None"}

Generate comprehensive, accurate content. Return ONLY valid JSON, no markdown, no preamble:

{
  "title": "Document title",
  "subtitle": "Document type/description",
  "author": "LawLite Legal Intelligence",
  "date": "${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}",
  "sections": [
    {
      "heading": "Section heading",
      "level": 1,
      "content": "Section content paragraph. Multiple sentences.",
      "bullets": ["Optional bullet point 1", "Optional bullet point 2"],
      "subsections": [
        {
          "heading": "Sub-heading",
          "level": 2,
          "content": "Subsection content"
        }
      ]
    }
  ],
  "conclusion": "Concluding remarks",
  "disclaimer": "Legal disclaimer text"
}

Rules:
- Legally accurate for Indian jurisdiction unless specified otherwise
- Minimum 6 sections
- Professional formal language
- Include relevant legal citations where appropriate
- IMPORTANT: Write ALL content in English only. Do not use any other language.`,
  };

  const systemPrompt = `You are LawLite's document generation engine. You produce legally accurate, professionally structured content in perfect JSON format. You NEVER include markdown code fences, explanations, or any text outside the JSON object. Your output must be parseable by JSON.parse() directly. CRITICAL: Always respond in English only. Never use Chinese, Hindi, or any other language. All content must be in English.`;

  try {
    console.log(`[DocumentService] Calling DeepSeek for ${docType}: "${topic}"`);

    const response = await axios.post(
      `${DEEPSEEK_BASE}/chat/completions`,
      {
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompts[docType] || prompts.pdf },
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.3, // Low temperature = more consistent, accurate output
        response_format: { type: "json_object" }, // DeepSeek JSON mode
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: REQUEST_TIMEOUT,
      }
    );

    const rawText = response.data?.choices?.[0]?.message?.content || "";

    // Strip any accidental markdown fences
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();

    const content = JSON.parse(cleaned);
    console.log(`[DocumentService] Content generated: ${content.sections?.length || content.slides?.length} sections/slides`);
    return content;
  } catch (err) {
    console.error("[DocumentService] DeepSeek error:", err.response?.data || err.message);
    throw new Error(`Document content generation failed: ${err.message}`);
  }
}

// ─────────────────────────────────────────────
//  PPTX BUILDER
// ─────────────────────────────────────────────

/**
 * Builds a branded LawLite PowerPoint presentation.
 * @param {object} content - Generated JSON content
 * @returns {Promise<Buffer>}
 */
async function buildPptx(content) {
  const pptx = new PptxGenJS();

  // Document metadata
  pptx.title = content.title || "LawLite Presentation";
  pptx.subject = "Legal Intelligence";
  pptx.author = content.author || "LawLite";
  pptx.company = "LawLite Legal Intelligence";

  // Slide dimensions (widescreen 16:9)
  pptx.layout = "LAYOUT_WIDE";

  // ── Define master theme ──
  pptx.defineSlideMaster({
    title: "LAWLITE_MASTER",
    background: { color: "0D0F11" },
    objects: [
      // Bottom gold accent bar
      {
        rect: {
          x: 0,
          y: 6.9,
          w: "100%",
          h: 0.12,
          fill: { color: "C9A84C" },
        },
      },
      // Bottom brand text
      {
        text: {
          text: "LawLite Legal Intelligence  •  AI-Powered",
          options: {
            x: 0.3,
            y: 7.05,
            w: 6,
            h: 0.25,
            fontSize: 7,
            color: "555555",
            fontFace: "Calibri",
          },
        },
      },
      // Page number placeholder area
      {
        text: {
          text: "",
          options: {
            x: 8.5,
            y: 7.05,
            w: 1.5,
            h: 0.25,
            fontSize: 7,
            color: "555555",
            align: "right",
          },
        },
      },
    ],
  });

  // ── Process each slide ──
  for (const slide of content.slides || []) {
    const s = pptx.addSlide({ masterName: "LAWLITE_MASTER" });

    switch (slide.type) {
      // ── TITLE SLIDE ──
      case "title": {
        // Large decorative scales icon area (text-based)
        s.addText("⚖", {
          x: 0.4,
          y: 0.3,
          w: 1.2,
          h: 1.2,
          fontSize: 54,
          color: "C9A84C",
          align: "center",
        });

        // Title
        s.addText(slide.title || content.title, {
          x: 0.4,
          y: 1.6,
          w: 9.2,
          h: 1.8,
          fontSize: 42,
          bold: true,
          color: "F0ECE4",
          fontFace: "Georgia",
          italic: true,
          align: "center",
        });

        // Subtitle
        if (slide.subtitle || content.subtitle) {
          s.addText(slide.subtitle || content.subtitle, {
            x: 1,
            y: 3.5,
            w: 8,
            h: 0.6,
            fontSize: 18,
            color: "C9A84C",
            fontFace: "Calibri",
            align: "center",
          });
        }

        // Gold separator line
        s.addShape(pptx.ShapeType.rect, {
          x: 3,
          y: 4.2,
          w: 4,
          h: 0.04,
          fill: { color: "C9A84C" },
          line: { color: "C9A84C" },
        });

        // Author & date
        s.addText(
          `${content.author || "LawLite"}  •  ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long" })}`,
          {
            x: 1,
            y: 4.4,
            w: 8,
            h: 0.4,
            fontSize: 12,
            color: "8A8A8A",
            fontFace: "Calibri",
            align: "center",
          }
        );
        break;
      }

      // ── CONTENT SLIDE ──
      case "content": {
        // Gold left accent bar
        s.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 0,
          w: 0.08,
          h: 6.8,
          fill: { color: "C9A84C" },
          line: { color: "C9A84C" },
        });

        // Slide title
        s.addText(slide.title || "", {
          x: 0.3,
          y: 0.25,
          w: 9.4,
          h: 0.8,
          fontSize: 26,
          bold: true,
          color: "F0ECE4",
          fontFace: "Georgia",
          italic: true,
        });

        // Gold separator under title
        s.addShape(pptx.ShapeType.rect, {
          x: 0.3,
          y: 1.1,
          w: 9.2,
          h: 0.02,
          fill: { color: "C9A84C", transparency: 60 },
        });

        // Bullet points
        const bullets = slide.bullets || [];
        bullets.slice(0, 6).forEach((bullet, i) => {
          s.addText(`●  ${bullet}`, {
            x: 0.5,
            y: 1.3 + i * 0.85,
            w: 9,
            h: 0.75,
            fontSize: 16,
            color: "C8C4BC",
            fontFace: "Calibri",
            breakLine: false,
          });
        });
        break;
      }

      // ── TWO COLUMN SLIDE ──
      case "two_column": {
        // Title
        s.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 0,
          w: 0.08,
          h: 6.8,
          fill: { color: "C9A84C" },
          line: { color: "C9A84C" },
        });

        s.addText(slide.title || "", {
          x: 0.3,
          y: 0.25,
          w: 9.4,
          h: 0.8,
          fontSize: 26,
          bold: true,
          color: "F0ECE4",
          fontFace: "Georgia",
          italic: true,
        });

        s.addShape(pptx.ShapeType.rect, {
          x: 0.3,
          y: 1.1,
          w: 9.2,
          h: 0.02,
          fill: { color: "C9A84C", transparency: 60 },
        });

        // Left column background
        s.addShape(pptx.ShapeType.rect, {
          x: 0.3,
          y: 1.2,
          w: 4.4,
          h: 5.4,
          fill: { color: "13161A" },
          line: { color: "1A1E23" },
          rectRadius: 0.1,
        });

        // Right column background
        s.addShape(pptx.ShapeType.rect, {
          x: 5.0,
          y: 1.2,
          w: 4.7,
          h: 5.4,
          fill: { color: "13161A" },
          line: { color: "1A1E23" },
          rectRadius: 0.1,
        });

        // Left heading
        s.addText(slide.leftHeading || "Column 1", {
          x: 0.5,
          y: 1.35,
          w: 4,
          h: 0.5,
          fontSize: 13,
          bold: true,
          color: "C9A84C",
          fontFace: "Calibri",
        });

        // Left bullets
        (slide.leftPoints || []).slice(0, 5).forEach((point, i) => {
          s.addText(`→  ${point}`, {
            x: 0.5,
            y: 1.9 + i * 0.85,
            w: 4.0,
            h: 0.75,
            fontSize: 13,
            color: "C8C4BC",
            fontFace: "Calibri",
          });
        });

        // Right heading
        s.addText(slide.rightHeading || "Column 2", {
          x: 5.2,
          y: 1.35,
          w: 4.3,
          h: 0.5,
          fontSize: 13,
          bold: true,
          color: "C9A84C",
          fontFace: "Calibri",
        });

        // Right bullets
        (slide.rightPoints || []).slice(0, 5).forEach((point, i) => {
          s.addText(`→  ${point}`, {
            x: 5.2,
            y: 1.9 + i * 0.85,
            w: 4.3,
            h: 0.75,
            fontSize: 13,
            color: "C8C4BC",
            fontFace: "Calibri",
          });
        });

        break;
      }

      // ── DEFAULT: treat as content ──
      default: {
        s.addText(slide.title || "", {
          x: 0.3,
          y: 0.25,
          w: 9.4,
          h: 0.8,
          fontSize: 26,
          bold: true,
          color: "F0ECE4",
          fontFace: "Georgia",
          italic: true,
        });

        const bullets = slide.bullets || [];
        bullets.forEach((bullet, i) => {
          s.addText(`•  ${bullet}`, {
            x: 0.5,
            y: 1.2 + i * 0.8,
            w: 9,
            h: 0.7,
            fontSize: 16,
            color: "C8C4BC",
            fontFace: "Calibri",
          });
        });
      }
    }

    // Speaker notes
    if (slide.notes) {
      s.addNotes(slide.notes);
    }
  }

  // ── Key takeaways slide ──
  if (content.keyTakeaways && content.keyTakeaways.length > 0) {
    const s = pptx.addSlide({ masterName: "LAWLITE_MASTER" });

    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 1.3,
      fill: { color: "13161A" },
    });

    s.addText("⚡  Key Takeaways", {
      x: 0.4, y: 0.25, w: 9.2, h: 0.8,
      fontSize: 30, bold: true, color: "C9A84C",
      fontFace: "Georgia", italic: true,
    });

    content.keyTakeaways.forEach((t, i) => {
      s.addShape(pptx.ShapeType.rect, {
        x: 0.4,
        y: 1.5 + i * 1.1,
        w: 9.2,
        h: 0.9,
        fill: { color: "13161A" },
        line: { color: "C9A84C", transparency: 70, width: 0.5 },
        rectRadius: 0.1,
      });

      s.addText(`${i + 1}.  ${t}`, {
        x: 0.6, y: 1.55 + i * 1.1, w: 8.8, h: 0.8,
        fontSize: 15, color: "F0ECE4", fontFace: "Calibri",
      });
    });
  }

  // Build and return as buffer
  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return buffer;
}

// ─────────────────────────────────────────────
//  PDF BUILDER
// ─────────────────────────────────────────────

/**
 * Builds a branded LawLite PDF report.
 * @param {object} content
 * @returns {Promise<Buffer>}
 */
async function buildPdf(content) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const PAGE_W = 595.28; // A4
  const PAGE_H = 841.89;
  const MARGIN = 56;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // Brand colours as rgb()
  const GOLD = rgb(...BRAND.goldRgb);
  const DARK = rgb(0.051, 0.059, 0.067);
  const TEXT = rgb(0.85, 0.82, 0.78);
  const TEXT_STRONG = rgb(0.941, 0.925, 0.894);
  const MUTED = rgb(0.45, 0.45, 0.45);
  const SURFACE = rgb(0.075, 0.086, 0.102);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // ── Helper: add new page when near bottom ──
  function checkNewPage(neededHeight = 60) {
    if (y - neededHeight < MARGIN + 40) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
      // Draw page header on new pages
      drawPageHeader();
    }
  }

  function drawPageHeader() {
    // Top gold bar
    page.drawRectangle({
      x: 0, y: PAGE_H - 8,
      width: PAGE_W, height: 8,
      color: GOLD,
    });
    // ⚖ mark
    page.drawText("* LawLite", {
      x: MARGIN, y: PAGE_H - 24,
      size: 10, font: helveticaBold, color: GOLD,
    });
    // Page number area
    const pageCount = pdfDoc.getPageCount();
    page.drawText(`Page ${pageCount}`, {
      x: PAGE_W - MARGIN - 40, y: PAGE_H - 24,
      size: 9, font: helvetica, color: MUTED,
    });
    y = PAGE_H - 50;
  }

  // ── COVER PAGE ──
  // Dark background rectangle
  page.drawRectangle({
    x: 0, y: 0,
    width: PAGE_W, height: PAGE_H,
    color: DARK,
  });

  // Top gold decorative bar
  page.drawRectangle({
    x: 0, y: PAGE_H - 6,
    width: PAGE_W, height: 6,
    color: GOLD,
  });

  // Left gold accent strip
  page.drawRectangle({
    x: 0, y: 0,
    width: 6, height: PAGE_H,
    color: GOLD,
  });

  // Large ⚖ decoration
  page.drawText("LAW", {
    x: MARGIN + 10, y: PAGE_H - 140,
    size: 64, font: helveticaBold, color: GOLD,
  });

  // Title
  const titleWords = (content.title || "Legal Report").split(" ");
  let titleLine = "";
  let titleY = PAGE_H - 220;
  for (const word of titleWords) {
    const test = titleLine + word + " ";
    const testWidth = timesRoman.widthOfTextAtSize(test, 32);
    if (testWidth > CONTENT_W - 20 && titleLine) {
      page.drawText(titleLine.trim(), {
        x: MARGIN + 16, y: titleY,
        size: 32, font: timesRoman, color: TEXT_STRONG,
      });
      titleY -= 42;
      titleLine = word + " ";
    } else {
      titleLine = test;
    }
  }
  if (titleLine.trim()) {
    page.drawText(titleLine.trim(), {
      x: MARGIN + 16, y: titleY,
      size: 32, font: timesRoman, color: TEXT_STRONG,
    });
    titleY -= 42;
  }

  // Gold separator
  page.drawRectangle({
    x: MARGIN + 16, y: titleY - 8,
    width: 200, height: 2,
    color: GOLD,
  });

  // Subtitle
  if (content.subtitle) {
    page.drawText(content.subtitle, {
      x: MARGIN + 16, y: titleY - 32,
      size: 14, font: helveticaOblique, color: GOLD,
    });
  }

  // Author + date
  page.drawText(`${content.author || "LawLite Legal Intelligence"}`, {
    x: MARGIN + 16, y: 120,
    size: 11, font: helveticaBold, color: TEXT_STRONG,
  });
  page.drawText(content.date || new Date().toLocaleDateString("en-IN"), {
    x: MARGIN + 16, y: 100,
    size: 10, font: helvetica, color: MUTED,
  });

  // Disclaimer at bottom of cover
  page.drawText(
    "This document is for informational purposes only and does not constitute legal advice.",
    { x: MARGIN + 16, y: 48, size: 7, font: helvetica, color: MUTED }
  );

  // ── CONTENT PAGES ──
  page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  y = PAGE_H - MARGIN;

  // Draw top bar on content pages
  page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: GOLD });
  page.drawRectangle({ x: 0, y: 0, width: 6, height: PAGE_H, color: GOLD });

  // Branding
  page.drawText("* LawLite", {
    x: MARGIN + 16, y: PAGE_H - 28,
    size: 10, font: helveticaBold, color: GOLD,
  });
  y = PAGE_H - 60;

  // ── Executive Summary ──
  if (content.executiveSummary) {
    checkNewPage(120);

    page.drawText("EXECUTIVE SUMMARY", {
      x: MARGIN + 16, y,
      size: 9, font: helveticaBold, color: GOLD,
    });
    y -= 18;

    page.drawRectangle({ x: MARGIN + 16, y: y, width: CONTENT_W - 16, height: 1, color: GOLD, opacity: 0.4 });
    y -= 14;

    // Word-wrap the summary
    y = drawWrappedText(page, content.executiveSummary, {
      x: MARGIN + 16, y,
      maxWidth: CONTENT_W - 16,
      size: 11, font: helvetica, color: TEXT, lineHeight: 18,
    });
    y -= 30;
  }

  // ── Sections ──
  for (const section of content.sections || []) {
    checkNewPage(100);

    // Section heading
    page.drawText(section.heading?.toUpperCase() || "", {
      x: MARGIN + 16, y,
      size: 9, font: helveticaBold, color: GOLD,
    });
    y -= 16;

    page.drawRectangle({
      x: MARGIN + 16, y, width: CONTENT_W - 16, height: 1, color: GOLD, opacity: 0.3,
    });
    y -= 16;

    // Main content
    if (section.content) {
      y = drawWrappedText(page, section.content, {
        x: MARGIN + 16, y,
        maxWidth: CONTENT_W - 16,
        size: 10.5, font: helvetica, color: TEXT, lineHeight: 17,
      });
      y -= 12;
    }

    // Bullet points
    for (const bullet of section.bullets || []) {
      checkNewPage(30);
      page.drawText("•", { x: MARGIN + 22, y, size: 11, font: helveticaBold, color: GOLD });
      y = drawWrappedText(page, bullet, {
        x: MARGIN + 36, y,
        maxWidth: CONTENT_W - 36,
        size: 10.5, font: helvetica, color: TEXT, lineHeight: 17,
      });
      y -= 6;
    }

    // Subsections
    for (const sub of section.subsections || []) {
      checkNewPage(60);
      y -= 8;

      page.drawText(sub.heading || "", {
        x: MARGIN + 24, y,
        size: 10, font: helveticaBold, color: TEXT_STRONG,
      });
      y -= 16;

      if (sub.content) {
        y = drawWrappedText(page, sub.content, {
          x: MARGIN + 30, y,
          maxWidth: CONTENT_W - 40,
          size: 10, font: helvetica, color: TEXT, lineHeight: 16,
        });
      }
      y -= 8;
    }

    y -= 22; // Section gap
  }

  // ── Conclusion ──
  if (content.conclusion) {
    checkNewPage(100);

    page.drawText("CONCLUSION", {
      x: MARGIN + 16, y,
      size: 9, font: helveticaBold, color: GOLD,
    });
    y -= 16;
    page.drawRectangle({ x: MARGIN + 16, y, width: CONTENT_W - 16, height: 1, color: GOLD, opacity: 0.3 });
    y -= 16;

    y = drawWrappedText(page, content.conclusion, {
      x: MARGIN + 16, y,
      maxWidth: CONTENT_W - 16,
      size: 10.5, font: helvetica, color: TEXT, lineHeight: 17,
    });
    y -= 30;
  }

  // ── Disclaimer box ──
  checkNewPage(80);
  page.drawRectangle({
    x: MARGIN + 16, y: y - 50,
    width: CONTENT_W - 16, height: 60,
    color: SURFACE,
    borderColor: GOLD,
    borderWidth: 0.5,
    opacity: 0.6,
  });

  page.drawText("! DISCLAIMER", {
    x: MARGIN + 26, y: y - 14,
    size: 8, font: helveticaBold, color: GOLD,
  });

  const disclaimerText = content.disclaimer || "This document is for informational purposes only and does not constitute legal advice. Consult a qualified lawyer for your specific situation.";
  drawWrappedText(page, disclaimerText, {
    x: MARGIN + 26, y: y - 28,
    maxWidth: CONTENT_W - 36,
    size: 8, font: helvetica, color: MUTED, lineHeight: 13,
  });

  // Bottom gold bar on all pages
  const pages = pdfDoc.getPages();
  for (const p of pages) {
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 5, color: GOLD });
  }

  const pdfBytes = await pdfDoc.save();
return Buffer.from(pdfBytes.buffer, pdfBytes.byteOffset, pdfBytes.byteLength);
}

// ── Text wrapping helper for PDF ──
function drawWrappedText(page, text, { x, y, maxWidth, size, font, color, lineHeight }) {
  if (!text) return y;
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line + word + " ";
    const testWidth = font.widthOfTextAtSize(testLine, size);

    if (testWidth > maxWidth && line) {
      page.drawText(line.trim(), { x, y: currentY, size, font, color });
      currentY -= lineHeight;
      line = word + " ";
    } else {
      line = testLine;
    }
  }

  if (line.trim()) {
    page.drawText(line.trim(), { x, y: currentY, size, font, color });
    currentY -= lineHeight;
  }

  return currentY;
}

// ─────────────────────────────────────────────
//  DOCX BUILDER
// ─────────────────────────────────────────────

/**
 * Builds a branded LawLite Word document.
 * @param {object} content
 * @returns {Promise<Buffer>}
 */
async function buildDocx(content) {
  const children = [];

  // ── Title ──
  children.push(
    new Paragraph({
      text: content.title || "Legal Document",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  if (content.subtitle) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: content.subtitle,
            italics: true,
            color: "C9A84C",
            size: 28,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );
  }

  // Author + date
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: content.author || "LawLite Legal Intelligence", bold: true, size: 20, color: "555555" }),
        new TextRun({ text: `  |  ${content.date || new Date().toLocaleDateString("en-IN")}`, size: 20, color: "888888" }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      border: {
        bottom: { style: BorderStyle.SINGLE, color: "C9A84C", size: 6 },
      },
    })
  );

  // ── Sections ──
  for (const section of content.sections || []) {
    // Section heading
    children.push(
      new Paragraph({
        text: section.heading || "",
        heading: section.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 120 },
        border: section.level !== 2 ? {
          bottom: { style: BorderStyle.SINGLE, color: "C9A84C", size: 4 },
        } : undefined,
      })
    );

    // Content paragraph
    if (section.content) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: section.content, size: 22 })],
          spacing: { after: 160, line: 360 },
        })
      );
    }

    // Bullets
    for (const bullet of section.bullets || []) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "• ", color: "C9A84C", bold: true, size: 22 }),
            new TextRun({ text: bullet, size: 22 }),
          ],
          indent: { left: 400 },
          spacing: { after: 80 },
        })
      );
    }

    // Subsections
    for (const sub of section.subsections || []) {
      children.push(
        new Paragraph({
          text: sub.heading || "",
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      if (sub.content) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: sub.content, size: 22 })],
            spacing: { after: 140, line: 340 },
          })
        );
      }
    }
  }

  // ── Conclusion ──
  if (content.conclusion) {
    children.push(
      new Paragraph({
        text: "Conclusion",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 120 },
        border: {
          bottom: { style: BorderStyle.SINGLE, color: "C9A84C", size: 4 },
        },
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun({ text: content.conclusion, size: 22 })],
        spacing: { after: 200, line: 360 },
      })
    );
  }

  // ── Disclaimer ──
  children.push(
    new Paragraph({
      children: [
        new TextRun({
  text: "DISCLAIMER: ",
  bold: true,
  size: 18,
  color: "C9A84C",
}),
        new TextRun({
          text: content.disclaimer || "This document is for informational purposes only and does not constitute legal advice. Please consult a qualified lawyer for your specific legal situation.",
          size: 18,
          color: "888888",
          italics: true,
        }),
      ],
      border: {
        top: { style: BorderStyle.SINGLE, color: "C9A84C", size: 4 },
      },
      spacing: { before: 400, after: 100 },
    })
  );

  const doc = new Document({
    creator: "LawLite Legal Intelligence",
    title: content.title || "Legal Document",
    description: "Generated by LawLite AI",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22, color: "1A1A1A" },
          paragraph: { spacing: { line: 340 } },
        },
      },
      paragraphStyles: [
        {
          id: "Title",
          name: "Title",
          run: { font: "Georgia", size: 48, bold: true, color: "0D0F11" },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          run: { font: "Georgia", size: 32, bold: true, italics: true, color: "C9A84C" },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          run: { font: "Calibri", size: 26, bold: true, color: "1A1A1A" },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          run: { font: "Calibri", size: 22, bold: true, color: "555555" },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 900, right: 900, bottom: 900, left: 900 },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

// ─────────────────────────────────────────────
//  MAIN PUBLIC FUNCTION
// ─────────────────────────────────────────────

/**
 * Full document generation pipeline:
 *  1. Detect document type from user message
 *  2. Generate content via DeepSeek
 *  3. Build the actual file
 *  4. Return { buffer, filename, mimeType, content, liveCode }
 *
 * @param {object} opts
 * @param {string} opts.userMessage
 * @param {string} [opts.extraContext]
 * @returns {Promise<{
 *   buffer: Buffer,
 *   filename: string,
 *   mimeType: string,
 *   docType: string,
 *   title: string,
 *   slideCount: number|null,
 *   sectionCount: number|null,
 *   liveCode: string,
 * }>}
 */
async function generateDocument({ userMessage, extraContext = "" }) {
  const { isDocRequest, docType, topic } = detectDocumentRequest(userMessage);

  if (!isDocRequest || !docType) {
    throw Object.assign(new Error("Not a document request"), { code: "NOT_DOC_REQUEST" });
  }

  // Generate content from DeepSeek
  const content = await generateDocumentContent(topic, docType, extraContext);

  // Build the actual file
  let buffer, filename, mimeType;
  const slug = topic.replace(/[^a-z0-9]/gi, "_").slice(0, 40).toLowerCase();
  const ts = Date.now();

  switch (docType) {
    case "pptx":
      buffer = await buildPptx(content);
      filename = `LawLite_${slug}_${ts}.pptx`;
      mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      break;
    case "pdf":
      buffer = await buildPdf(content);
      filename = `LawLite_${slug}_${ts}.pdf`;
      mimeType = "application/pdf";
      break;
    case "docx":
      buffer = await buildDocx(content);
      filename = `LawLite_${slug}_${ts}.docx`;
      mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      break;
    default:
      throw new Error(`Unknown doc type: ${docType}`);
  }

  // Generate a "live code" summary to show in chat during generation
  const liveCode = generateLiveCodePreview(content, docType);

  return {
    buffer,
    filename,
    mimeType,
    docType,
    title: content.title || topic,
    slideCount: content.slides?.length || null,
    sectionCount: content.sections?.length || null,
    liveCode,
    content,
  };
}

/**
 * Generates a preview of what's being built (shown in chat as live code).
 * @param {object} content
 * @param {string} docType
 * @returns {string}
 */
function generateLiveCodePreview(content, docType) {
  if (docType === "pptx") {
    return content.slides?.map((s, i) =>
      `Slide ${s.slideNumber || i + 1}: [${(s.type || "content").toUpperCase()}] ${s.title || ""}`
      + (s.bullets ? `\n  ${s.bullets.slice(0, 3).map(b => `• ${b}`).join("\n  ")}` : "")
    ).join("\n\n") || "Generating slides...";
  }

  if (docType === "pdf" || docType === "docx") {
    return content.sections?.map((s, i) =>
      `§${i + 1}  ${s.heading || "Section"}`
      + (s.content ? `\n     ${s.content.slice(0, 100)}${s.content.length > 100 ? "…" : ""}` : "")
    ).join("\n\n") || "Generating content...";
  }

  return "Generating document...";
}

module.exports = {
  generateDocument,
  detectDocumentRequest,
  generateDocumentContent,
};