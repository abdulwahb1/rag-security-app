import { unified } from "unified";
import remarkParse from "remark-parse";

export function parseMarkdown(md: string) {
  return unified().use(remarkParse).parse(md);
}
