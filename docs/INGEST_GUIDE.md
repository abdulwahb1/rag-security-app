# Ingest Guide (beginner)

This doc explains **what you are building right now** and **why**, in plain language.
Follow it in order. You do not need to understand RAG theory first.

---

## The big picture in one sentence

Your app will answer questions using **pieces of the docs you downloaded**, not by guessing from the internet.

Those pieces are called **chunks**.

```
raw markdown files  →  cut into chunks  →  store in database  →  later: find best chunks for a question  →  LLM answers using them
         ↑
   you are here (cutting into chunks)
```

You already finished:
- downloaded OWASP + NestJS docs into `data/raw/`
- set up Supabase tables for documents + chunks

You have **not** done yet:
- turning those files into chunks
- saving chunks into the DB
- building the chat UI

---

## Why we cannot just dump a whole file into the AI

A NestJS auth doc can be huge (thousands of lines). Models and search work better with **small, focused pieces**.

Bad approach: one giant blob per file  
Good approach: many small pieces like:

1. "What is CORS?"
2. "How to enable CORS in Nest"
3. "CORS config options + example code"

When someone asks *"How do I enable CORS in Nest?"*, you want piece #2, not the whole security docs.

That cutting process = **chunking**.

---

## What each weird word means

| Word | Plain meaning |
|---|---|
| **Chunk** | One small piece of a doc you will store and search later |
| **Markdown** | The `.md` text files in `data/raw/` |
| **AST** | A structured tree version of the markdown (headings, paragraphs, code blocks as objects), so you can walk it in code instead of hacking strings |
| **Parser** | Code that turns markdown text → AST (`lib/ingest/parse.ts` — you already started this) |
| **Heading path** | Breadcrumb of titles, e.g. `["Guards", "Getting started"]` |
| **Context header** | Same idea as a label on the chunk, e.g. `NestJS Docs > Guards` so the AI knows where the piece came from |
| **Tokens** | Roughly "word pieces" the model counts. We use them as a size limit (~300–800 per chunk) |
| **Embedding** | A later step: turn chunk text into a number vector for similarity search. **Not now.** |
| **Ingest** | The whole pipeline: read files → chunk → embed → insert into DB |

Right now you only care about: **read files → chunk**.

---

## What you are building in `lib/ingest/`

Think of an assembly line. Each file does one job.

### 1. `types.ts` (you already have this)
Describes what a Chunk looks like in TypeScript.

A chunk is basically:

- `content` — the actual text
- `context_header` — label like `API1:2023 Broken Object Level Authorization`
- `metadata` — source, url, headings, token count, etc.

### 2. `parse.ts` (you already have this)
Input: markdown string  
Output: AST tree

You do not need to understand every AST node. Just know: after parse, you can loop over headings / paragraphs / code blocks.

### 3. `heading-tree.ts` (write next)
Input: AST  
Output: list of **sections**

A section = "everything under this heading until the next same-level heading".

Example from a Nest guards doc:

```
## Guards          ← section starts
paragraph...
### Binding guards ← nested section
more text...
```

You want:

```ts
[
  { heading_path: ["Guards"], nodes: [...] },
  { heading_path: ["Guards", "Binding guards"], nodes: [...] },
]
```

This is just organizing the file by titles.

### 4. `chunk.ts` (the main logic)
Input: sections  
Output: `Chunk[]`

Rules (from the project brief), in plain English:

1. Prefer keeping a whole section as one chunk if size is OK.
2. If a section is tiny (< ~100 tokens), merge it into its parent.
3. If a section is huge (> ~800 tokens), split it — but **never cut through the middle of a code block**.
4. If text says "for example:" and a code block follows, keep text + code together.
5. Fill in `context_header` and metadata.

### 5. `load-files.ts`
Input: folder paths  
Output: list of `{ path, source, markdown }`

Just reads `data/raw/owasp-api-2023/*.md` and `data/raw/nestjs/*.md`.

### 6. `scripts/chunk-dry-run.ts`
A script you run locally:

```bash
bun scripts/chunk-dry-run.ts
```

It should print things like:

```
nestjs/cors.md → 2 chunks (tokens: 120, 340)
owasp/.../0xa1-....md → 5 chunks
...
Total: 180 chunks
```

No database. No API keys. Just proof your cutter works.

---

## How this connects to the final app

Later milestones (not now):

1. Take each chunk → call Gemini embedding API → get a vector of 1536 numbers  
2. Save chunk + vector into Supabase `chunks` table  
3. User asks a question → embed the question → find nearest chunks → send those chunks to Grok/Groq → stream the answer with citations  

If chunking is bad, retrieval is bad, answers are bad.  
That is why this boring step matters.

---

## Your build order (do one checkbox at a time)

Copy this into a note if you want.

### Checkpoint A — types + parse (done if they compile)
- [x] `types.ts` exists
- [x] `parse.ts` exists
- [ ] Run a tiny test in a scratch script:

```ts
import { readFileSync } from "fs";
import { parseMarkdown } from "../lib/ingest/parse";

const md = readFileSync("data/raw/nestjs/cors.md", "utf8");
const tree = parseMarkdown(md);
console.log(tree.type);           // should be "root"
console.log(tree.children.length) // > 0
```

If that prints, you understand parse: **file text in → tree out**.

### Checkpoint B — heading tree
Write `heading-tree.ts` that, for `cors.md` or `guards.md`, logs heading paths.

Success looks like:

```
["CORS"]
["CORS", "Getting started"]
```

(Exact titles depend on the file.)

Tip: walk `tree.children` in order. Keep a stack of current headings. When you see a heading node, update the stack. Everything else belongs to the current path.

### Checkpoint C — naive chunks (ignore fancy rules first)
For each section, make **one chunk**:

- `content` = text of that section
- `context_header` = heading path joined with ` > `
- `token_count` = `encode(content).length` from `gpt-tokenizer`
- fill metadata as best you can

Run dry-run. Celebrate even if sizes are ugly.

### Checkpoint D — apply size rules
Only after C works:

- merge tiny sections
- split oversized sections
- keep code fences whole
- bind "for example" + code

### Checkpoint E — full corpus dry-run
Run over **all** files in `data/raw`.  
Write down total chunk count. That number is your first real project metric.

---

## What you can ignore for now

- LangChain
- Supabase inserts
- Gemini embeddings
- Hybrid search / rerank
- The chat UI
- "AST" deep theory

If a tutorial starts talking about vectors, skip it until chunk dry-run works.

---

## Mini glossary of your files on disk

```
data/raw/nestjs/*.md          ← source documents (ingredients)
data/raw/owasp-api-2023/*.md  ← source documents
lib/ingest/*.ts               ← cutter machines
scripts/chunk-dry-run.ts      ← test button
lib/config.ts                 ← knobs (chunk size limits)
supabase/migrations/...       ← empty shelves in the DB waiting for chunks later
```

---

## When you get stuck

Paste one of these into chat:

1. Your `heading-tree.ts` + what it printed  
2. One weird chunk from dry-run  
3. An error stack trace  

Ask for help on **one function at a time**, not the whole pipeline.

---

## After chunking works

Next doc/step will be: **embed + load into Supabase**.  
Do not start that until dry-run looks sane.
