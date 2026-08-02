"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { callProcessingApi } from "@/lib/processing";

type PublicBook = {
  id: string;
  title: string;
  language: string;
  type: 'original' | 'retelling';
  cover_url: string | null;
};

const bookCardClassName =
  "block w-full cursor-pointer rounded-lg border border-[#e7e5e4] bg-white p-4 text-left no-underline transition-shadow hover:shadow-md";

function ArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [publicBooks, setPublicBooks] = useState<PublicBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [learningLanguage, setLearningLanguage] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('balaka_learning_language');
    if (saved) setLearningLanguage(saved);

    async function loadPublicBooks() {
      const lang = localStorage.getItem('balaka_learning_language') || 'en';
      const { data, error } = await supabase
        .from('books')
        .select('id, title, language, type, cover_url')
        .eq('is_public', true)
        .eq('status', 'done')
        .eq('language', lang)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPublicBooks(data);
      }
      setBooksLoading(false);
    }
    loadPublicBooks();
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    
    if (file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.epub')) {
      setFileContent("epub support coming soon");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.txt') || file.name.endsWith('.epub'))) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    // Clear previous messages
    setUploadMessage(null);

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/auth');
      return;
    }

    if (!selectedFile) {
      return;
    }

    // Hard cap: no single file may exceed 2,000,000 characters, regardless of plan or remaining quota
    if (fileContent.length > 2000000) {
      setUploadMessage('toolarge');
      return;
    }

    // Check if Pro subscription is required
    if (process.env.NEXT_PUBLIC_PRO_REQUIRED === 'true') {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('plan, chars_used, period_start')
        .eq('id', session.user.id)
        .single();

      // Create profile if it doesn't exist
      if (profileError && profileError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            plan: 'free',
            chars_used: 0,
            period_start: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
          setUploadMessage('Error checking subscription status.');
          return;
        }

        // User has free plan, show upgrade message
        setUploadMessage('upgrade');
        return;
      }

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setUploadMessage('Error checking subscription status.');
        return;
      }

      // Check if user has Pro plan
      if (profile.plan !== 'pro') {
        setUploadMessage('upgrade');
        return;
      }

      // User has Pro plan - check character limit
      let currentCharsUsed = profile.chars_used || 0;
      const periodStart = new Date(profile.period_start);
      const now = new Date();
      const daysSincePeriodStart = (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);

      // Reset chars_used if period is older than 30 days
      if (daysSincePeriodStart > 30) {
        currentCharsUsed = 0;
        await supabase
          .from('profiles')
          .update({
            chars_used: 0,
            period_start: now.toISOString()
          })
          .eq('id', session.user.id);
      }

      // Check if adding this file would exceed the monthly limit
      const newCharsUsed = currentCharsUsed + fileContent.length;
      let graceUpload = false;

      if (newCharsUsed > 2000000) {
        if (currentCharsUsed >= 2000000) {
          // Already over the limit from a previous upload this period — hard block, no grace
          setUploadMessage('limit');
          return;
        }
        // First time crossing the limit this period — let this one through for free
        graceUpload = true;
      }

      // Update chars_used
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ chars_used: newCharsUsed })
        .eq('id', session.user.id);

      if (updateError) {
        console.error('Error updating chars_used:', updateError);
        setUploadMessage('Error updating usage statistics.');
        return;
      }

      if (graceUpload) {
        window.alert('You have reached your monthly limit of 2,000,000 characters. Anyway, we will finish this task for you for free.');
      }
    }

    // Save to database
    const title = selectedFile.name.replace(/\.(txt|epub)$/, '');
    
    // Calculate text hash for duplicate detection
    const textHash = btoa(encodeURIComponent(fileContent.slice(0, 200))).slice(0, 50) + fileContent.length;
    
    const { data: bookData, error } = await supabase
      .from('books')
      .insert({
        user_id: session.user.id,
        title: title,
        original_text: fileContent,
        text_hash: textHash,
        type: 'original',
        status: 'pending',
        language: 'en'
      })
      .select()
      .single();

    if (error || !bookData) {
      console.error('Error saving book:', error);
      setUploadMessage('Error uploading file.');
      return;
    }

    router.push('/account');
  };

  return (
    <>
          <section className="mb-14">
            <div className="flex items-stretch gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.epub"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div
                onClick={handleDropZoneClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex min-h-[140px] flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed ${
                  isDragging ? 'border-[#2c2c2c] bg-[#f5f5f4]' : 'border-[#d6d3d1] bg-white'
                } px-6 py-8 text-center transition-colors`}
                role="button"
                tabIndex={0}
              >
                {selectedFile ? (
                  <>
                    <p className="text-sm leading-relaxed text-[#1a1a1a] sm:text-base font-medium">
                      {selectedFile.name}
                    </p>
                    {fileContent === "epub support coming soon" ? (
                      <p className="mt-2 text-xs text-[#a8a29e]">
                        epub support coming soon
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-[#a8a29e]">
                        Ready to upload
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed text-[#57534e] sm:text-base">
                      Drop a file here or click to select
                    </p>
                    <p className="mt-2 text-xs text-[#a8a29e]">
                      Supported formats: .txt, .epub
                    </p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleUpload}
                className="flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-full bg-[#2c2c2c] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                aria-label="Загрузить файл"
                disabled={!selectedFile || fileContent === "epub support coming soon"}
              >
                <ArrowIcon />
              </button>
            </div>
            {uploadMessage && (
              <div className="mt-2">
                {uploadMessage === 'upgrade' && (
                  <p className="text-sm text-[#78716c]">
                    Upload is available on the Pro plan.{' '}
                    <Link href="/pricing" className="text-[#1a1a1a] underline underline-offset-2">
                      Upgrade →
                    </Link>
                  </p>
                )}
                {uploadMessage === 'limit' && (
                  <p className="text-sm text-[#dc2626]">
                    You have reached your monthly limit of 2,000,000 characters.
                  </p>
                )}
                {uploadMessage === 'toolarge' && (
                  <p className="text-sm text-[#dc2626]">
                    This file is too large (max 2,000,000 characters per upload). Please split it into smaller parts.
                  </p>
                )}
                {uploadMessage !== 'upgrade' && uploadMessage !== 'limit' && uploadMessage !== 'toolarge' && (
                  <p className="text-sm text-[#dc2626]">
                    {uploadMessage}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="mb-14">
            <h2 className="mb-6 text-lg font-medium text-[#1a1a1a]">
              Books for practice
            </h2>
            {booksLoading ? (
              <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center">
                <p className="text-sm text-[#78716c]">Loading...</p>
              </div>
            ) : publicBooks.length === 0 ? (
              <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center">
                <p className="text-sm text-[#78716c]">No books yet</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
  {publicBooks.map((book) => (
    <Link
      key={book.id}
      href={`/reader/${book.id}`}
      className="block no-underline group"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-[#f0ede8]">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center">
            <span className="text-xs font-medium text-[#78716c] leading-snug">
              {book.title}
            </span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {book.language.toUpperCase()}
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium leading-snug text-[#1a1a1a] line-clamp-2">
        {book.title}
      </p>
      <p className="mt-0.5 text-xs text-[#a8a29e]">
        {book.type === 'retelling' ? 'Simplified' : 'Original'}
      </p>
    </Link>
  ))}
</div>
            )}
          </section>

          <section className="mb-16 space-y-4">
  <p className="text-sm leading-relaxed text-[#57534e] sm:text-base">
    Balaka helps you read texts or books that you want by uploading them or using one from our online library. While reading, choose unfamiliar phrases or words, and we'll show you their translation and usage in various contexts. The Balaka main page features books in the foreign language you're learning. We believe that reading books and texts in the original language helps us learn other languages, memorize words and expressions, and ultimately understand another culture.
  </p>
  <p className="text-sm leading-relaxed text-[#57534e] sm:text-base">
    In addition to reading classic books and texts in a foreign language, we've made it possible for you to upload a text in the language you're learning. To save you time and make the learning process more engaging, we offer two options:
  </p>
  <ul className="list-disc pl-5 space-y-1 text-sm text-[#57534e] sm:text-base">
    <li>Learn the language by reading the original text</li>
    <li>Learn the language by reading a simplified version of the text</li>
  </ul>
  <p className="text-sm leading-relaxed text-[#57534e] sm:text-base">
    The original text preserves the author's form, words, and expressions. However, sometimes this can be more difficult. In this case, you can upload your text online and read a simplified version of the translation, with simpler and clearer words and sentences.
  </p>
  <p className="text-sm leading-relaxed text-[#57534e] sm:text-base">
    In developing this service, we took into account our own experience, as well as the experiences and challenges of our friends who have also been or are currently learning and studying a new foreign language.
  </p>
</section>
    </>
  );
}
