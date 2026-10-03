import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { embedTexts } from "../lib/ingest/embed";
import { supabaseAdmin } from "../lib/supabase";
import { config } from "../lib/config";

type Question = {
  id: string;
  question: string;
  expected_answer: string;
  expected_source_chunks: string[];
  type: string;
};

const questions: Question[] = JSON.parse(
  readFileSync("eval/questions.json", "utf8"),
);

async function search(question: string) {
  const [queryEmbedding] = await embedTexts([question], "retrieval.query");
  const { data, error } = await supabaseAdmin.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: config.retrieval.topK,
  });
  if (error) throw error;
  return data as { context_header: string; similarity: number }[];
}

function rankOfHit(headers: string[], expected: string[]): number | null {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (expected.some((e) => h.includes(e) || e.includes(h))) {
      return i + 1; // 1-based rank
    }
  }
  return null;
}

const results = [];
let hits = 0;
let mrrSum = 0;
let scored = 0;

for (const q of questions) {
  if (q.type === "unanswerable") {
    results.push({ id: q.id, skipped: true, reason: "unanswerable" });
    continue;
  }

  const rows = await search(q.question);
  const headers = rows.map((r) => r.context_header);
  const rank = rankOfHit(headers, q.expected_source_chunks);

  scored++;
  if (rank !== null) {
    hits++;
    mrrSum += 1 / rank;
  }

  console.log(
    q.id,
    rank ? `HIT rank=${rank}` : "MISS",
    "|",
    q.question.slice(0, 60),
  );

  results.push({
    id: q.id,
    question: q.question,
    rank,
    hit_at_5: rank !== null,
    top_headers: headers,
  });

  await Bun.sleep(300); // be nice to Jina
}

const hitAt5 = hits / scored;
const mrr = mrrSum / scored;

console.log("---");
console.log("scored:", scored);
console.log("Hit@5:", hitAt5.toFixed(3));
console.log("MRR:", mrr.toFixed(3));

mkdirSync("eval/results", { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const out = {
  variant: "vector-only-baseline",
  hit_at_5: hitAt5,
  mrr,
  scored,
  results,
};
writeFileSync(`eval/results/${stamp}.json`, JSON.stringify(out, null, 2));
console.log("wrote eval/results/" + stamp + ".json");
