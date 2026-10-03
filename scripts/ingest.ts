import { parseMarkdown } from "../lib/ingest/parse";
import { getSections } from "../lib/ingest/heading-tree";
import { sectionsToChunks } from "../lib/ingest/chunk";
import { embedTexts } from "../lib/ingest/embed";
import { supabaseAdmin } from "../lib/supabase";
import { loadRawDocs } from "../lib/ingest/load-files";

const BATCH = 8;
const docs = loadRawDocs();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

for (const [i, doc] of docs.entries()) {
  console.log(`[${i + 1}/${docs.length}] ${doc.path}`);

  const chunks = sectionsToChunks(getSections(parseMarkdown(doc.markdown)), {
    source: doc.source,
    url: doc.url,
  });
  if (!chunks.length) continue;

  const { data: row, error: docErr } = await supabaseAdmin
    .from("documents")
    .insert({ source: doc.source, url: doc.path })
    .select("id")
    .single();
  if (docErr) throw docErr;

  for (let start = 0; start < chunks.length; start += BATCH) {
    await sleep(500);
    const slice = chunks.slice(start, start + BATCH);
    const texts = slice.map((c) => `${c.context_header}\n\n${c.content}`);
    const vectors = await embedTexts(texts);

    const rows = slice.map((c, j) => ({
      document_id: row.id,
      content: c.content,
      context_header: c.context_header,
      embedding: vectors[j],
      metadata: c.metadata,
      token_count: c.metadata.token_count,
    }));

    const { error } = await supabaseAdmin.from("chunks").insert(rows);
    if (error) throw error;
  }
}

console.log("done");
