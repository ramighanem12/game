import { NextResponse } from "next/server";
import { normalizeAnswer, type Difficulty } from "@/game/modes";

export const runtime = "nodejs";

type PrepareRequest = {
  prompt?: string;
  guidance?: string;
  examples?: string[];
  difficulty?: Difficulty;
  roundNonce?: string;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

const fallbackAnswer = (examples: string[] = []) =>
  examples.length
    ? examples[Math.floor(Math.random() * examples.length)]
    : "eagle";

const extractText = (data: OpenAIResponse) =>
  data.output_text ??
  data.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("")
    .trim() ??
  "";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const body = (await request.json()) as PrepareRequest;
  const prompt = body.prompt?.trim() ?? "";
  const guidance = body.guidance?.trim() ?? "";
  const examples = body.examples ?? [];
  const difficulty = body.difficulty ?? "medium";
  const roundNonce = body.roundNonce ?? crypto.randomUUID();

  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt." }, { status: 400 });
  }

  if (!apiKey) {
    const answer = fallbackAnswer(examples);

    return NextResponse.json({
      answer,
      normalizedAnswer: normalizeAnswer(answer),
      source: "fallback",
    });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-nano",
      max_output_tokens: 60,
      temperature: 0.9,
      input: [
        {
          role: "system",
          content:
            "You secretly choose one answer for a party elimination trivia game. Pick a valid answer that a normal player might say. Do not always choose the first or most obvious example. Use the nonce to vary choices across rounds. Prefer broad/obvious answers on easy, balanced answers on medium, and slightly less obvious but still fair answers on hard. Return only JSON.",
        },
        {
          role: "user",
          content: JSON.stringify({
            prompt,
            guidance,
            examples,
            difficulty,
            roundNonce,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "dont_say_secret_answer",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              answer: {
                type: "string",
                description: "The AI's hidden answer.",
              },
            },
            required: ["answer"],
          },
        },
      },
    }),
  });

  const data = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    const answer = fallbackAnswer(examples);

    return NextResponse.json({
      answer,
      normalizedAnswer: normalizeAnswer(answer),
      source: "fallback",
      warning: data.error?.message ?? "OpenAI hidden-answer generation failed.",
    });
  }

  const parsed = JSON.parse(extractText(data)) as { answer?: string };
  const answer = parsed.answer?.trim() || fallbackAnswer(examples);

  return NextResponse.json({
    answer,
    normalizedAnswer: normalizeAnswer(answer),
    source: "openai",
  });
}
