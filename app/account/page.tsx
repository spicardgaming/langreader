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
};

type Book = {
  id: string;
  title: string;
  status: "pending" | "processing" | "done" | "error";
  type: "original" | "retelling";
  created_at: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);

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

  const getStatusDisplay = (status: Book['status'], bookId: string) => {
    switch (status) {
      case 'pending':
        return (
          <button
            onClick={() => handleCreateRetelling(bookId)}
            className="rounded bg-[#2c2c2c] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Create retelling
          </button>
        );
      case 'processing':
        return <span className="text-sm text-[#78716c]">Processing...</span>;
      case 'done':
        return (
          <a
            href={`/account/reader/${bookId}`}
            className="rounded bg-[#2c2c2c] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Read
          </a>
        );
      case 'error':
        return (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#dc2626]">Error</span>
            <button
              onClick={() => handleRetry(bookId)}
              className="rounded bg-[#dc2626] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Retry
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#57534e]">Loading...</p>
      </div>
    );
  }

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
              <div className="space-y-3">
                {books.map((book) => (
                  <div
                    key={book.id}
                    className="rounded-lg border border-[#e7e5e4] bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-[#1a1a1a]">
                            {book.title}
                          </h3>
                          <span className="rounded bg-[#f5f5f5] px-2 py-0.5 text-xs text-[#78716c]">
                            {book.type}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#a8a29e]">
                          {formatDate(book.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusDisplay(book.status, book.id)}
                        <button
                          onClick={() => handleDeleteBook(book.id, book.title)}
                          className="text-xs text-[#dc2626] hover:text-[#b91c1c] transition-colors"
                          aria-label="Delete book"
                        >
                          Delete
                        </button>
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
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-lg border border-[#e7e5e4] bg-white p-4"
                  >
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
    </>
  );
}
