const fs = require("fs");
const pdf = require("pdf-parse");

/**
 * Extract text from uploaded file
 * Currently supports: PDF
 */
async function parseFile(filePath, mimetype) {
  const ext = filePath.split(".").pop().toLowerCase();

  if (mimetype === "application/pdf" || ext === "pdf") {
    return await parsePDF(filePath);
  }

  throw new Error(
    `Unsupported file type: ${ext}. Currently supported: PDF`
  );
}

async function parsePDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdf(buffer);

  if (!data.text || data.text.trim().length === 0) {
    throw new Error(
      "Could not extract text from PDF. The PDF might be scanned/image-based."
    );
  }

  return data.text;
}

module.exports = { parseFile };
