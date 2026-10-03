export const config = {
  // Embeddings (Gemini free tier, 1536 to match your migration)
  embedding: {
    provider: "jina" as const,
    model: "jina-embeddings-v3",
    dimensions: 1024,
  },

  // Chat LLM
  llm: {
    provider: "groq" as const,
    // llama-3.3-70b-versatile is deprecated on free/dev Groq tiers
    model: "openai/gpt-oss-20b",
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
