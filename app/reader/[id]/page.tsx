"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Reader from "@/app/components/Reader";

type Book = {
  id: string;
  title: string;
  original_text: string;
  language: string;
};

const PARAGRAPHS_PER_PAGE = 10;

export default function ReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadBook() {
      const { data, error } = await supabase
        .from('books')
        .select('id, title, original_text, language')
        .eq('id', id)
        .eq('is_public', true)
        .eq('status', 'done')
        .single();

      if (!error && data) {
        setBook(data);
      }
      setLoading(false);
    }
    loadBook();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <p className="text-lg text-[#57534e]">Loading...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <p className="text-lg text-[#57534e]">Book not found</p>
      </div>
    );
  }

  const allParagraphs = book.original_text
    .split(/\r?\n\r?\n|\r\r/)
    .map(p => p.replace(/\r?\n/g, ' ').trim())
    .filter(p => p.length > 0);

  const totalPages = Math.ceil(allParagraphs.length / PARAGRAPHS_PER_PAGE);
  const startIndex = (currentPage - 1) * PARAGRAPHS_PER_PAGE;
  const currentParagraphs = allParagraphs.slice(startIndex, startIndex + PARAGRAPHS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    
    // Always show first page
    pages.push(1);
    
    // Calculate range around current page
    const rangeStart = Math.max(2, current - 2);
    const rangeEnd = Math.min(total - 1, current + 2);
    
    // Add ellipsis after first page if needed
    if (rangeStart > 2) {
      pages.push('...');
    }
    
    // Add pages around current
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }
    
    // Add ellipsis before last page if needed
    if (rangeEnd < total - 1) {
      pages.push('...');
    }
    
    // Always show last page
    pages.push(total);
    
    return pages;
  };

  return (
    <>
      <Reader title={book.title} paragraphs={currentParagraphs} />
      {totalPages > 1 && (
        <div className="mx-auto w-full max-w-[700px] mt-10 flex flex-col items-center gap-4 pb-12">
          <p className="text-sm text-[#78716c]">Page {currentPage} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded bg-white px-4 py-2 text-sm font-medium text-[#2c2c2c] shadow-sm transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              Previous
            </button>
            {getPageNumbers(currentPage, totalPages).map((page, index) => 
              typeof page === 'string' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-sm text-[#a8a29e]">
                  ...
                </span>
              ) : (
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
              )
            )}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded bg-white px-4 py-2 text-sm font-medium text-[#2c2c2c] shadow-sm transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
