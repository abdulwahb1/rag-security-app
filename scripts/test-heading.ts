import { readFileSync } from "fs";
import { parseMarkdown } from "../lib/ingest/parse";
import { getSections } from "../lib/ingest/heading-tree";

const md = readFileSync("data/raw/nestjs/cors.md", "utf8");
const sections = getSections(parseMarkdown(md));

for (const s of sections) {
  console.log(s.path.join(" > ") || "(intro)", "| nodes:", s.nodes.length);
}
