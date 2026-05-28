"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
      setLoading(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="mb-12 flex items-center justify-between">
      <Link
        href="/"
        className="text-xl font-semibold tracking-tight text-[#1a1a1a] no-underline"
      >
        Balaka
      </Link>
      {!loading && (
        <Link
          href={isAuthenticated ? "/account" : "/auth"}
          className="rounded-md border border-[#d6d3d1] bg-white px-4 py-2 text-sm text-[#444] transition-colors hover:border-[#a8a29e] hover:text-[#1a1a1a]"
        >
          {isAuthenticated ? "Мой кабинет" : "Войти"}
        </Link>
      )}
    </header>
  );
}
