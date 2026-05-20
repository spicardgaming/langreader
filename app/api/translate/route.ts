import { NextRequest, NextResponse } from "next/server";

type TranslateRequest = {
  word: string;
  context: string;
  isPhrase?: boolean;
};

type Example = {
  english: string;
  russian: string;
};

type WordTranslateResponse = {
  translation: string;
  transcription: string;
  examples: Example[];
};

type PhraseTranslateResponse = {
  translation: string;
  explanation: string;
};

function extractJsonText(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

function parseWordJsonFromText(text: string): WordTranslateResponse {
  const parsed = JSON.parse(extractJsonText(text)) as WordTranslateResponse;

  if (
    typeof parsed.translation !== "string" ||
    typeof parsed.transcription !== "string" ||
    !Array.isArray(parsed.examples) ||
    parsed.examples.length !== 2 ||
    !parsed.examples.every(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as Example).english === "string" &&
        typeof (e as Example).russian === "string",
    )
  ) {
    throw new Error("Invalid response shape from model");
  }

  return parsed;
}

function parsePhraseJsonFromText(text: string): PhraseTranslateResponse {
  const parsed = JSON.parse(extractJsonText(text)) as PhraseTranslateResponse;

  if (
    typeof parsed.translation !== "string" ||
    typeof parsed.explanation !== "string"
  ) {
    throw new Error("Invalid response shape from model");
  }

  return parsed;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let body: TranslateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { word, context, isPhrase } = body;
  if (!word || typeof word !== "string") {
    return NextResponse.json({ error: "word is required" }, { status: 400 });
  }
  if (typeof context !== "string") {
    return NextResponse.json({ error: "context is required" }, { status: 400 });
  }

  const prompt = isPhrase
    ? `You are helping a Russian speaker learn English.

Phrase: "${word}"
Context sentence: "${context}"

Return ONLY valid JSON (no markdown, no text outside JSON) with exactly these fields:
- "translation": Russian translation of the phrase in this context
- "explanation": brief explanation in Russian of the phrase meaning and usage (1-2 sentences)

Example format:
{"translation":"...","explanation":"..."}`
    : `You are helping a Russian speaker learn English vocabulary.

Word: "${word}"
Context sentence: "${context}"

Return ONLY valid JSON (no markdown, no explanation) with exactly these fields:
- "translation": Russian translation of the word in this context
- "transcription": IPA phonetic transcription of the English word
- "examples": array of exactly 2 objects, each with:
  - "english": an example sentence in English that uses the word naturally
  - "russian": Russian translation of that sentence

Example format:
{"translation":"...","transcription":"...","examples":[{"english":"...","russian":"..."},{"english":"...","russian":"..."}]}`;

  const anthropicResponse = await fetch(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    },
  );

  if (!anthropicResponse.ok) {
    const details = await anthropicResponse.text();
    return NextResponse.json(
      { error: "Anthropic API request failed", details },
      { status: anthropicResponse.status },
    );
  }

  const data = (await anthropicResponse.json()) as {
    content?: { type: string; text?: string }[];
  };

  const textBlock = data.content?.find((block) => block.type === "text");
  const text = textBlock?.text;
  if (!text) {
    return NextResponse.json(
      { error: "Empty response from Anthropic API" },
      { status: 502 },
    );
  }

  try {
    const result = isPhrase
      ? parsePhraseJsonFromText(text)
      : parseWordJsonFromText(text);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse model response", raw: text },
      { status: 502 },
    );
  }
}
