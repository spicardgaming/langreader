"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="mb-12 flex items-center justify-between">
      <Link
        href="/"
        className="text-xl font-semibold tracking-tight text-[#1a1a1a] no-underline"
      >
        Balaka
      </Link>
      {!loading && (
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                href="/account"
                className="rounded-md border border-[#d6d3d1] bg-white px-4 py-2 text-sm text-[#444] transition-colors hover:border-[#a8a29e] hover:text-[#1a1a1a]"
              >
                My account
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-md border border-[#d6d3d1] bg-white px-4 py-2 text-sm text-[#444] transition-colors hover:border-[#a8a29e] hover:text-[#1a1a1a]"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-md border border-[#d6d3d1] bg-white px-4 py-2 text-sm text-[#444] transition-colors hover:border-[#a8a29e] hover:text-[#1a1a1a]"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
