"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Reader from "@/app/components/Reader";

type Book = {
  id: string;
  title: string;
  status: "pending" | "processing" | "done" | "error";
  retelling_text: string | null;
  user_id: string;
};

const PARAGRAPHS_PER_PAGE = 10;

export default function UserBookReaderPage() {
  const params = useParams();
  const bookId = params?.id as string;
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadBook() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/auth");
        return;
      }

      const { data: bookData, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", bookId)
        .eq("user_id", session.user.id)
        .single();

      if (error || !bookData) {
        setBook(null);
        setLoading(false);
        return;
      }

      setBook(bookData as Book);
      setLoading(false);
    }

    loadBook();
  }, [bookId, router]);

  if (loading) {
    return (
      <div
        className="flex min-h-full items-center justify-center bg-[#f7f5f0] px-4 py-12 text-[#2c2c2c]"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        <p className="text-lg text-[#57534e]">Loading...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div
        className="flex min-h-full items-center justify-center bg-[#f7f5f0] px-4 py-12 text-[#2c2c2c]"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        <p className="text-lg text-[#57534e]">Book not found</p>
      </div>
    );
  }

  if (book.status === "pending" || book.status === "processing") {
    return (
      <div
        className="flex min-h-full items-center justify-center bg-[#f7f5f0] px-4 py-12 text-[#2c2c2c]"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        <p className="text-lg text-[#57534e]">Book is being processed...</p>
      </div>
    );
  }

  if (!book.retelling_text) {
    return (
      <div
        className="flex min-h-full items-center justify-center bg-[#f7f5f0] px-4 py-12 text-[#2c2c2c]"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        <p className="text-lg text-[#57534e]">Book content not available</p>
      </div>
    );
  }

  const allParagraphs = book.retelling_text
    .split(/\r?\n\r?\n|\r\r/)
    .map(p => p.replace(/\r?\n/g, ' ').trim())
    .filter(p => p.length > 0);
  
  const totalPages = Math.ceil(allParagraphs.length / PARAGRAPHS_PER_PAGE);
  const startIndex = (currentPage - 1) * PARAGRAPHS_PER_PAGE;
  const endIndex = currentPage * PARAGRAPHS_PER_PAGE;
  const currentParagraphs = allParagraphs.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="mx-auto w-full max-w-[700px] px-4 py-4">
        <p className="text-sm text-[#78716c]">Total paragraphs: {allParagraphs.length}, Total pages: {totalPages}</p>
      </div>
      <Reader title={book.title} paragraphs={currentParagraphs} />
      
      {totalPages > 1 && (
        <div className="mx-auto w-full max-w-[700px] mt-10 flex flex-col items-center gap-4 pb-12">
          <p className="text-sm text-[#78716c]">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded bg-white px-4 py-2 text-sm font-medium text-[#2c2c2c] shadow-sm transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`rounded px-3 py-2 text-sm font-medium shadow-sm transition-colors ${
                  page === currentPage
                    ? 'bg-[#2c2c2c] text-white'
                    : 'bg-white text-[#2c2c2c] hover:bg-[#f5f5f4]'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded bg-white px-4 py-2 text-sm font-medium text-[#2c2c2c] shadow-sm transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
