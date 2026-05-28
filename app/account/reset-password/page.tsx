"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Пароль изменён");
    setTimeout(() => {
      router.push("/account");
    }, 1500);
  }

  const inputClass =
    "w-full rounded-md border border-[#e0ddd6] bg-white px-4 py-2.5 text-[#2c2c2c] outline-none transition-colors placeholder:text-[#a8a29e] focus:border-[#8a8580]";

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
        </header>

        <main className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[400px] rounded-lg border border-[#e7e5e4] bg-white px-8 py-8">
            <h1 className="mb-6 text-center text-2xl font-semibold text-[#1a1a1a]">
              Смена пароля
            </h1>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1.5 block text-sm text-[#78716c]"
                >
                  Новый пароль
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Введите новый пароль"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}

              <button
                type="submit"
                disabled={loading || !!success}
                className="w-full rounded-md bg-[#2c2c2c] px-4 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Загрузка..." : success ? "Перенаправление..." : "Сохранить"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
