# Project Brief: API Security and Docs RAG Assistant

## 1. Overview

A production-minded Retrieval-Augmented Generation (RAG) app that answers developer questions about API security and framework documentation, with cited sources. The v1 corpus is the OWASP API Security Top 10 (2023) and the NestJS documentation.

The goal is a portfolio project that shows retrieval quality, measurable evaluation, and deployment discipline, not a generic "chat with your PDF" demo.

## 2. Goals

- Build an end-to-end RAG pipeline: ingestion, retrieval, generation, evaluation.
- Measure every change with a hand-written eval set and record the results.
- Ship a deployed, streaming UI with citations, tracing, and basic guardrails.
- Produce a short write-up with a table showing how each design decision moved the eval scores.

## 3. Non-Goals (v1)

- No multi-user accounts or billing.
- No OpenAPI spec ingestion (planned for v2).
- No fine-tuning or custom model training.
- No more than two document sources.

## 4. Tech Stack

| Layer | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript |
| Database | Supabase Postgres with pgvector |
| Orchestration | LangChain JS (ingestion and retrieval), Vercel AI SDK for streaming |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims), swappable |
| LLM | Configurable via env var, one provider for v1 |
| Reranker | Cohere Rerank or a cross-encoder, added after the baseline is measured |
| Tracing | Langfuse (or LangSmith) |
| Deployment | Vercel |

## 5. Architecture

```
Docs (markdown) -> Parser (AST) -> Structure-aware chunker -> Context header
   -> Embeddings -> Supabase (pgvector + tsvector)

User question -> Query handling -> Hybrid retrieval (vector + full-text)
   -> Rerank -> Prompt assembly with citations -> LLM (streamed) -> UI
                                   |
                                   +-> Tracing, cost, latency logging
```

## 6. Data Sources

1. **OWASP API Security Top 10 (2023).** Each risk (API1 to API10) follows a fixed template: description, example attack scenarios, how to prevent.
2. **NestJS documentation**, security-related sections first (authentication, authorization, guards, rate limiting, CORS, helmet, validation), then expand if time allows.

Keep raw source files in `/data/raw`, versioned, with the fetch date recorded.

## 7. Chunking Specification

Structure-aware chunking, not fixed-size splitting.

1. Parse markdown into an AST (`unified` + `remark`). Build a heading tree (H1 > H2 > H3).
2. Each section is a candidate chunk.
3. **Never split inside a fenced code block.** Treat code blocks as atomic. If one exceeds the limit, split on function or blank-line boundaries and repeat the language tag.
4. **Bind prose to its example.** If a paragraph ends with a colon or "for example" and a code block follows, keep them in one chunk.
5. Target 300 to 600 tokens, hard cap about 800. Merge sections under about 100 tokens into their parent.
6. Overlap 0 to 10%, only when a long prose section must be split.
7. **Prepend a context header** to the text before embedding, for example `NestJS Docs > Security > Authentication > JWT`.
8. OWASP: chunk by template section. Every chunk header includes the risk ID and name, for example `API1:2023 Broken Object Level Authorization`.

### Chunk metadata

`source`, `url`, `heading_path`, `chunk_type` (prose | code | mixed), `language`, `risk_id` (OWASP only), `token_count`, `updated_at`

## 8. Database Schema (starting point)

```sql
create extension if not exists vector;

create table documents (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  url text,
  fetched_at timestamptz default now()
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  context_header text not null,
  embedding vector(1536),
  tsv tsvector generated always as (
    to_tsvector('english', context_header || ' ' || content)
  ) stored,
  metadata jsonb not null default '{}',
  token_count int,
  created_at timestamptz default now()
);

create index on chunks using hnsw (embedding vector_cosine_ops);
create index on chunks using gin (tsv);
create index on chunks using gin (metadata);
```

Implement hybrid search as a Postgres function that returns the top N from vector similarity and top N from full-text, merged with Reciprocal Rank Fusion (RRF).

## 9. Retrieval

Build in this order, measuring after each step:

1. Baseline: vector similarity only, top 5.
2. Hybrid search (vector + full-text with RRF).
3. Reranking: retrieve top 20, rerank to top 5.
4. Optional: metadata filters (source, chunk_type) and query rewriting.

## 10. Generation

- System prompt requires answers to use only the retrieved context.
- Every claim cites a chunk (title + URL). Citations render as links in the UI.
- If the context does not contain the answer, respond that it is not covered rather than guessing.
- Stream responses to the UI.

## 11. Evaluation (core deliverable)

Create `/eval/questions.json` with 40 to 50 hand-written entries:

```json
{
  "id": "q001",
  "question": "Which OWASP API category covers broken object level authorization?",
  "expected_answer": "API1:2023 Broken Object Level Authorization",
  "expected_source_chunks": ["owasp-api1-description"],
  "type": "lookup"
}
```

Question types: lookup, how-to, code-oriented, multi-chunk, and unanswerable (the correct behavior is to decline).

**Metrics**

- Retrieval: hit rate at 5, MRR.
- Generation: faithfulness (answer supported by context), answer correctness, correct refusal rate on unanswerable questions.
- Operational: p50 and p95 latency, cost per query.

**Experiments to run and record in a results table**

| Variant | Hit@5 | MRR | Faithfulness | Notes |
|---|---|---|---|---|
| Fixed 500-token chunks, vector only | | | | baseline |
| Heading-based chunks | | | | |
| Heading-based + context headers | | | | |
| + hybrid search | | | | |
| + reranker | | | | |

Eval must be runnable with a single command (`pnpm eval`) and write results to `/eval/results/<timestamp>.json`.

## 12. Hardening and Observability

- Trace every request (query, retrieved chunks, prompt, response, latency, tokens, cost).
- Prompt injection defenses: treat retrieved text as untrusted data, delimit it clearly in the prompt, and instruct the model to ignore instructions found inside it. Test with a few poisoned chunks.
- Per-IP rate limiting on the API route.
- Input length limits and basic output checks.
- Secrets in environment variables only. Never expose the service role key to the client.

## 13. Suggested Repo Structure

```
/app                  Next.js routes and UI
/app/api/chat         streaming chat endpoint
/lib/ingest           parsing, chunking, embedding
/lib/retrieval        hybrid search, rerank
/lib/prompts          system and answer prompts
/lib/tracing          Langfuse setup
/data/raw             source documents
/eval                 questions.json, runner, results/
/scripts              ingest.ts, eval.ts
/supabase/migrations  SQL migrations
README.md             overview, setup, results table, design decisions
```

## 14. Milestones

1. **Setup:** repo, Supabase project, pgvector migration, env config.
2. **Ingestion:** fetch sources, chunker, embeddings, load into DB.
3. **Baseline:** naive chunking + vector search + basic answer route. Write the first 15 eval questions and measure retrieval only.
4. **Improve retrieval:** structure-aware chunking, context headers, hybrid search, reranker. Record results after each.
5. **Generation:** citations, refusal behavior, streaming UI.
6. **Eval suite:** complete 40 to 50 questions, add generation metrics, one-command runner.
7. **Hardening:** tracing, rate limiting, injection tests.
8. **Ship:** deploy, write README and write-up with results table and design decisions.

## 15. Definition of Done

- Live deployed URL with streaming answers and clickable citations.
- Eval suite runs with one command and the results table is in the README.
- Hybrid search and reranking each show a measured improvement (or an honest note if they did not).
- Traces visible in Langfuse for a sample of queries.
- README explains architecture, key decisions, trade-offs, and what was tried and dropped.

## 16. Instructions for Cursor

- Work milestone by milestone. Do not skip ahead.
- Use TypeScript strict mode. Keep functions small and typed.
- Put all tunable values (chunk size, top-k, model names) in a single config file so experiments are easy to rerun.
- Write the eval runner before optimizing anything.
- Ask before adding new dependencies beyond the stack above.
- After each milestone, summarize what changed and what to measure next.

## 17. Future Work (v2)

- OpenAPI spec ingestion with endpoint-aware chunking.
- Query rewriting and multi-query retrieval.
- Agent layer that calls the RAG pipeline as a tool.
- Automated eval in CI.
