"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type PublicBook = {
  id: string;
  title: string;
  language: string;
  type: 'original' | 'retelling';
  cover_url: string | null;
};

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export default function Home() {
  const [publicBooks, setPublicBooks] = useState<PublicBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
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

    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
      setAuthChecked(true);
    }
    checkAuth();
  }, []);

  return (
    <>
      <section className="mb-14">
        <Link
          href={isAuthenticated ? "/account" : "/auth"}
          className={`inline-flex items-center gap-2 rounded-lg bg-[#2c2c2c] px-5 py-3 text-sm font-medium text-white no-underline transition-opacity hover:opacity-90 ${
            authChecked ? "" : "invisible"
          }`}
        >
          <UploadIcon />
          Upload your own text
        </Link>
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
