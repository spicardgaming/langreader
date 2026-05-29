"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tab = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("signin");
  const [showResetForm, setShowResetForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchTab(next: Tab) {
    setTab(next);
    setShowResetForm(false);
    setError(null);
    setSuccess(null);
    setEmail("");
    setPassword("");
  }

  function showResetPassword() {
    setShowResetForm(true);
    setError(null);
    setSuccess(null);
    setEmail("");
  }

  function backToSignIn() {
    setShowResetForm(false);
    setError(null);
    setSuccess(null);
    setEmail("");
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }

    setSuccess(
      "Registration successful. Check your email to confirm your account."
    );
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: window.location.origin + "/account/reset-password",
      }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess("Link sent, check your email");
  }

  const inputClass =
    "w-full rounded-md border border-[#e0ddd6] bg-white px-4 py-2.5 text-[#2c2c2c] outline-none transition-colors placeholder:text-[#a8a29e] focus:border-[#8a8580]";

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-[#f7f5f0] px-4 py-12 text-[#2c2c2c]">
      <div className="w-full max-w-[400px] rounded-lg bg-white/70 px-8 py-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-normal text-[#1a1a1a]">
          Balaka
        </h1>

        <div className="mb-6 flex border-b border-[#e0ddd6]">
          <button
            type="button"
            onClick={() => switchTab("signin")}
            className={`flex-1 pb-3 text-sm transition-colors ${
              tab === "signin"
                ? "border-b-2 border-[#2c2c2c] text-[#1a1a1a]"
                : "text-[#8a8580] hover:text-[#555]"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchTab("signup")}
            className={`flex-1 pb-3 text-sm transition-colors ${
              tab === "signup"
                ? "border-b-2 border-[#2c2c2c] text-[#1a1a1a]"
                : "text-[#8a8580] hover:text-[#555]"
            }`}
          >
            Sign up
          </button>
        </div>

        {tab === "signin" ? (
          showResetForm ? (
            <div className="space-y-4">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="mb-1.5 block text-sm text-[#8a8580]"
                  >
                    Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-[#2c2c2c] px-4 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Send link"}
                </button>
              </form>
              <button
                type="button"
                onClick={backToSignIn}
                className="w-full text-center text-sm text-[#8a8580] hover:text-[#555]"
              >
                Back
              </button>
            </div>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label
                  htmlFor="signin-email"
                  className="mb-1.5 block text-sm text-[#8a8580]"
                >
                  Email
                </label>
                <input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="signin-password"
                  className="mb-1.5 block text-sm text-[#8a8580]"
                >
                  Password
                </label>
                <input
                  id="signin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-[#2c2c2c] px-4 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Sign in"}
              </button>
              <button
                type="button"
                onClick={showResetPassword}
                className="w-full text-center text-xs text-[#8a8580] hover:text-[#555] hover:underline"
              >
                Forgot password?
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label
                htmlFor="signup-email"
                className="mb-1.5 block text-sm text-[#8a8580]"
              >
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="signup-password"
                className="mb-1.5 block text-sm text-[#8a8580]"
              >
                  Password
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-[#555]">{success}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[#2c2c2c] px-4 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Sign up"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
