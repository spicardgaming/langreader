"use client";

import { use } from "react";
import { BOOKS } from "@/lib/books";
import Reader from "@/app/components/Reader";


export default function ReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const book = BOOKS[id];

  if (!book) {
    return (
      <div
        className="flex min-h-full items-center justify-center bg-[#f7f5f0] px-4 py-12 text-[#2c2c2c]"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        <p className="text-lg text-[#57534e]">Книга не найдена</p>
      </div>
    );
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: { '@type': 'Person', name: book.author },
    inLanguage: 'en',
    abstract: book.paragraphs[0].slice(0, 150),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Reader title={book.title} paragraphs={book.paragraphs} />
    </>
  );
}
