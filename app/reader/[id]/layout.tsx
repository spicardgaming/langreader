import { BOOKS, BOOK_LANGUAGE } from '@/lib/books'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const book = BOOKS[id]
  if (!book) return {}
  return {
    title: `${book.title} Читать Онлайн на ${BOOK_LANGUAGE} — LangReader`,
    description: `Читайте "${book.title}" (${book.author}) на ${BOOK_LANGUAGE} языке с мгновенным переводом слов и фраз.`,
  }
}

export default function ReaderLayout({ children }: { children: React.ReactNode }) {
  return children
}
