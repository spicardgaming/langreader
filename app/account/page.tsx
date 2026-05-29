"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Card = {
  id: string;
  word: string;
  translation: string;
  type: "word" | "phrase";
  created_at: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        router.push("/auth");
        return;
      }

      setUserEmail(data.session.user.email || null);
      setLoading(false);

      // Load user cards
      const { data: cardsData, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", data.session.user.id)
        .order("created_at", { ascending: false });

      if (!error && cardsData) {
        setCards(cardsData);
      }
      setCardsLoading(false);
    }

    checkSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#57534e]">Loading...</p>
      </div>
    );
  }

  return (
    <>
          <h1 className="mb-6 text-2xl font-semibold text-[#1a1a1a]">
            My account
          </h1>

          <div className="mb-8 rounded-lg border border-[#e7e5e4] bg-white p-6">
            <p className="text-sm text-[#78716c]">Email:</p>
            <p className="mt-1 text-base text-[#1a1a1a]">{userEmail}</p>
          </div>

          <section className="mb-8">
            <h2 className="mb-4 text-lg font-medium text-[#1a1a1a]">
              My books
            </h2>
            <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center">
              <p className="text-sm text-[#78716c]">Nothing here yet</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-lg font-medium text-[#1a1a1a]">
              My cards
            </h2>
            {cardsLoading ? (
              <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center">
                <p className="text-sm text-[#78716c]">Loading...</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center">
                <p className="text-sm text-[#78716c]">Nothing here yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-lg border border-[#e7e5e4] bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-semibold text-[#1a1a1a]">
                            {card.word}
                          </p>
                          <span className="rounded bg-[#f5f5f5] px-2 py-0.5 text-xs text-[#78716c]">
                            {card.type === "word" ? "слово" : "фраза"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#57534e]">
                          {card.translation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
    </>
  );
}
