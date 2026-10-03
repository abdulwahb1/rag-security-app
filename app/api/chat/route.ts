import { NextRequest, NextResponse } from "next/server";
import { searchVector } from "@/lib/retrieval/vector";
import { buildAnswerPrompt } from "@/lib/prompts/answer";
import { config } from "@/lib/config";

export async function POST(req: NextRequest) {
  const { question } = await req.json();
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }

  const chunks = await searchVector(question);
  const { system, user } = buildAnswerPrompt(question, chunks);

  const groqRes = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY ?? process.env.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL ?? config.llm.model,
        temperature: config.llm.temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    },
  );

  if (!groqRes.ok) {
    const raw = await groqRes.text();
    let message = raw;
    try {
      message = JSON.parse(raw)?.error?.message ?? raw;
    } catch {
      // keep raw text
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const json = await groqRes.json();
  const answer = json.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({
    answer,
    sources: chunks.map((c) => ({
      header: c.context_header,
      similarity: c.similarity,
    })),
  });
}
