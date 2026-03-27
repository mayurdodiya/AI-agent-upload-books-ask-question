/**
 * chunker.js
 * Splits large text into overlapping chunks for better RAG retrieval
 */

/**
 * Split text into chunks with overlap
 * @param {string} text - Full book text
 * @param {number} chunkSize - Words per chunk (default: 400)
 * @param {number} overlap - Overlapping words between chunks (default: 50)
 * @returns {Array<{text: string, index: number}>}
 */
function chunkText(text, chunkSize = 400, overlap = 50) {
  // Clean up excessive whitespace
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ');

  const chunks = [];
  let i = 0;

  while (i < words.length) {
    const chunkWords = words.slice(i, i + chunkSize);
    const chunkText = chunkWords.join(' ');

    // Skip very short chunks (likely noise)
    if (chunkText.trim().length > 50) {
      chunks.push({
        text: chunkText,
        index: chunks.length,
        wordStart: i,
        wordEnd: i + chunkWords.length,
      });
    }

    i += chunkSize - overlap;
  }

  console.log(`✂️  Text split into ${chunks.length} chunks (${chunkSize} words each, ${overlap} word overlap)`);
  return chunks;
}

module.exports = { chunkText };
