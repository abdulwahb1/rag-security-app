import { readFileSync } from "fs";
import { parseMarkdown } from "../lib/ingest/parse";
import { getSections } from "../lib/ingest/heading-tree";
import { sectionsToChunks } from "../lib/ingest/chunk";

const md = readFileSync("data/raw/nestjs/cors.md", "utf8");
const sections = getSections(parseMarkdown(md));
const chunks = sectionsToChunks(sections, { source: "nestjs", url: null });

for (const c of chunks) {
  console.log(c.context_header, "| tokens:", c.metadata.token_count);
}
