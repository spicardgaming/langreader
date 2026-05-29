"use client";
import Link from "next/link";

const PRACTICE_BOOKS = [
  {
    id: "morning-walk",
    title: "The Morning Walk",
    author: "Sample Author",
    level: "Easy" as const,
    genre: "Short story",
    available: true,
  },
  {
    id: "letters-from-abroad",
    title: "Letters from Abroad",
    author: "Jane Cooper",
    level: "Advanced" as const,
    genre: "Non-fiction",
    available: false,
  },
  {
    id: "room-with-a-view",
    title: "A Room with a View",
    author: "E. M. Forster",
    level: "Advanced" as const,
    genre: "Classic novel",
    available: false,
  },
];

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
  return (
    <>
          <section className="mb-14">
            <div className="flex items-stretch gap-3">
              <div
                className="flex min-h-[140px] flex-1 cursor-default flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#d6d3d1] bg-white px-6 py-8 text-center"
                role="presentation"
              >
                <p className="text-sm leading-relaxed text-[#57534e] sm:text-base">
                  Drop a file here or click to select
                </p>
                <p className="mt-2 text-xs text-[#a8a29e]">
                  Supported formats: .txt, .epub
                </p>
              </div>
              <button
                type="button"
                className="flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-full bg-[#2c2c2c] text-white transition-opacity hover:opacity-90"
                aria-label="Загрузить файл"
              >
                <ArrowIcon />
              </button>
            </div>
          </section>

          <section className="mb-14">
            <h2 className="mb-6 text-lg font-medium text-[#1a1a1a]">
              Books for practice
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {PRACTICE_BOOKS.map((book) =>
                book.available ? (
                  <Link
                    key={book.id}
                    href={`/reader/${book.id}`}
                    className={bookCardClassName}
                  >
                    <h3 className="text-base font-medium leading-snug text-[#1a1a1a]">
                      {book.title}
                    </h3>
                    <p className="mt-1 text-sm text-[#78716c]">{book.author}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          book.level === "Easy"
                            ? "bg-[#ecfdf5] text-[#047857]"
                            : "bg-[#fef3c7] text-[#b45309]"
                        }`}
                      >
                        {book.level}
                      </span>
                      <span className="text-xs text-[#a8a29e]">
                        {book.genre}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => alert("Coming soon")}
                    className={bookCardClassName}
                  >
                    <h3 className="text-base font-medium leading-snug text-[#1a1a1a]">
                      {book.title}
                    </h3>
                    <p className="mt-1 text-sm text-[#78716c]">{book.author}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          book.level === "Easy"
                            ? "bg-[#ecfdf5] text-[#047857]"
                            : "bg-[#fef3c7] text-[#b45309]"
                        }`}
                      >
                        {book.level}
                      </span>
                      <span className="text-xs text-[#a8a29e]">
                        {book.genre}
                      </span>
                    </div>
                  </button>
                ),
              )}
            </div>
          </section>

          <section className="mb-16">
            <p className="text-sm leading-relaxed text-[#57534e] sm:text-base">
              Balaka helps you learn foreign languages by reading books in their original language. 
              Select unfamiliar words and phrases — the service instantly shows translation and 
              explanation in context. Upload your own texts or start with ready-made practice materials.
            </p>
          </section>
    </>
  );
}
