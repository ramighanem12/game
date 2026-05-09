import { NextResponse } from "next/server";

export const runtime = "nodejs";

type OpenAITranscriptionResponse = {
  text?: string;
  error?: {
    message?: string;
  };
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Add OPENAI_API_KEY to .env.local to use Whisper voice mode." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json(
      { error: "Missing voice audio." },
      { status: 400 },
    );
  }

  const transcriptionForm = new FormData();

  transcriptionForm.append("model", "whisper-1");
  transcriptionForm.append("language", "en");
  transcriptionForm.append("temperature", "0");
  transcriptionForm.append("file", audio, audio.name || "voice.webm");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: transcriptionForm,
  });
  const data = (await response.json()) as OpenAITranscriptionResponse;

  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? "Whisper transcription failed." },
      { status: response.status },
    );
  }

  return NextResponse.json({
    transcript: data.text?.trim() ?? "",
  });
}
