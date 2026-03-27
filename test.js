// import { OpenRouter } from "@openrouter/sdk";

(async () => {
  // Stream the response to
  // get reasoning tokens in usage
  const { OpenRouter } = await import("@openrouter/sdk");
  const openrouter = new OpenRouter({
    apiKey: "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",
  });
  try {
    const stream = await openrouter.chat.send({
      // ✅ Wrap your config inside this property
      chatGenerationParams: {
        model: "openrouter/free",
        messages: [
          {
            role: "user",
            content: "How many r's are in the word 'strawberry'?",
          },
        ],
      },
      // ✅ Stream goes outside the params in this SDK version
      stream: false,
    });
    console.log(stream.choices[0]?.message);

    const content = stream.choices[0]?.message.content;
  } catch (err) {
    console.error("SDK Error Details:", err.message);
    if (err.cause) console.error("Validation issues:", err.cause.issues);
  }
})();
