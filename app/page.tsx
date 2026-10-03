"use client";

import { FormEvent, useState } from "react";

type Source = {
  header: string;
  similarity: number;
};

type Turn = {
  question: string;
  answer: string;
  sources: Source[];
};

function formatError(raw: unknown): string {
  if (typeof raw !== "string") return "Request failed";
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message ?? raw;
  } catch {
    return raw;
  }
}

const SUGGESTIONS = [
  "How do I enable CORS in NestJS?",
  "Which OWASP category is broken object level authorization?",
  "How does NestJS rate limiting work?",
];

export default function Home() {
  const [question, setQuestion] = useState("");
  const [turn, setTurn] = useState<Turn | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");
    setQuestion(trimmed);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(formatError(data.error));
      }

      setTurn({
        question: trimmed,
        answer: data.answer ?? "",
        sources: data.sources ?? [],
      });
    } catch (err) {
      setTurn(null);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(question);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Docs RAG
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
          API Security Docs Assistant
        </h1>
        <p className="max-w-xl text-base leading-7 text-muted">
          Ask about OWASP API Top 10 or NestJS security. Answers come from your
          retrieved docs, with citations you can check.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-border bg-panel/90 p-3 shadow-[0_20px_50px_-32px_rgba(20,32,28,0.45)] backdrop-blur"
      >
        <label htmlFor="question" className="sr-only">
          Question
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="Ask a security or NestJS docs question…"
          className="w-full resize-none rounded-xl bg-transparent px-3 py-2 text-base text-foreground outline-none placeholder:text-muted/70"
        />
        <div className="mt-2 flex items-center justify-between gap-3 px-1">
          <p className="hidden text-xs text-muted sm:block">
            Grounded in OWASP + NestJS chunks
          </p>
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="ml-auto rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Retrieving…" : "Ask"}
          </button>
        </div>
      </form>

      {!turn && !loading && !error ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void ask(s)}
              className="rounded-full border border-border bg-panel/70 px-3 py-1.5 text-left text-xs text-muted transition hover:border-accent hover:text-accent"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="fade-up mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="fade-up mt-8 space-y-3">
          <div className="h-16 animate-pulse rounded-2xl bg-white/70" />
          <div className="h-28 animate-pulse rounded-2xl bg-white/70" />
        </div>
      ) : null}

      {turn && !loading ? (
        <div className="fade-up mt-8 space-y-4">
          <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-accent px-4 py-3 text-sm leading-6 text-white">
            {turn.question}
          </div>

          <div className="max-w-[95%] space-y-3 rounded-2xl rounded-bl-md border border-border bg-panel px-4 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Answer
            </p>
            <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
              {turn.answer}
            </div>
          </div>

          {turn.sources.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">Sources</h2>
              <ol className="grid gap-2 sm:grid-cols-2">
                {turn.sources.map((s, i) => (
                  <li
                    key={`${s.header}-${i}`}
                    className="rounded-xl border border-border bg-accent-soft/40 px-3 py-2.5 text-sm text-foreground"
                  >
                    <div className="font-medium">
                      [{i + 1}] {s.header}
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted">
                      similarity {(s.similarity ?? 0).toFixed(3)}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
