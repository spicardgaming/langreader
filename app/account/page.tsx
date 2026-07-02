"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Card = {
  id: string;
  word: string;
  translation: string;
  type: "word" | "phrase";
  created_at: string;
  transcription: string;
  examples: Array<{ english: string; russian: string }>;
};

type Book = {
  id: string;
  title: string;
  status: "pending" | "processing" | "done" | "error";
  type: "original" | "retelling";
  created_at: string;
  progress: number;
};

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {up ? (
        <path d="M18 15l-6-6-6 6" />
      ) : (
        <path d="M6 9l6 6 6-6" />
      )}
    </svg>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        router.push("/auth");
        return;
      }

      setUserEmail(data.session.user.email || null);
      setUserId(data.session.user.id);
      setLoading(false);

      // Load user books
      const { data: booksData, error: booksError } = await supabase
        .from("books")
        .select("*")
        .eq("user_id", data.session.user.id)
        .order("created_at", { ascending: false });

      if (!booksError && booksData) {
        setBooks(booksData);
      }
      setBooksLoading(false);

      // Load user cards
      const { data: cardsData, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", data.session.user.id)
        .order("created_at", { ascending: false });

      if (!error && cardsData) {
        setCards(cardsData);
      }
      setCardsLoading(false);
    }

    checkSession();
  }, [router]);

 
    useEffect(() => {
    const hasProcessing = books.some(b => b.status === 'processing');
    if (!hasProcessing || !userId) return;

    const interval = setInterval(async () => {
      console.log('Polling...', userId);
      const { data } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (data) setBooks(data);
    }, 10000);

    return () => clearInterval(interval);
  }, [books, userId]);

  const loadBooks = async () => {

    if (!userId) return;
    
    setBooksLoading(true);
    const { data: booksData, error: booksError } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!booksError && booksData) {
      setBooks(booksData);
    }
    setBooksLoading(false);
  };

  const handleCreateRetelling = async (bookId: string) => {
    if (!userId) return;

    // Update local status to processing
    setBooks(prevBooks => 
      prevBooks.map(book => 
        book.id === bookId ? { ...book, status: 'processing' as const } : book
      )
    );

    try {
      const response = await fetch('/api/retell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookId, userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create retelling');
      }

      // Reload books after success
      await loadBooks();
    } catch (error) {
      console.error('Error creating retelling:', error);
      // Update status to error
      setBooks(prevBooks => 
        prevBooks.map(book => 
          book.id === bookId ? { ...book, status: 'error' as const } : book
        )
      );
      alert('Error, try again');
    }
  };

  const handleRetry = async (bookId: string) => {
    await handleCreateRetelling(bookId);
  };

  const handleReadOriginal = async (bookId: string) => {
    if (!userId) return;
    await supabase
      .from('books')
      .update({ status: 'done', type: 'original' })
      .eq('id', bookId)
      .eq('user_id', userId);
    router.push(`/account/reader/${bookId}`);
  };


  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    if (!userId) return;

    const confirmed = confirm(`Are you sure you want to delete "${bookTitle}"?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      // Reload books after deletion
      await loadBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
      alert('Error deleting book');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  if (loading) {

    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#57534e]">Loading...</p>
      </div>
    );
  }

  const COVER_COLORS = [
    'bg-[#b5c9e2]',
    'bg-[#e2b5b5]',
    'bg-[#b5e2c9]',
    'bg-[#e2d5b5]',
    'bg-[#c9b5e2]',
    'bg-[#e2c9b5]',
    'bg-[#b5e2e2]',
    'bg-[#d5e2b5]',
  ];

  return (

    <>
          <h1 className="mb-6 text-2xl font-semibold text-[#1a1a1a]">
            My account
          </h1>

          <div className="mb-8 rounded-lg border border-[#e7e5e4] bg-white p-6">
            <p className="text-sm text-[#78716c]">Email:</p>
            <p className="mt-1 text-base text-[#1a1a1a]">{userEmail}</p>
          </div>

          <section className="mb-8">
            <h2 className="mb-4 text-lg font-medium text-[#1a1a1a]">
              My books
            </h2>
            {booksLoading ? (
              <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center">
                <p className="text-sm text-[#78716c]">Loading...</p>
              </div>
            ) : books.length === 0 ? (
              <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center">
                <p className="text-sm text-[#78716c]">Nothing here yet</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {books.map((book) => (
                  <div key={book.id} className="flex flex-col h-full">
                    <div className={`relative aspect-[2/3] w-full overflow-hidden rounded-lg flex flex-col items-center justify-center p-3 text-center ${COVER_COLORS[book.id.charCodeAt(0) % COVER_COLORS.length]}`}>

                      <span className="text-xs font-medium text-[#78716c] leading-snug">{book.title}</span>
                      <span className="mt-2 rounded bg-black/10 px-1.5 py-0.5 text-[10px] text-[#78716c]">{book.type}</span>
                    </div>
                    <div className="mt-2 flex flex-col flex-1">
  <p className="text-sm font-medium leading-snug text-[#1a1a1a] line-clamp-2">{book.title}</p>
  <p className="mt-0.5 text-xs text-[#a8a29e]">{formatDate(book.created_at)}</p>
  <div className="mt-auto pt-2 flex flex-col gap-1">
                      {book.status === 'pending' && (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleReadOriginal(book.id)}
                            className="rounded bg-[#2c2c2c] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 w-full"
                          >
                            Read original
                          </button>
                          <button
                            onClick={() => handleCreateRetelling(book.id)}
                            className="rounded border border-[#2c2c2c] px-3 py-1.5 text-xs font-medium text-[#2c2c2c] transition-opacity hover:opacity-70 w-full"
                          >
                            Create retelling
                          </button>
                        </div>
                      )}

                      {book.status === 'processing' && (
                        <>
                          <span className="text-xs text-[#78716c]">{(book.progress ?? 0) > 0 ? `Processing... ${book.progress}%` : 'Processing...'}</span>
                          <span className="text-[10px] text-[#a8a29e] leading-snug">Large texts take time. Keep this tab open!</span>
                        </>
                      )}
                      {book.status === 'done' && (
                        <a href={`/account/reader/${book.id}`} className="rounded bg-[#2c2c2c] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 w-full text-center">
                          Read
                        </a>
                      )}
                      {book.status === 'error' && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-[#dc2626]">Error</span>
                          <button onClick={() => handleRetry(book.id)} className="rounded bg-[#dc2626] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 w-full">Retry</button>
                        </div>
                      )}
                      <button onClick={() => handleDeleteBook(book.id, book.title)} className="text-[10px] text-[#dc2626] hover:text-[#b91c1c] transition-colors text-left mt-1">Delete</button>
                    </div>
                    </div>
                  </div>
                ))}
              </div>

            )}
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-lg font-medium text-[#1a1a1a]">
              My cards
            </h2>
            {cardsLoading ? (
              <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center">
                <p className="text-sm text-[#78716c]">Loading...</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center">
                <p className="text-sm text-[#78716c]">Nothing here yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cards.map((card) => {
                  const isExpanded = expandedCards.has(card.id);
                  
                  return (
                    <div
                      key={card.id}
                      onClick={() => toggleCardExpansion(card.id)}
                      className={`cursor-pointer transition-all duration-200 ${
                        isExpanded
                          ? "rounded-lg border border-[#e0e0e0] bg-white px-6 py-5"
                          : "rounded-lg border border-[#e7e5e4] bg-white p-4"
                      }`}
                      style={isExpanded ? { boxShadow: "0 4px 20px rgba(0,0,0,0.15)" } : undefined}
                    >
                      {isExpanded ? (
                        // EXPANDED STATE
                        <>
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-base font-bold text-[#1a1a1a]">
                              {card.word}
                            </p>
                            <span className="shrink-0 text-[#a8a29e]">
                              <ChevronIcon up={true} />
                            </span>
                          </div>
                          <p className="mt-2 text-base text-[#1a1a1a]">
                            {card.translation}
                          </p>
                          {card.transcription && (
                            <p className="mt-1 text-sm italic text-[#8a8580]">
                              {card.transcription}
                            </p>
                          )}
                          {card.examples && card.examples.length > 0 && (
                            <div className="mt-3 border-t border-[#e8e6e1] pt-3">
                              {card.examples.slice(0, 2).map((example, idx) => (
                                <div key={idx} className={idx > 0 ? "mt-3" : ""}>
                                  <p className="text-sm leading-snug text-[#333]">
                                    {example.english}
                                  </p>
                                  <p className="mt-0.5 text-sm leading-snug text-[#8a8580]">
                                    {example.russian}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        // COLLAPSED STATE
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-base font-semibold text-[#1a1a1a]">
                                {card.word}
                              </p>
                              <span className="rounded bg-[#f5f5f5] px-2 py-0.5 text-xs text-[#78716c]">
                                {card.type === "word" ? "слово" : "фраза"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-[#57534e]">
                              {card.translation}
                            </p>
                          </div>
                          <span className="shrink-0 text-[#a8a29e]">
                            <ChevronIcon up={false} />
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
    </>
  );
}
