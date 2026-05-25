import { NextRequest, NextResponse } from "next/server";

type TranslateRequest = {
  word: string;
  context: string;
  isPhrase?: boolean;
  isParagraph?: boolean;
};

type Example = {
  english: string;
  russian: string;
};

type VerbFormEntry = {
  name: string;
  form: string;
};

type VerbForms = {
  tense: string;
  forms: VerbFormEntry[];
};

type WordTranslateResponse = {
  translation: string;
  transcription: string;
  examples: Example[];
  isVerb: boolean;
  verbForms: VerbForms | null;
};

type PhraseTranslateResponse = {
  translation: string;
  explanation: string;
};

type ParagraphTranslateResponse = {
  paragraphTranslation: string;
};

function extractJsonText(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

function isValidVerbForms(value: unknown): value is VerbForms {
  if (typeof value !== "object" || value === null) return false;
  const vf = value as VerbForms;
  return (
    typeof vf.tense === "string" &&
    vf.tense.length > 0 &&
    Array.isArray(vf.forms) &&
    vf.forms.length > 0 &&
    vf.forms.every(
      (f) =>
        typeof f === "object" &&
        f !== null &&
        typeof f.name === "string" &&
        typeof f.form === "string",
    )
  );
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
    ) ||
    typeof parsed.isVerb !== "boolean" ||
    (parsed.isVerb && !isValidVerbForms(parsed.verbForms)) ||
    (!parsed.isVerb &&
      parsed.verbForms !== null &&
      parsed.verbForms !== undefined)
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

function parseParagraphJsonFromText(text: string): ParagraphTranslateResponse {
  const parsed = JSON.parse(extractJsonText(text)) as ParagraphTranslateResponse;

  if (typeof parsed.paragraphTranslation !== "string") {
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

  const { word, context, isPhrase, isParagraph } = body;
  if (!word || typeof word !== "string") {
    return NextResponse.json({ error: "word is required" }, { status: 400 });
  }
  if (!isParagraph && typeof context !== "string") {
    return NextResponse.json({ error: "context is required" }, { status: 400 });
  }

  const prompt = isParagraph
    ? `You are helping a Russian speaker learn English.

Translate the following English paragraph into Russian completely. Do not shorten, summarize, or omit any part of the text.

Paragraph:
"${word}"

Return ONLY valid JSON (no markdown, no text outside JSON) with exactly this field:
- "paragraphTranslation": the full Russian translation of the entire paragraph

Example format:
{"paragraphTranslation":"..."}`
    : isPhrase
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

First determine whether the word is used as a verb in this context sentence.
If it is a verb, identify which English tense it is used in within that context.

Return ONLY valid JSON (no markdown, no explanation) with exactly these fields:
- "translation": Russian translation of the word in this context
- "transcription": IPA phonetic transcription of the English word
- "examples": array of exactly 2 objects, each with:
  - "english": an example sentence in English that uses the word naturally
  - "russian": Russian translation of that sentence
- "isVerb": boolean — true if the word is a verb in this context
- "verbForms": if isVerb is true, an object with:
  - "tense": name of the tense as used in the context (in English, e.g. "Present Simple", "Past Simple", "Present Continuous")
  - "forms": array of ALL conjugation forms for that tense only of the verb's lemma (infinitive), each object with:
    - "name": English label for the grammatical form (e.g. "I", "You", "He/She/It", "We", "They", or "I form", "He/She/It form" when clearer for the tense)
    - "form": the English verb form
  Keep "translation", "examples[].russian", and all other learner-facing explanations in Russian. Only "tense" and form "name" labels are in English.
  If isVerb is false, set "verbForms" to null

Example format (non-verb):
{"translation":"...","transcription":"...","examples":[...],"isVerb":false,"verbForms":null}

Example format (verb):
{"translation":"...","transcription":"...","examples":[...],"isVerb":true,"verbForms":{"tense":"Past Simple","forms":[{"name":"I","form":"walked"},{"name":"He/She/It","form":"walked"}]}}`;

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
        max_tokens: isParagraph ? 1024 : isPhrase ? 512 : 768,
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
    const result = isParagraph
      ? parseParagraphJsonFromText(text)
      : isPhrase
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
