import { embedTexts } from "../ingest/embed";
import { supabaseAdmin } from "../supabase";
import { config } from "../config";

export type RetrievedChunk = {
  id: string;
  content: string;
  context_header: string;
  similarity: number;
};

export async function searchVector(
  question: string,
  topK = config.retrieval.topK,
): Promise<RetrievedChunk[]> {
  const [queryEmbedding] = await embedTexts([question], "retrieval.query");
  const { data, error } = await supabaseAdmin.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: topK,
  });
  if (error) throw error;
  return (data ?? []) as RetrievedChunk[];
}
