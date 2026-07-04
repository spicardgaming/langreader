import { createClient } from '@supabase/supabase-js';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  uk: 'Ukrainian',
  ca: 'Catalan',
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: book } = await supabase
    .from('books')
    .select('title, language')
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (!book) return {};

  const language = LANGUAGE_NAMES[book.language] ?? book.language;

  return {
    title: `Read ${book.title} in ${language} Online with Translation — Balaka`,
    description: `Read "${book.title}" in the original, or choose language of translation.`,
  };
}

export default function ReaderLayout({ children }: { children: React.ReactNode }) {
  return children;
}