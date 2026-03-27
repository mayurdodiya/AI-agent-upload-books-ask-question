/**
 * llm.js
 * Generates answers using OpenRouter (Accessing Gemini Flash)
 */

/**
 * llm.js
 * Generates answers using OpenRouter SDK
 */

async function generateAnswer(question, contextChunks) {
  // 1. Handle empty context
  if (!contextChunks || contextChunks.length === 0) {
    return {
      answer: "I couldn't find relevant information in the uploaded books to answer your question.",
      sources: [],
    };
  }

  // 2. Prepare context and prompts
  const contextText = contextChunks.map((chunk, i) => `[Excerpt ${i + 1} from "${chunk.bookTitle}"]\n${chunk.text}`).join("\n\n---\n\n");

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

    // 5. Extract the content safely
    const answer = response.choices[0]?.message?.content || "I couldn't generate an answer.";

    // 6. Deduplicate sources for the UI
    const sources = [...new Map(contextChunks.map((c) => [c.bookId, { bookTitle: c.bookTitle, bookId: c.bookId, relevanceScore: c.score }])).values()];

    return { answer, sources };
  } catch (error) {
    console.error("SDK Error:", error.message);
    if (error.cause) console.error("Validation issues:", error.cause.issues);

    return {
      answer: "An error occurred while communicating with the AI assistant.",
      sources: [],
    };
  }
}

module.exports = { generateAnswer };
// /**
//  * llm.js
//  * Generates answers using Google Gemini Flash (FREE)
//  */

// const { GoogleGenAI } = require("@google/genai");

// // ✅ Pass apiKey inside object — NOT as a plain string
// const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// async function generateAnswer(question, contextChunks) {
//   if (!contextChunks || contextChunks.length === 0) {
//     return {
//       answer: "I couldn't find relevant information in the uploaded books to answer your question. Please make sure you've uploaded the right book, or try rephrasing your question.",
//       sources: [],
//     };
//   }

//   const contextText = contextChunks.map((chunk, i) => `[Excerpt ${i + 1} from "${chunk.bookTitle}"]\n${chunk.text}`).join("\n\n---\n\n");

//   const prompt = `You are a helpful book assistant. Answer the user's question based ONLY on the provided book excerpts below.

// IMPORTANT RULES:
// - Answer only from the provided excerpts, do not use outside knowledge
// - If the answer is not in the excerpts, say "I couldn't find this information in the book"
// - Be concise but thorough
// - Mention which part of the book the answer comes from when relevant
// - If the question is about something not covered in the excerpts, say so clearly

// BOOK EXCERPTS:
// ${contextText}

// USER QUESTION: ${question}

// ANSWER:`;

//   console.log(`🤖 Generating answer with Gemini...`);

//   // ✅ Use genAI.models.generateContent — NOT genAI.getGenerativeModel()
//   const result = await genAI.models.generateContent({
//     model: "gemini-2.0-flash",
//     contents: prompt,
//   });

//   // ✅ result.text is a property — NOT result.response.text()
//   const answer = result.text;

//   const sources = [...new Map(contextChunks.map((c) => [c.bookId, { bookTitle: c.bookTitle, bookId: c.bookId, relevanceScore: c.score }])).values()];

//   return { answer, sources };
// }

// module.exports = { generateAnswer };
