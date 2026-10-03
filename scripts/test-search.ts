import { embedTexts } from "../lib/ingest/embed";
import { supabaseAdmin } from "../lib/supabase";
import { config } from "../lib/config";

const question = "How do I enable CORS in NestJS?";

const [queryEmbedding] = await embedTexts([question], "retrieval.query");

const { data, error } = await supabaseAdmin.rpc("match_chunks", {
  query_embedding: queryEmbedding,
  match_count: config.retrieval.topK,
});

if (error) throw error;

console.log("Q:", question);
for (const row of data ?? []) {
  console.log((row.similarity as number).toFixed(3), "|", row.context_header);
  console.log(String(row.content).slice(0, 120).replace(/\n/g, " "));
  console.log("---");
}
