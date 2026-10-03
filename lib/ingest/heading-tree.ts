import type { Root, RootContent, Heading } from "mdast";
import { toString } from "mdast-util-to-string";
import { toMarkdown } from "mdast-util-to-markdown";

export interface Section {
  heading: string;
  depth: number;
  path: string[]; // e.g. ["CORS", "Getting started"]
  nodes: RootContent[]; // everything under this heading, up to the next heading
  markdown: string; // section body serialized back to markdown
}

export function getSections(tree: Root): Section[] {
  const sections: Section[] = [];
  const stack: { depth: number; text: string }[] = [];
  let current: Section | null = null;

  const flush = () => {
    if (!current) return;
    current.markdown = toMarkdown({
      type: "root",
      children: current.nodes,
    }).trim();
    sections.push(current);
  };

  for (const node of tree.children) {
    if (node.type === "heading") {
      flush();

      const h = node as Heading;
      const text = toString(h);

      // pop headings that are the same level or deeper, so the stack is the parent chain
      while (stack.length && stack[stack.length - 1].depth >= h.depth)
        stack.pop();
      stack.push({ depth: h.depth, text });

      current = {
        heading: text,
        depth: h.depth,
        path: stack.map((s) => s.text),
        nodes: [],
        markdown: "",
      };
    } else {
      // content before the first heading goes into an intro section
      if (!current) {
        current = { heading: "", depth: 0, path: [], nodes: [], markdown: "" };
      }
      current.nodes.push(node);
    }
  }

  flush();
  return sections;
}
