import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
export const maxDuration = 300;

type RetellRequest = {
  bookId: string;
  userId: string;
};

function splitIntoChunks(text: string, maxChunkSize: number = 12000): string[] {
  const paragraphs = text.split(/\n+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

function enforceMaxSentencesPerParagraph(text: string, maxSentences: number = 5): string {
  const paragraphs = text.split(/\n\n+/);
  console.log(`enforceMaxSentencesPerParagraph: ${paragraphs.length} paragraphs found`);
  const result: string[] = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    const sentences = trimmed.match(/[^.!?]+[.!?]+["'')\]]*\s*/g) || [trimmed];
    console.log(`  Paragraph: ${sentences.length} sentences, length ${trimmed.length}`);

    if (sentences.length <= maxSentences) {
      result.push(trimmed);
      continue;
    }

    for (let i = 0; i < sentences.length; i += maxSentences) {
      const group = sentences.slice(i, i + maxSentences).join('').trim();
      if (group) result.push(group);
    }
  }

  return result.join('\n\n');
}

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
    // Calculate text hash for duplicate detectionconst textHash 
    const normalizedText = book.original_text
  .replace(/\s+/g, ' ')
  .replace(/[«»„""\u2018\u2019\u201c\u201d]/g, '"')
  .replace(/[^\w\s]/g, '')
  .toLowerCase()
  .trim();
    const textHash = btoa(encodeURIComponent(normalizedText.slice(0, 200))).slice(0, 50) + normalizedText.length;
    console.log('Text hash:', textHash);
    console.log('Looking for duplicate...');
    
    // Check if we already have a retelling for this text (from any user)
    const { data: existingRetelling } = await supabase
      .from('books')
      .select('retelling_text')
      .eq('text_hash', textHash)
      .eq('status', 'done')
      .neq('id', bookId)
      .limit(1)
      .single();
    
    console.log('Existing retelling found:', existingRetelling);
    
    if (existingRetelling && existingRetelling.retelling_text) {
      // Use existing retelling
      const { error: updateDoneError } = await supabase
        .from('books')
        .update({ 
          retelling_text: existingRetelling.retelling_text,
          text_hash: textHash,
          status: 'done' 
        })
        .eq('id', bookId);

      if (updateDoneError) {
        return NextResponse.json(
          { error: 'Failed to save retelling result' },
          { status: 500 },
        );
      }

      return NextResponse.json({ 
        success: true,
        message: 'Retelling completed successfully (from cache)' 
      });
    }
    
    // No existing retelling found, create new one via Claude
    const promptTemplate = fs.readFileSync(
      path.join(process.cwd(), "lib/prompts/retell.md"),
      "utf-8"
    );
    
    // Split text into chunks
    const chunks = splitIntoChunks(book.original_text);
    console.log(`Processing ${chunks.length} chunks...`);
    const chunkResults: string[] = [];
    
    // Process each chunk sequentially
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      const prompt = promptTemplate + "\n\n" + chunk;
      
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
          { error: `Anthropic API request failed for chunk ${i + 1}/${chunks.length}`, details },
          { status: anthropicResponse.status },
        );
      }

      const data = (await anthropicResponse.json()) as {
        content?: { type: string; text?: string }[];
      };

      const textBlock = data.content?.find((block) => block.type === "text");
      const chunkText = textBlock?.text;

      if (!chunkText) {
        // Update status to error
        await supabase
          .from("books")
          .update({ status: "error" })
          .eq("id", bookId);

        return NextResponse.json(
          { error: `Empty response from Anthropic API for chunk ${i + 1}/${chunks.length}` },
          { status: 502 },
        );
      }
      
      chunkResults.push(chunkText);

      const progress = Math.round(((i + 1) / chunks.length) * 100);
      await supabase
        .from('books')
        .update({ progress })
        .eq('id', bookId);
      console.log(`Chunk ${i + 1}/${chunks.length} done, progress: ${progress}%`);
    }
    
    // Combine all chunk results
    let retellingText = chunkResults.join('\n\n');

    // Clean up retelling text
    const lines = retellingText.split('\n');
    let cleanedLines = lines;
    
    // Remove leading lines that start with # or ---
    while (cleanedLines.length > 0 && (cleanedLines[0]?.trim().startsWith('#') || cleanedLines[0]?.trim() === '---')) {
      cleanedLines = cleanedLines.slice(1);
    }
    
    // Remove lines that are only Markdown headers (# ## ###)
    cleanedLines = cleanedLines.filter(line => {
      const trimmed = line.trim();
      return !/^#{1,6}$/.test(trimmed);
    });
    
    // Remove bold and italic markdown formatting
    const cleanedText = cleanedLines
      .join('\n')
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove **bold**
      .replace(/\*([^*]+)\*/g, '$1')      // Remove *italic*
      .trim();

      console.log('About to call enforceMaxSentencesPerParagraph, cleanedText length:', cleanedText.length);
    const finalText = enforceMaxSentencesPerParagraph(cleanedText, 5);

    // Save retelling result and update status to done
    const { error: updateDoneError } = await supabase
      .from("books")
      .update({ 
        retelling_text: finalText,
        text_hash: textHash,
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
