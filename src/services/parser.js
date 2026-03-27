/**
 * parser.js
 * Extracts plain text from PDF, DOCX, TXT, and image files
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');

/**
 * Main entry point — detects file type and extracts text
 */
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.pdf':
      return extractFromPDF(filePath);
    case '.docx':
    case '.doc':
      return extractFromDOCX(filePath);
    case '.txt':
      return extractFromTXT(filePath);
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.webp':
    case '.tiff':
    case '.bmp':
      return extractFromImage(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}. Supported: PDF, DOCX, TXT, PNG, JPG, JPEG`);
  }
}

async function extractFromPDF(filePath) {
  console.log('📄 Parsing PDF...');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  if (!data.text || data.text.trim().length < 10) {
    throw new Error('Could not extract text from PDF. It may be a scanned image PDF.');
  }
  console.log(`✅ PDF parsed: ${data.numpages} pages, ${data.text.length} characters`);
  return data.text;
}

async function extractFromDOCX(filePath) {
  console.log('📝 Parsing DOCX...');
  const result = await mammoth.extractRawText({ path: filePath });
  console.log(`✅ DOCX parsed: ${result.value.length} characters`);
  return result.value;
}

async function extractFromTXT(filePath) {
  console.log('📃 Reading TXT file...');
  const text = fs.readFileSync(filePath, 'utf-8');
  console.log(`✅ TXT read: ${text.length} characters`);
  return text;
}

async function extractFromImage(filePath) {
  console.log('🖼️ Running OCR on image (this may take a moment)...');
  const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
    logger: m => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\r   OCR progress: ${Math.round(m.progress * 100)}%`);
      }
    }
  });
  console.log(`\n✅ OCR complete: ${text.length} characters extracted`);
  return text;
}

module.exports = { extractText };
