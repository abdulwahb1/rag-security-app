import { readFileSync } from "fs";
import { parseMarkdown } from "../lib/ingest/parse";

const md = readFileSync("data/raw/nestjs/cors.md", "utf8");
const tree = parseMarkdown(md);
console.log(tree.type); // should be "root"
console.log(tree.children.length); // > 0
console.log(tree);
