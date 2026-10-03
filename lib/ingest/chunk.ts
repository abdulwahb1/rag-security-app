import { encode } from "gpt-tokenizer";
import { Section } from "./heading-tree";
import { Chunk } from "./types";
import { config } from "../config";
import { toMarkdown } from "mdast-util-to-markdown";
import type { Code, RootContent } from "mdast";

type Opts = { source: "owasp" | "nestjs"; url: string | null };

function countTokens(text: string) {
  return encode(text).length;
}

function nodesToMarkdown(nodes: RootContent[]) {
  return toMarkdown({ type: "root", children: nodes }).trim();
}

function makeChunk(content: string, section: Section, opts: Opts): Chunk {
  return {
    content,
    context_header: section.path.join(" > "),
    metadata: {
      source: opts.source,
      url: opts.url,
      heading_path: section.path,
      chunk_type: "prose", // refine later
      token_count: countTokens(content),
      updated_at: new Date().toISOString(),
    },
  };
}

function splitOversizedNode(node: RootContent): RootContent[][] {
  const hardCap = config.chunking.hardCapTokens;

  // Non-code: split serialized markdown on lines (tables, lists, prose)
  if (node.type !== "code") {
    const text = nodesToMarkdown([node]);
    const units = text.split("\n");
    const groups: RootContent[][] = [];
    let buf: string[] = [];

    for (const unit of units) {
      const trial = buf.length ? buf.join("\n") + "\n" + unit : unit;

      if (buf.length && countTokens(trial) > hardCap) {
        groups.push([{ type: "html", value: buf.join("\n") }]);
        buf = [unit];
      } else {
        buf.push(unit);
      }
    }

    if (buf.length) {
      groups.push([{ type: "html", value: buf.join("\n") }]);
    }

    return groups;
  }

  // Code: pack lines under hard cap, keep language tag on each piece
  const code = node as Code;
  const lang = code.lang ?? null;
  const units = code.value.split("\n");
  const groups: RootContent[][] = [];
  let buf: string[] = [];

  for (const unit of units) {
    const trial = buf.length ? buf.join("\n") + "\n" + unit : unit;
    const wrapped = "```" + (lang ?? "") + "\n" + trial + "\n```";

    if (buf.length && countTokens(wrapped) > hardCap) {
      groups.push([{ type: "code", lang, value: buf.join("\n") }]);
      buf = [unit];
    } else {
      buf.push(unit);
    }
  }

  if (buf.length) {
    groups.push([{ type: "code", lang, value: buf.join("\n") }]);
  }

  return groups;
}

function splitSectionNodes(nodes: RootContent[]): RootContent[][] {
  const hardCap = config.chunking.hardCapTokens;
  const groups: RootContent[][] = [];
  let current: RootContent[] = [];
  for (const node of nodes) {
    const aloneTokens = countTokens(nodesToMarkdown([node]));

    // Case 1: this single node is already too big
    if (aloneTokens > hardCap) {
      if (current.length) {
        groups.push(current);
        current = [];
      }
      groups.push(...splitOversizedNode(node));
      continue;
    }

    // Case 2: normal packing
    const trial = [...current, node];
    const trialTokens = countTokens(nodesToMarkdown(trial));

    if (current.length > 0 && trialTokens > hardCap) {
      groups.push(current);
      current = [node];
    } else {
      current = trial;
    }
  }

  if (current.length) groups.push(current);
  return groups;
}

export function sectionsToChunks(sections: Section[], opts: Opts) {
  const chunks: Chunk[] = [];

  for (const section of sections) {
    if (!section.markdown.trim()) continue;

    const groups = splitSectionNodes(section.nodes);
    for (const group of groups) {
      const content = nodesToMarkdown(group);
      if (!content) continue;
      chunks.push(makeChunk(content, section, opts));
    }
  }

  return chunks;
}
