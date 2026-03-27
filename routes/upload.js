const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const { parseFile } = require("../services/fileParser");
const { chunkText } = require("../services/chunker");
const { embedBatch } = require("../services/embeddings");
const { storeBook } = require("../services/vectorStore");

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config — accept PDF only, max 50MB
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are supported in this version"), false);
    }
  },
});

/**
 * POST /api/upload
 * Upload and process a book PDF
 */
router.post("/", upload.single("book"), async (req, res) => {
  const filePath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const bookTitle =
      req.body.title ||
      req.file.originalname.replace(/\.pdf$/i, "").replace(/_/g, " ");

    const bookId = uuidv4();

    console.log(`\n📚 Processing book: "${bookTitle}"`);
    console.log(`   File: ${req.file.originalname} (${formatBytes(req.file.size)})`);

    // Step 1: Parse PDF
    console.log("📖 Extracting text from PDF...");
    const text = await parseFile(filePath, req.file.mimetype);
    console.log(`   Extracted ${text.length.toLocaleString()} characters`);

    // Step 2: Chunk text
    console.log("✂️  Splitting text into chunks...");
    const chunks = chunkText(text, 800, 150);

    // Step 3: Generate embeddings
    console.log(`🧠 Generating embeddings for ${chunks.length} chunks (this may take a moment)...`);
    const embeddings = await embedBatch(chunks, 200);

    // Step 4: Store in ChromaDB
    console.log("💾 Storing in vector database...");
    await storeBook(bookId, bookTitle, chunks, embeddings);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    console.log(`✅ Book "${bookTitle}" ready for Q&A!\n`);

    res.json({
      success: true,
      bookId,
      bookTitle,
      chunkCount: chunks.length,
      charCount: text.length,
      message: `Book "${bookTitle}" has been processed and is ready for questions!`,
    });
  } catch (err) {
    // Clean up file on error
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error("Upload error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

module.exports = router;
