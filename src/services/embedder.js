/**
 * embedder.js
 * Generates vector embeddings using Google Gemini (FREE)
 * Model: text-embedding-001 (3072 dimensions)
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate embedding for a single text string
 * @param {string} text
 * @returns {Promise<number[]>} - 3072-dimension vector
 */
async function embedText(text) {
  // Correct URL: v1beta with model name only (no "models/" prefix in body)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Embedding API error: ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

/**
 * Generate embeddings for multiple chunks with rate limiting
 * Gemini free tier: 1500 requests/minute — we add small delay to be safe
 * @param {Array<{text: string, index: number}>} chunks
 * @returns {Promise<Array<number[]>>}
 */
async function embedChunks(chunks) {
  console.log(`🧠 Generating embeddings for ${chunks.length} chunks...`);
  const embeddings = [];

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedText(chunks[i].text);
    embeddings.push(embedding);

    if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
      console.log(`   Embedded ${i + 1}/${chunks.length} chunks`);
    }

    if (i < chunks.length - 1) {
      await delay(50);
    }
  }

  console.log(`✅ All embeddings generated`);
  return embeddings;
}

module.exports = { embedText, embedChunks };
