"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AccountPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        router.push("/auth");
        return;
      }

      setUserEmail(data.session.user.email || null);
      setLoading(false);
    }

    checkSession();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
        <p className="text-[#57534e]">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#2c2c2c]">
      <div className="mx-auto flex min-h-full w-full max-w-[900px] flex-col px-4 py-8 sm:px-6">
        <header className="mb-12 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-[#1a1a1a] no-underline"
          >
            Balaka
          </Link>
          <button
            onClick={handleSignOut}
            className="rounded-md border border-[#d6d3d1] bg-white px-4 py-2 text-sm text-[#444] transition-colors hover:border-[#a8a29e] hover:text-[#1a1a1a]"
          >
            Выйти
          </button>
        </header>

        <main className="flex-1">
          <h1 className="mb-6 text-2xl font-semibold text-[#1a1a1a]">
            Мой кабинет
          </h1>

          <div className="mb-8 rounded-lg border border-[#e7e5e4] bg-white p-6">
            <p className="text-sm text-[#78716c]">Email:</p>
            <p className="mt-1 text-base text-[#1a1a1a]">{userEmail}</p>
          </div>

          <section className="mb-8">
            <h2 className="mb-4 text-lg font-medium text-[#1a1a1a]">
              Мои книги
            </h2>
            <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center">
              <p className="text-sm text-[#78716c]">Пока ничего нет</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-lg font-medium text-[#1a1a1a]">
              Мои карточки
            </h2>
            <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center">
              <p className="text-sm text-[#78716c]">Пока ничего нет</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
