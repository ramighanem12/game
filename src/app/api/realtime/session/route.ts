import { NextResponse } from "next/server";

export const runtime = "nodejs";

type OpenAIClientSecretResponse = {
  value?: string;
  client_secret?: {
    value?: string;
  };
  error?: {
    message?: string;
  };
};

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Add OPENAI_API_KEY to .env.local to use OpenAI voice mode." },
      { status: 500 },
    );
  }

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expires_after: {
        anchor: "created_at",
        seconds: 600,
      },
      session: {
        type: "transcription",
        audio: {
          input: {
            format: {
              type: "audio/pcm",
              rate: 24000,
            },
            transcription: {
              model: "gpt-realtime-whisper",
              language: "en",
            },
          },
        },
      },
    }),
  });

  const data = (await response.json()) as OpenAIClientSecretResponse;

  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? "Could not create an OpenAI voice session." },
      { status: response.status },
    );
  }

  return NextResponse.json(data);
}
