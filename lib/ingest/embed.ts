import { config } from "../config";

const JINA_API_KEY = process.env.JINA_API_KEY;

type EmbedTask = "retrieval.passage" | "retrieval.query";

export async function embedTexts(
  texts: string[],
  task: EmbedTask = "retrieval.passage",
): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (!JINA_API_KEY) throw new Error("JINA_API_KEY is missing");

  const response = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${JINA_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.embedding.model,
        task,
      dimensions: config.embedding.dimensions,
      input: texts,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Jina embed failed: ${response.status} ${await response.text()}`,
    );
  }

  const json = await response.json();
  const items = json.data as { embedding: number[]; index: number }[];

  // sort by index in case order is shuffled
  items.sort((a, b) => a.index - b.index);

  return items.map((item) => {
    if (item.embedding.length !== config.embedding.dimensions) {
      throw new Error(
        `Expected ${config.embedding.dimensions} dims, got ${item.embedding.length}`,
      );
    }
    return item.embedding;
  });
}
