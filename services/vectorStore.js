/**
 * vectorStore.js
 * Pinecone vector database operations
 * Replaces ChromaDB — same exported function names kept for compatibility
 */

const { Pinecone } = require("@pinecone-database/pinecone");

let index = null;

async function initPinecone() {
  if (index) return index;
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  index = pinecone.index(process.env.PINECONE_INDEX_NAME);
  console.log(`✅ Pinecone connected — index: "${process.env.PINECONE_INDEX_NAME}"`);
  return index;
}

/**
 * Store book chunks and their embeddings in Pinecone
 * (replaces ChromaDB storeBook)
 */
async function storeBook(bookId, bookTitle, chunks, embeddings) {
  const idx = await initPinecone();

  // Delete existing vectors for this book before re-uploading
  try {
    await idx.deleteMany({ filter: { bookId: { $eq: bookId } } });
    console.log(`🗑️  Cleared old vectors for book: "${bookTitle}"`);
  } catch (e) {
    // No existing vectors — that's fine
  }

  // Build vectors array
  const vectors = chunks.map((chunk, i) => ({
    id: `${bookId}_chunk_${i}`,
    values: embeddings[i],
    metadata: {
      bookId,
      bookTitle,
      chunkIndex: i,
      text: chunk.substring(0, 1000), // Pinecone metadata limit
    },
  }));

  // Upsert in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    await idx.upsert(batch);
    console.log(`   Stored batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vectors.length / BATCH_SIZE)}`);
  }

  console.log(`✅ Stored ${chunks.length} chunks for book: "${bookTitle}"`);
}

/**
 * Search for relevant chunks given a query embedding
 * (replaces ChromaDB searchBook)
 */
async function searchBook(bookId, queryEmbedding, topK = 5) {
  const idx = await initPinecone();

  const queryOptions = {
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  };

  // Filter by specific book if bookId provided
  if (bookId) {
    queryOptions.filter = { bookId: { $eq: bookId } };
  }

  const results = await idx.query(queryOptions);

  // Return just the text strings (same shape as ChromaDB returned)
  return results.matches.map((match) => match.metadata.text);
}

/**
 * Search and return full chunk objects with metadata
 * (bonus: useful for showing sources)
 */
async function searchSimilarChunks(queryEmbedding, bookId = null, topK = 5) {
  const idx = await initPinecone();

  const queryOptions = {
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  };

  if (bookId) {
    queryOptions.filter = { bookId: { $eq: bookId } };
  }

  const results = await idx.query(queryOptions);

  return results.matches.map((match) => ({
    text: match.metadata.text,
    bookTitle: match.metadata.bookTitle,
    bookId: match.metadata.bookId,
    score: match.score,
  }));
}

/**
 * List all stored books
 * (replaces ChromaDB listBooks — Pinecone doesn't support this natively,
 *  so read from your local books.json instead)
 */
async function listBooks() {
  // Pinecone has no "list collections" feature.
  // Book metadata is tracked in books.json by bookStore.js
  console.warn("listBooks() — use bookStore.getAllBooks() instead for Pinecone");
  return [];
}

/**
 * Delete all vectors for a book
 * (replaces ChromaDB deleteBook)
 */
async function deleteBook(bookId) {
  const idx = await initPinecone();
  await idx.deleteMany({ filter: { bookId: { $eq: bookId } } });
  console.log(`🗑️  Deleted all vectors for book: ${bookId}`);
}

module.exports = { storeBook, searchBook, searchSimilarChunks, listBooks, deleteBook };

// const { ChromaClient } = require("chromadb");

// let client = null;

// function getClient() {
//   if (!client) {
//     client = new ChromaClient({
//       path: process.env.CHROMA_URL || "http://localhost:8000",
//     });
//   }
//   return client;
// }

// /**
//  * Create a collection for a book (each book = separate collection)
//  * Collection name is sanitized from book title
//  */
// function sanitizeCollectionName(name) {
//   return name
//     .toLowerCase()
//     .replace(/[^a-z0-9_-]/g, "_")
//     .replace(/_{2,}/g, "_")
//     .replace(/^_|_$/g, "")
//     .substring(0, 50);
// }

// /**
//  * Store book chunks and their embeddings in ChromaDB
//  */
// async function storeBook(bookId, bookTitle, chunks, embeddings) {
//   const chroma = getClient();
//   const collectionName = `book_${sanitizeCollectionName(bookId)}`;

//   // Delete existing collection if re-uploading same book
//   try {
//     await chroma.deleteCollection({ name: collectionName });
//   } catch (e) {
//     // Collection didn't exist, that's fine
//   }

//   // Create new collection
//   const collection = await chroma.createCollection({
//     name: collectionName,
//     metadata: {
//       bookId,
//       bookTitle,
//       chunkCount: chunks.length.toString(),
//       createdAt: new Date().toISOString(),
//     },
//   });

//   // Prepare data for ChromaDB
//   const ids = chunks.map((_, i) => `chunk_${i}`);
//   const metadatas = chunks.map((_, i) => ({
//     chunkIndex: i,
//     bookId,
//     bookTitle,
//   }));

//   // Store in batches of 50 to avoid memory issues
//   const batchSize = 50;
//   for (let i = 0; i < chunks.length; i += batchSize) {
//     const batchEnd = Math.min(i + batchSize, chunks.length);
//     await collection.add({
//       ids: ids.slice(i, batchEnd),
//       embeddings: embeddings.slice(i, batchEnd),
//       documents: chunks.slice(i, batchEnd),
//       metadatas: metadatas.slice(i, batchEnd),
//     });
//   }

//   console.log(
//     `✅ Stored ${chunks.length} chunks for book: "${bookTitle}" in collection: ${collectionName}`
//   );
//   return collectionName;
// }

// /**
//  * Search for relevant chunks given a query embedding
//  */
// async function searchBook(bookId, queryEmbedding, topK = 5) {
//   const chroma = getClient();
//   const collectionName = `book_${sanitizeCollectionName(bookId)}`;

//   const collection = await chroma.getCollection({ name: collectionName });

//   const results = await collection.query({
//     queryEmbeddings: [queryEmbedding],
//     nResults: topK,
//   });

//   return results.documents[0]; // Array of relevant text chunks
// }

// /**
//  * List all stored books
//  */
// async function listBooks() {
//   const chroma = getClient();
//   const collections = await chroma.listCollections();

//   const books = collections
//     .filter((c) => c.name.startsWith("book_"))
//     .map((c) => ({
//       collectionName: c.name,
//       bookId: c.metadata?.bookId || c.name,
//       bookTitle: c.metadata?.bookTitle || c.name,
//       chunkCount: parseInt(c.metadata?.chunkCount || "0"),
//       createdAt: c.metadata?.createdAt || null,
//     }));

//   return books;
// }

// /**
//  * Delete a book's collection
//  */
// async function deleteBook(bookId) {
//   const chroma = getClient();
//   const collectionName = `book_${sanitizeCollectionName(bookId)}`;
//   await chroma.deleteCollection({ name: collectionName });
//   console.log(`🗑️  Deleted collection: ${collectionName}`);
// }

// module.exports = { storeBook, searchBook, listBooks, deleteBook };
