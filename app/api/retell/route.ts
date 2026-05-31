import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RetellRequest = {
  bookId: string;
  userId: string;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 },
    );
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Supabase configuration is missing" },
      { status: 500 },
    );
  }

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body: RetellRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { bookId, userId } = body;
  if (!bookId || typeof bookId !== "string") {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Fetch book from database
  const { data: book, error: fetchError } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !book) {
    return NextResponse.json(
      { error: "Book not found" },
      { status: 404 },
    );
  }

  // Update status to processing
  const { error: updateProcessingError } = await supabase
    .from("books")
    .update({ status: "processing" })
    .eq("id", bookId);

  if (updateProcessingError) {
    return NextResponse.json(
      { error: "Failed to update book status" },
      { status: 500 },
    );
  }

  try {
    // Send request to Anthropic API
    const prompt = `You are a text summarizer. Rewrite the following text in the SAME LANGUAGE, keeping 50% of the original length. Keep the original paragraph structure — each paragraph in the original should remain a separate paragraph in the rewrite. Do not analyze or interpret — just rewrite more concisely. Do not add your own comments or conclusions. Text: ${book.original_text}`;

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
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        }),
      },
    );

    if (!anthropicResponse.ok) {
      const details = await anthropicResponse.text();
      
      // Update status to error
      await supabase
        .from("books")
        .update({ status: "error" })
        .eq("id", bookId);

      return NextResponse.json(
        { error: "Anthropic API request failed", details },
        { status: anthropicResponse.status },
      );
    }

    const data = (await anthropicResponse.json()) as {
      content?: { type: string; text?: string }[];
    };

    const textBlock = data.content?.find((block) => block.type === "text");
    let retellingText = textBlock?.text;

    if (!retellingText) {
      // Update status to error
      await supabase
        .from("books")
        .update({ status: "error" })
        .eq("id", bookId);

      return NextResponse.json(
        { error: "Empty response from Anthropic API" },
        { status: 502 },
      );
    }

    // Clean up retelling text
    const lines = retellingText.split('\n');
    let cleanedLines = lines;
    
    // Remove leading lines that start with #
    while (cleanedLines.length > 0 && cleanedLines[0]?.trim().startsWith('#')) {
      cleanedLines = cleanedLines.slice(1);
    }
    
    const cleanedText = cleanedLines.join('\n').trim();

    // Save retelling result and update status to done
    const { error: updateDoneError } = await supabase
      .from("books")
      .update({ 
        retelling_text: cleanedText,
        status: "done" 
      })
      .eq("id", bookId);

    if (updateDoneError) {
      return NextResponse.json(
        { error: "Failed to save retelling result" },
        { status: 500 },
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Retelling completed successfully" 
    });

  } catch (error) {
    // Update status to error
    await supabase
      .from("books")
      .update({ status: "error" })
      .eq("id", bookId);

    return NextResponse.json(
      { error: "Failed to process retelling", details: String(error) },
      { status: 500 },
    );
  }
}
