import { loadRawDocs } from "../lib/ingest/load-files";
import { parseMarkdown } from "../lib/ingest/parse";
import { getSections } from "../lib/ingest/heading-tree";
import { sectionsToChunks } from "../lib/ingest/chunk";

const docs = loadRawDocs();
let totalChunks = 0;
const allTokens: number[] = [];

for (const doc of docs) {
  const sections = getSections(parseMarkdown(doc.markdown));
  const chunks = sectionsToChunks(sections, {
    source: doc.source,
    url: doc.url,
  });

  for (const c of chunks) {
    if (c.metadata.token_count > 800) {
      console.log("OVER:", doc.path, c.metadata.token_count);
      console.log(c.content.slice(0, 200));
      console.log("---");
    }
  }

  const tokens = chunks.map((c) => c.metadata.token_count);
  totalChunks += chunks.length;
  allTokens.push(...tokens);

  const max = tokens.length ? Math.max(...tokens) : 0;
  console.log(`${doc.path} → ${chunks.length} chunks (max tokens: ${max})`);
}

const avg = allTokens.length
  ? Math.round(allTokens.reduce((a, b) => a + b, 0) / allTokens.length)
  : 0;

console.log("---");
console.log("files:", docs.length);
console.log("total chunks:", totalChunks);
console.log(
  "tokens min/avg/max:",
  Math.min(...allTokens),
  avg,
  Math.max(...allTokens),
);
