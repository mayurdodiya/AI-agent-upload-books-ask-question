const express = require("express");
const { embedText, askGemini } = require("../services/embeddings");
const { searchSimilarChunks } = require("../services/vectorStore"); // ← fix import name

const router = express.Router();

/**
 * POST /api/query
 * Ask a question about a specific book
 * Body: { bookId, bookTitle, question }
 */
router.post("/", async (req, res) => {
  const { bookId, bookTitle, question } = req.body;

  if (!question) {
    return res.status(400).json({
      error: "question is required",
    });
  }

  if (question.trim().length < 3) {
    return res.status(400).json({
      error: "Question is too short. Please ask a meaningful question.",
    });
  }

  try {
    console.log(`\n❓ Question for "${bookTitle || "all books"}": ${question}`);

    // Step 1: Embed the question
    const questionEmbedding = await embedText(question);

    // Step 2: Search Pinecone for relevant chunks
    const relevantChunks = await searchSimilarChunks(
      questionEmbedding,
      bookId || null, // null = search all books
      5,
    );

    if (!relevantChunks || relevantChunks.length === 0) {
      return res.json({
        answer: "I couldn't find relevant information in this book to answer your question.",
        chunks: [],
      });
    }

    // Step 3: Extract just the text for Gemini context
    const chunkTexts = relevantChunks.map((c) => c.text);

    // Step 4: Ask Gemini with context
    const answer = await askGemini(question, chunkTexts, bookTitle || "this book");

    console.log(`✅ Answer generated (${answer.length} chars)`);

    res.json({
      success: true,
      question,
      answer,
      sourcesUsed: relevantChunks.length,
    });
  } catch (err) {
    console.error("Query error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// const express = require("express");
// const { embedText, askGemini } = require("../services/embeddings");
// const { searchBook } = require("../services/vectorStore");

// const router = express.Router();

// /**
//  * POST /api/query
//  * Ask a question about a specific book
//  * Body: { bookId, bookTitle, question }
//  */
// router.post("/", async (req, res) => {
//   const { bookId, bookTitle, question } = req.body;

//   if (!bookId || !question) {
//     return res.status(400).json({
//       error: "bookId and question are required",
//     });
//   }

//   if (question.trim().length < 3) {
//     return res.status(400).json({
//       error: "Question is too short. Please ask a meaningful question.",
//     });
//   }

//   try {
//     console.log(`\n❓ Question for "${bookTitle}": ${question}`);

//     // Step 1: Embed the question
//     const questionEmbedding = await embedText(question);

//     // Step 2: Search for relevant chunks in ChromaDB
//     const relevantChunks = await searchBook(bookId, questionEmbedding, 5);

//     if (!relevantChunks || relevantChunks.length === 0) {
//       return res.json({
//         answer:
//           "I couldn't find relevant information in this book to answer your question.",
//         chunks: [],
//       });
//     }

//     // Step 3: Ask Gemini with context
//     const answer = await askGemini(
//       question,
//       relevantChunks,
//       bookTitle || "this book"
//     );

//     console.log(`✅ Answer generated (${answer.length} chars)`);

//     res.json({
//       success: true,
//       question,
//       answer,
//       sourcesUsed: relevantChunks.length,
//     });
//   } catch (err) {
//     console.error("Query error:", err.message);

//     if (err.message?.includes("not found")) {
//       return res.status(404).json({
//         error:
//           "Book not found in the database. Please re-upload the book.",
//       });
//     }

//     res.status(500).json({ error: err.message });
//   }
// });

// module.exports = router;
