/**
 * query.js route
 * POST /api/query
 * Takes a user question, searches relevant chunks, returns AI answer
 */

const express = require('express');
const { embedText } = require('../services/embedder');
const { searchSimilarChunks } = require('../services/vectorDB');
const { generateAnswer } = require('../services/llm');

const router = express.Router();

/**
 * POST /api/query
 * Body: { question: string, bookId?: string }
 * - question: User's question (required)
 * - bookId: Optional — limit search to a specific book
 */
router.post('/', async (req, res, next) => {
  const { question, bookId } = req.body;

  if (!question || question.trim().length === 0) {
    return res.status(400).json({ error: 'Please provide a question.' });
  }

  if (question.trim().length > 1000) {
    return res.status(400).json({ error: 'Question is too long. Max 1000 characters.' });
  }

  console.log(`\n❓ Question: "${question}"${bookId ? ` (Book: ${bookId})` : ' (All books)'}`);

  try {
    // Step 1: Embed the question
    console.log('🧠 Embedding question...');
    const questionEmbedding = await embedText(question);

    // Step 2: Find relevant chunks
    console.log('🔍 Searching for relevant book sections...');
    const relevantChunks = await searchSimilarChunks(questionEmbedding, bookId || null, 5);

    console.log(`   Found ${relevantChunks.length} relevant chunks (top score: ${relevantChunks[0]?.score?.toFixed(3) || 'N/A'})`);

    // Step 3: Generate answer
    const { answer, sources } = await generateAnswer(question, relevantChunks);

    console.log(`✅ Answer generated\n`);

    res.json({
      success: true,
      question,
      answer,
      sources,
      chunksUsed: relevantChunks.length,
    });

  } catch (err) {
    console.error('Query error:', err.message);
    next(err);
  }
});

module.exports = router;
