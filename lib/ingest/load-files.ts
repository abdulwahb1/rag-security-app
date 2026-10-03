import { readdirSync, readFileSync } from "fs";
import { join } from "path";

export type RawDoc = {
  path: string; // e.g. data/raw/nestjs/cors.md
  source: "owasp" | "nestjs";
  url: string | null; // null is fine for now
  markdown: string;
};

export function loadRawDocs(): RawDoc[] {
  const docs: RawDoc[] = [];

  // nestjs
  const nestDir = "data/raw/nestjs";
  for (const file of readdirSync(nestDir)) {
    if (!file.endsWith(".md")) continue;
    docs.push({
      path: join(nestDir, file),
      source: "nestjs",
      url: null,
      markdown: readFileSync(join(nestDir, file), "utf8"),
    });
  }

  // owasp
  const owaspDir = "data/raw/owasp-api-2023";
  for (const file of readdirSync(owaspDir)) {
    if (!file.endsWith(".md")) continue;
    docs.push({
      path: join(owaspDir, file),
      source: "owasp",
      url: null,
      markdown: readFileSync(join(owaspDir, file), "utf8"),
    });
  }

  return docs;
}
