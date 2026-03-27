/**
 * upload.js route
 * POST /api/upload
 * Accepts a book file, extracts text, chunks it, embeds it, stores in Pinecone
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { extractText } = require('../services/parser');
const { chunkText } = require('../services/chunker');
const { embedChunks } = require('../services/embedder');
const { storeBookChunks } = require('../services/vectorDB');
const { addBook } = require('../services/bookStore');

const router = express.Router();

// Multer config — save to /uploads with original extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.docx', '.doc', '.txt', '.png', '.jpg', '.jpeg', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type "${ext}" not supported. Allowed: ${allowed.join(', ')}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

/**
 * POST /api/upload
 * Body: multipart/form-data with field "book" (file) and optional "title" (string)
 */
router.post('/', upload.single('book'), async (req, res, next) => {
  const startTime = Date.now();

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Use field name "book".' });
  }

  const filePath = req.file.path;
  const bookId = uuidv4();
  const bookTitle = req.body.title || req.file.originalname.replace(/\.[^/.]+$/, '');

  console.log(`\n📚 Processing book: "${bookTitle}" (${req.file.originalname})`);

  try {
    // Step 1: Extract text
    const text = await extractText(filePath);

    if (!text || text.trim().length < 100) {
      throw new Error('Extracted text is too short. The file may be empty or unreadable.');
    }

    // Step 2: Chunk the text
    const chunks = chunkText(text, 400, 50);

    if (chunks.length === 0) {
      throw new Error('No text chunks could be created from this file.');
    }

    // Step 3: Generate embeddings
    const embeddings = await embedChunks(chunks);

    // Step 4: Store in Pinecone
    await storeBookChunks(bookId, bookTitle, chunks, embeddings);

    // Step 5: Save book metadata
    const bookMeta = {
      id: bookId,
      title: bookTitle,
      originalName: req.file.originalname,
      fileType: path.extname(req.file.originalname).toLowerCase(),
      chunkCount: chunks.length,
      characterCount: text.length,
      uploadedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
    };
    addBook(bookMeta);

    // Clean up uploaded file (text is now in vector DB)
    fs.unlinkSync(filePath);

    console.log(`✅ Book "${bookTitle}" processed in ${((Date.now() - startTime) / 1000).toFixed(1)}s\n`);

    res.json({
      success: true,
      message: `Book "${bookTitle}" uploaded and processed successfully!`,
      book: bookMeta,
    });

  } catch (err) {
    // Clean up file on error
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Upload error:', err.message);
    next(err);
  }
});

module.exports = router;
