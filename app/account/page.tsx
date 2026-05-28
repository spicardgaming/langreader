"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#57534e]">Загрузка...</p>
      </div>
    );
  }

  return (
    <>
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
    </>
  );
}
