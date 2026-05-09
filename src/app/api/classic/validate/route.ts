import { NextResponse } from "next/server";
import { normalizeAnswer } from "@/game/modes";

export const runtime = "nodejs";

type ValidateRequest = {
  prompt?: string;
  guidance?: string;
  answer?: string;
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
  const body = (await request.json()) as ValidateRequest;
  const prompt = body.prompt?.trim() ?? "";
  const guidance = body.guidance?.trim() ?? "";
  const answer = body.answer?.trim() ?? "";

  if (!prompt || !answer) {
    return NextResponse.json(
      { error: "Missing prompt or answer." },
      { status: 400 },
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "Add OPENAI_API_KEY to .env.local to validate open answers." },
      { status: 500 },
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-nano",
      max_output_tokens: 80,
      input: [
        {
          role: "system",
          content:
            "You validate fast trivia answers. Decide if the user's answer satisfies the exact prompt. Be permissive with synonyms, common names, singular/plural, and short names, but reject jokes, overly broad categories, and answers outside the requested category. Return only JSON.",
        },
        {
          role: "user",
          content: JSON.stringify({
            prompt,
            guidance,
            answer,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "classic_open_answer_validation",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              counts: {
                type: "boolean",
                description: "Whether the answer satisfies the prompt.",
              },
              canonicalAnswer: {
                type: "string",
                description: "A short clean display version of the answer.",
              },
              reason: {
                type: "string",
                description: "Short reason, under 12 words.",
              },
            },
            required: ["counts", "canonicalAnswer", "reason"],
          },
        },
      },
    }),
  });

  const data = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? "OpenAI validation failed." },
      { status: response.status },
    );
  }

  const parsed = JSON.parse(extractText(data)) as {
    counts?: boolean;
    canonicalAnswer?: string;
    reason?: string;
  };
  const canonicalAnswer = parsed.canonicalAnswer?.trim() || answer;

  return NextResponse.json({
    counts: Boolean(parsed.counts),
    canonicalAnswer,
    normalizedAnswer: normalizeAnswer(canonicalAnswer),
    reason: parsed.reason?.trim() || "",
  });
}
