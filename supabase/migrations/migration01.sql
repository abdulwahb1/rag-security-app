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