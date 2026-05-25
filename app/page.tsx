import Link from "next/link";

const PRACTICE_BOOKS = [
  {
    title: "The Morning Walk",
    author: "Sample Author",
    level: "Easy" as const,
    genre: "Short story",
  },
  {
    title: "Letters from Abroad",
    author: "Jane Cooper",
    level: "Advanced" as const,
    genre: "Non-fiction",
  },
  {
    title: "A Room with a View",
    author: "E. M. Forster",
    level: "Advanced" as const,
    genre: "Classic novel",
  },
];

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
    <div className="min-h-full bg-[#fafaf9] text-[#2c2c2c]">
      <div className="mx-auto flex min-h-full w-full max-w-[900px] flex-col px-4 py-8 sm:px-6">
        <header className="mb-12 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-[#1a1a1a] no-underline"
          >
            LangReader
          </Link>
          <Link
            href="/auth"
            className="rounded-md border border-[#d6d3d1] bg-white px-4 py-2 text-sm text-[#444] transition-colors hover:border-[#a8a29e] hover:text-[#1a1a1a]"
          >
            Войти
          </Link>
        </header>

        <main className="flex-1">
          <section className="mb-14">
            <div className="flex items-stretch gap-3">
              <div
                className="flex min-h-[140px] flex-1 cursor-default flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#d6d3d1] bg-white px-6 py-8 text-center"
                role="presentation"
              >
                <p className="text-sm leading-relaxed text-[#57534e] sm:text-base">
                  Перетащите файл сюда или нажмите чтобы выбрать
                </p>
                <p className="mt-2 text-xs text-[#a8a29e]">
                  Поддерживаемые форматы: .txt, .epub
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
              Книги для практики
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {PRACTICE_BOOKS.map((book) => (
                <Link
                  key={book.title}
                  href="#"
                  className="block rounded-lg border border-[#e7e5e4] bg-white p-4 no-underline transition-shadow hover:shadow-md"
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
                    <span className="text-xs text-[#a8a29e]">{book.genre}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <p className="text-sm leading-relaxed text-[#57534e] sm:text-base">
              LangReader помогает изучать иностранный язык через чтение книг на
              оригинале. Выделяйте незнакомые слова и фразы — сервис мгновенно
              покажет перевод и пояснение в контексте. Загружайте свои тексты
              или начните с готовых материалов для практики.
            </p>
          </section>
        </main>

        <footer className="border-t border-[#e7e5e4] pt-8 pb-4">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-2 text-sm text-[#78716c]">Поделиться:</p>
              <div className="flex gap-4 text-sm">
                <a
                  href="#"
                  className="text-[#57534e] underline-offset-2 hover:text-[#1a1a1a] hover:underline"
                >
                  Facebook
                </a>
                <a
                  href="#"
                  className="text-[#57534e] underline-offset-2 hover:text-[#1a1a1a] hover:underline"
                >
                  Twitter
                </a>
              </div>
            </div>
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <a
                href="#"
                className="text-[#57534e] underline-offset-2 hover:text-[#1a1a1a] hover:underline"
              >
                About us
              </a>
              <a
                href="#"
                className="text-[#57534e] underline-offset-2 hover:text-[#1a1a1a] hover:underline"
              >
                Contacts
              </a>
              <a
                href="#"
                className="text-[#57534e] underline-offset-2 hover:text-[#1a1a1a] hover:underline"
              >
                Your feedback
              </a>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
