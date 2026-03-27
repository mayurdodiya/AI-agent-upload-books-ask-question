/**
 * vectorDB.js
 * Manages Pinecone vector database operations (FREE tier)
 * - Store book chunks as vectors
 * - Search similar chunks for a query
 */

const { Pinecone } = require('@pinecone-database/pinecone');

let pinecone = null;
let index = null;

/**
 * Initialize Pinecone client and index
 */
async function initPinecone() {
  if (index) return index; // Already initialized

  pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  const indexName = process.env.PINECONE_INDEX_NAME || 'books-index';
  index = pinecone.index(indexName);
  console.log(`✅ Pinecone connected — index: "${indexName}"`);
  return index;
}

/**
 * Store book chunks + their embeddings in Pinecone
 * @param {string} bookId - Unique book identifier
 * @param {string} bookTitle - Book name for metadata
 * @param {Array<{text: string, index: number}>} chunks
 * @param {Array<number[]>} embeddings
 */
async function storeBookChunks(bookId, bookTitle, chunks, embeddings) {
  const idx = await initPinecone();

  // Pinecone upsert in batches of 100
  const BATCH_SIZE = 100;
  const vectors = chunks.map((chunk, i) => ({
    id: `${bookId}_chunk_${chunk.index}`,
    values: embeddings[i],
    metadata: {
      bookId,
      bookTitle,
      chunkIndex: chunk.index,
      text: chunk.text.substring(0, 1000), // Pinecone metadata limit
    },
  }));

  console.log(`💾 Storing ${vectors.length} vectors in Pinecone...`);

  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    await idx.upsert(batch);
    console.log(`   Stored batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vectors.length / BATCH_SIZE)}`);
  }

  console.log(`✅ All chunks stored in Pinecone`);
}

/**
 * Search for the most relevant chunks for a query
 * @param {number[]} queryEmbedding - Embedded user question
 * @param {string} bookId - Optional: limit search to one book
 * @param {number} topK - Number of results to return
 * @returns {Promise<Array<{text: string, bookTitle: string, score: number}>>}
 */
async function searchSimilarChunks(queryEmbedding, bookId = null, topK = 5) {
  const idx = await initPinecone();

  const queryOptions = {
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  };

  // Filter by specific book if provided
  if (bookId) {
    queryOptions.filter = { bookId: { $eq: bookId } };
  }

  const results = await idx.query(queryOptions);

  return results.matches.map(match => ({
    text: match.metadata.text,
    bookTitle: match.metadata.bookTitle,
    bookId: match.metadata.bookId,
    chunkIndex: match.metadata.chunkIndex,
    score: match.score,
  }));
}

/**
 * Delete all vectors for a book (useful for re-upload)
 * @param {string} bookId
 */
async function deleteBook(bookId) {
  const idx = await initPinecone();
  await idx.deleteMany({ filter: { bookId: { $eq: bookId } } });
  console.log(`🗑️ Deleted all vectors for book: ${bookId}`);
}

module.exports = { initPinecone, storeBookChunks, searchSimilarChunks, deleteBook };
