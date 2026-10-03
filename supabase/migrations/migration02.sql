create or replace function match_chunks(
  query_embedding vector(1024),
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  context_header text,
  metadata jsonb,
  token_count int,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.content,
    c.context_header,
    c.metadata,
    c.token_count,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;