/**
 * Split large text into overlapping chunks for better retrieval
 * Overlap ensures context is not lost at chunk boundaries
 */
function chunkText(text, chunkSize = 800, overlap = 150) {
  // Clean up whitespace
  const cleaned = text.replace(/\s+/g, " ").trim();

  if (cleaned.length === 0) {
    throw new Error("No text content to chunk");
  }

  const chunks = [];
  let start = 0;

  while (start < cleaned.length) {
    let end = start + chunkSize;

    // Try to break at sentence boundary (. ! ?)
    if (end < cleaned.length) {
      const sentenceEnd = cleaned.lastIndexOf(".", end);
      const exclamEnd = cleaned.lastIndexOf("!", end);
      const questEnd = cleaned.lastIndexOf("?", end);

      const bestBreak = Math.max(sentenceEnd, exclamEnd, questEnd);

      // Only use sentence break if it's not too far back
      if (bestBreak > start + chunkSize * 0.5) {
        end = bestBreak + 1;
      }
    }

    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 50) {
      // Skip very small chunks
      chunks.push(chunk);
    }

    // Move forward with overlap
    start = end - overlap;
    if (start >= cleaned.length) break;
  }

  console.log(
    `📄 Text split into ${chunks.length} chunks (avg ${Math.round(
      cleaned.length / chunks.length
    )} chars each)`
  );

  return chunks;
}

module.exports = { chunkText };
