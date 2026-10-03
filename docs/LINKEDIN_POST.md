# LinkedIn post draft — API Security Docs Assistant

Screenshots:
- `docs/linkedin-rag-assistant.png` — question + grounded answer
- `docs/linkedin-rag-assistant-with-sources.png` — answer + cited sources with similarity scores

## One-liner
Built a RAG assistant that answers NestJS security and OWASP API Top 10 questions with real citations — not vibes.

## Short post (copy/paste)

I built a small RAG app that answers developer questions about **API security** using the OWASP API Security Top 10 (2023) and NestJS security docs.

Instead of a generic “chat with a PDF” demo, I focused on the parts that usually get skipped:

- Structure-aware chunking (headings + code blocks kept intact)
- Embeddings into Supabase (pgvector)
- Baseline retrieval eval (Hit@5 / MRR on hand-written questions)
- Grounded answers with source headers you can verify
- Deployed with a keep-alive cron so free-tier Supabase stays awake

Example: ask “How do I enable CORS in NestJS?” and it retrieves the right docs chunks, then answers with citations.

Stack: Next.js, Supabase + pgvector, Jina embeddings, Groq for generation.

Repo: https://github.com/abdulwahb1/rag-security-app

#RAG #APISecurity #OWASP #NestJS #BuildInPublic

## Talking points (if you expand the post)
- Why eval before polishing the UI: Hit@5 ~0.93 / MRR ~0.80 on the first 14 answerable questions (vector-only baseline)
- Why refusals can still happen: strict “answer only from context” prompt + retrieval misses on some phrasings
- What’s next: hybrid search, reranking, fuller eval set, streaming

## Hashtag bank
`#RAG` `#LLM` `#APISecurity` `#OWASP` `#NestJS` `#Supabase` `#NextJS` `#BuildInPublic` `#TypeScript`
