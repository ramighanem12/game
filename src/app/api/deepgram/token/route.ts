import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DeepgramTokenResponse = {
  access_token?: string;
  expires_in?: number;
  err_code?: string;
  err_msg?: string;
  error?: string;
};

export async function POST() {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Add DEEPGRAM_API_KEY to .env.local to use Deepgram voice mode." },
      { status: 500 },
    );
  }

  const response = await fetch("https://api.deepgram.com/v1/auth/grant", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ttl_seconds: 60 }),
  });
  const data = (await response.json()) as DeepgramTokenResponse;

  if (!response.ok) {
    const deepgramMessage = data.err_msg ?? data.error ?? "";
    const permissionError =
      data.err_code === "FORBIDDEN" ||
      deepgramMessage.toLowerCase().includes("insufficient permissions");

    return NextResponse.json(
      {
        error: permissionError
          ? "This Deepgram key cannot create browser voice tokens. Create a Deepgram API key with Advanced permissions set to Member, then put that key in DEEPGRAM_API_KEY."
          : deepgramMessage || "Could not create a Deepgram token.",
      },
      { status: response.status },
    );
  }

  return NextResponse.json(data);
}
