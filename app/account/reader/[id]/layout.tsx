import { createClient } from "@supabase/supabase-js";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      title: 'Read — Balaka',
      description: 'Read books with instant word and phrase translation.',
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: book } = await supabase
    .from('books')
    .select('title')
    .eq('id', (await params).id)
    .single();

  if (!book) {
    return {
      title: 'Read — Balaka',
      description: 'Read books with instant word and phrase translation.',
    };
  }

  return {
    title: `${book.title} — Balaka`,
    description: `Read "${book.title}" with instant word and phrase translation.`,
  };
}

export default function UserBookReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
