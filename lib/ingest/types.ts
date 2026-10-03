export type ChunkType = "prose" | "code" | "mixed";

export type Chunk = {
  content: string;
  context_header: string;
  metadata: {
    source: "owasp" | "nestjs";
    url: string | null;
    heading_path: string[];
    chunk_type: ChunkType;
    language?: string;
    risk_id?: string; // e.g. "API1:2023"
    token_count: number;
    updated_at: string; // ISO date
  };
};
