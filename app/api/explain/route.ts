import { NextRequest, NextResponse } from "next/server";
import { isAllowedOrigin, isExtensionOrigin } from "@/lib/security/originGuard";
import { checkAndIncrementAnonUsage } from "@/lib/security/anonRateLimit";

type ExplainRequest = {
  text: string;
  context: string;
  translation?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
};

type ExplainExample = {
  original: string;
  translation?: string;
};

type ExplainResponse = {
  summary: string;
  pattern?: string;
  details?: string;
  examples?: ExplainExample[];
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  it: 'Italian', pt: 'Portuguese', ru: 'Russian', uk: 'Ukrainian', ca: 'Catalan',
  zh: 'Chinese', ja: 'Japanese', ko: 'Korean', ar: 'Arabic', hi: 'Hindi',
  tr: 'Turkish', pl: 'Polish', nl: 'Dutch', vi: 'Vietnamese', th: 'Thai', id: 'Indonesian',
};

function extractJsonText(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

function parseExplainJsonFromText(text: string): ExplainResponse {
  const parsed = JSON.parse(extractJsonText(text)) as ExplainResponse;

  if (typeof parsed.summary !== "string" || parsed.summary.trim().length === 0) {
    throw new Error("Invalid response shape from model");
  }
  if (parsed.pattern !== undefined && typeof parsed.pattern !== "string") {
    throw new Error("Invalid response shape from model");
  }
  if (parsed.details !== undefined && typeof parsed.details !== "string") {
    throw new Error("Invalid response shape from model");
  }
  if (
    parsed.examples !== undefined &&
    (!Array.isArray(parsed.examples) ||
      !parsed.examples.every(
        (e) => typeof e === "object" && e !== null && typeof e.original === "string",
      ))
  ) {
    throw new Error("Invalid response shape from model");
  }

  return parsed;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isExtensionOrigin(origin)) {
    const deviceId = request.headers.get("x-balaka-device-id");
    if (!deviceId) {
      return NextResponse.json({ error: "Missing device id" }, { status: 400 });
    }
    const { allowed } = await checkAndIncrementAnonUsage(deviceId, "explain");
    if (!allowed) {
      return NextResponse.json(
        { error: "Monthly limit reached", code: "LIMIT_REACHED" },
        { status: 429 },
      );
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let body: ExplainRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, context, translation, sourceLanguage = "en", targetLanguage = "ru" } = body;

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (!context || typeof context !== "string") {
    return NextResponse.json({ error: "context is required" }, { status: 400 });
  }

  const sourceLangName = LANGUAGE_NAMES[sourceLanguage] ?? "English";
  const targetLangName = LANGUAGE_NAMES[targetLanguage] ?? "Russian";

  const prompt = `You are helping a ${targetLangName} speaker understand a piece of ${sourceLangName} text they just translated.

Text: "${text}"
Context sentence: "${context}"
${translation ? `Translation already shown to the user: "${translation}"` : ""}

Explain briefly WHY this means what it means — not how to translate it again. Only explain something that is genuinely non-obvious: a phrasal verb, idiom, grammatical construction, collocation, figurative meaning, or unusual word order. If the text is simple and literal with nothing meaningfully to explain, keep "summary" very short and honest about that, and omit "pattern", "details", and "examples" entirely.

Rules:
- Do not invent a grammar "rule" if there isn't a real one here.
- Tie the explanation to this specific context, not a generic dictionary entry.
- Give at most 1-2 short examples, only if they add real value.
- Write "summary" and "details" in ${targetLangName}. Keep "pattern" in ${sourceLangName} (it's a pattern label, e.g. "end up + -ing").
- Do not restate the translation itself; explain the "why", not the "what".
- Keep it short — this fits in a small popup, not a lesson.

Return ONLY valid JSON (no markdown, no text outside JSON). Omit any field that doesn't apply:
{"summary":"...","pattern":"...","details":"...","examples":[{"original":"...","translation":"..."}]}

Minimal example when nothing special applies:
{"summary":"This is a direct, literal translation — nothing unusual about the construction here."}`;

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
  const responseText = textBlock?.text;
  if (!responseText) {
    return NextResponse.json(
      { error: "Empty response from Anthropic API" },
      { status: 502 },
    );
  }

  try {
    const result = parseExplainJsonFromText(responseText);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse model response", raw: responseText },
      { status: 502 },
    );
  }
}