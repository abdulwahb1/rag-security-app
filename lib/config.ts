export const config = {
  // Embeddings (Gemini free tier, 1536 to match your migration)
  embedding: {
    provider: "google" as const,
    model: "gemini-embedding-001",
    dimensions: 1536,
  },

  // Chat LLM
  llm: {
    provider: "xai" as const, // or "google" if you use Gemini for chat too
    model: "grok-2-latest", // confirm current model id in xAI docs
    temperature: 0.2,
  },

  // Chunking (brief §7)
  chunking: {
    targetTokensMin: 300,
    targetTokensMax: 600,
    hardCapTokens: 800,
    mergeBelowTokens: 100,
    overlapPercent: 0.1,
  },

  // Retrieval (brief §9) — start baseline, change later for experiments
  retrieval: {
    topK: 5,
    candidateK: 20, // for rerank later
    useHybrid: false,
    useRerank: false,
  },
} as const;
