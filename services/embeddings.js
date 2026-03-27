const { GoogleGenAI } = require("@google/genai");

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate embedding vector for a single text
 */
async function embedText(text) {
  const result = await genAI.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
  });
  return result.embeddings[0].values;
}

/**
 * Generate embeddings for multiple texts (batch)
 * Adds delay to respect free tier rate limits
 */
async function embedBatch(texts, delayMs = 200) {
  const embeddings = [];

  for (let i = 0; i < texts.length; i++) {
    try {
      const embedding = await embedText(texts[i]);
      embeddings.push(embedding);

      if ((i + 1) % 10 === 0 || i === texts.length - 1) {
        console.log(`  Embedded ${i + 1}/${texts.length} chunks...`);
      }

      if (i < texts.length - 1 && delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    } catch (err) {
      console.error(`Failed to embed chunk ${i}:`, err.message);
      throw err;
    }
  }

  return embeddings;
}

/**
 * Ask Gemini a question with retrieved context
 */
// async function askGemini(question, contextChunks, bookTitle) {
//   const context = contextChunks.join("\n\n---\n\n");

//   const prompt = `You are an intelligent assistant helping users understand the book "${bookTitle}".

// Below are relevant excerpts from the book that relate to the user's question:

// ${context}

// ---

// User's Question: ${question}

// Instructions:
// - Answer based ONLY on the provided book excerpts above
// - Be clear, concise, and helpful
// - If the answer is not in the excerpts, say "I couldn't find information about this in the provided book sections"
// - Quote relevant parts of the book when helpful
// - Do not make up informationcollection

// Answer:`;

//   const result = await genAI.models.generateContent({
//     model: "gemini-2.0-flash",
//     contents: prompt,
//   });

//   return result.text;
// }

async function askGemini(question, contextChunks, bookTitle) {
  // 1. Handle empty context
  if (!contextChunks || contextChunks.length === 0) {
    return {
      answer: "I couldn't find relevant information in the uploaded books to answer your question.",
      sources: [],
    };
  }
  console.log(contextChunks);
  // 2. Prepare context and prompts
  const contextText = contextChunks.map((chunk, i) => `[Excerpt ${i + 1} from "${bookTitle}"]\n${chunk}`).join("\n\n---\n\n");

  const systemPrompt = `You are a helpful book assistant. Answer the user's question based ONLY on the provided book excerpts. 
  IMPORTANT RULES:
  - Answer only from the provided excerpts.
  - If the answer is not in the excerpts, say "I couldn't find this information in the book."
  - Be concise but thorough.`;

  const userPrompt = `BOOK EXCERPTS:\n${contextText}\n\nUSER QUESTION: ${question}`;

  try {
    console.log(`🤖 Generating answer via OpenRouter SDK...`);

    // 3. Dynamic import of the ESM SDK
    const { OpenRouter } = await import("@openrouter/sdk");
    const openrouter = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    console.log(
      "prompt",
      JSON.stringify([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]),
    );
    // 4. Send request using the required SDK schema
    const response = await openrouter.chat.send({
      chatGenerationParams: {
        model: "openrouter/free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      },
      stream: false, // Set to false as per your latest test
    });
    console.log("response", JSON.stringify(response));
    // 5. Extract the content safely
    const answer = response.choices[0]?.message?.content || "I couldn't generate an answer.";

    // 6. Deduplicate sources for the UI
    const sources = [...new Map(contextChunks.map((c) => [c.bookId, { bookTitle: c.bookTitle, bookId: c.bookId, relevanceScore: c.score }])).values()];
    console.log("sources", sources);
    return answer;
    // return { answer, sources };
  } catch (error) {
    console.error("SDK Error:", error.message);
    if (error.cause) console.error("Validation issues:", error.cause.issues);

    return {
      answer: "An error occurred while communicating with the AI assistant.",
      sources: [],
    };
  }
}
module.exports = { embedText, embedBatch, askGemini };
