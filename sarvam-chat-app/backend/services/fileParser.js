const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Tesseract = require("tesseract.js");

async function extractText(file) {
  const mime = file.mimetype;

  // PDF
  if (mime === "application/pdf") {
    const data = await pdfParse(file.buffer);
    return data.text;
  }

  // DOCX
  if (mime.includes("word")) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  // TXT
  if (mime === "text/plain") {
    return file.buffer.toString("utf-8");
  }

  // IMAGE (OCR)
  if (mime.startsWith("image/")) {
    const result = await Tesseract.recognize(file.buffer, "eng");
    return result.data.text;
  }

  throw new Error("Unsupported file type");
}

module.exports = extractText;