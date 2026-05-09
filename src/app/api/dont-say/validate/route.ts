import { NextResponse } from "next/server";
import { normalizeAnswer } from "@/game/modes";

export const runtime = "nodejs";

type ValidateRequest = {
  prompt?: string;
  guidance?: string;
  answer?: string;
  validationMode?: "open" | "finite";
  acceptedAnswers?: string[];
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
  const validationMode = body.validationMode ?? "open";
  const acceptedAnswers = body.acceptedAnswers ?? [];

  if (!prompt || !answer) {
    return NextResponse.json(
      { error: "Missing prompt or answer." },
      { status: 400 },
    );
  }

  if (validationMode === "finite") {
    const normalizedAnswer = normalizeAnswer(answer);
    const matchedAnswer = acceptedAnswers.find(
      (acceptedAnswer) => normalizeAnswer(acceptedAnswer) === normalizedAnswer,
    );

    return NextResponse.json({
      counts: Boolean(matchedAnswer),
      canonicalAnswer: matchedAnswer ?? answer,
      normalizedAnswer: normalizeAnswer(matchedAnswer ?? answer),
      reason: matchedAnswer ? "Accepted" : "Not in the accepted answer set",
    });
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "Add OPENAI_API_KEY to .env.local to validate this mode." },
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
      temperature: 0,
      input: [
        {
          role: "system",
          content:
            [
              "You are a strict factual validator for a trivia elimination game.",
              "Your job is not to be generous. Your job is to prevent wrong answers from counting.",
              "The user's answer counts only if it satisfies the entire question exactly.",
              "Parse every word of the prompt as a required constraint.",
              "Every qualifier matters: location, capital-city status, borders, flag features, continent, time period, category, material, authorship, membership, rank, order, quantity, or any other condition.",
              "Do not accept an answer just because it belongs to the broad category.",
              "For location prompts, verify the answer is actually in the requested place.",
              "For capital-city prompts, verify the answer is in a city that is currently a capital, not merely a famous or large city.",
              "For flag prompts, verify the flag feature actually appears on that flag.",
              "For border prompts, verify the border relationship is true.",
              "For person/group prompts, verify the person actually belongs to the requested group or role.",
              "Examples are positive hints, not an exhaustive answer key and not permission to accept related generic answers.",
              "Accept synonyms, aliases, translations, or common names only after the factual constraints are fully satisfied.",
              "If the answer is ambiguous, only partly satisfies the prompt, is merely plausible, or you are not confident, counts must be false.",
              "When rejecting, use a short factual reason.",
              "Return only JSON.",
            ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            prompt,
            guidance,
            answer,
            examples: acceptedAnswers.slice(0, 40),
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "dont_say_validation",
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
                description: "A short normalized display version of the answer.",
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
