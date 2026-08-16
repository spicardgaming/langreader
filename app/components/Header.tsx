"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Single shared list used for both "I learn" and "I know" — previously these were
// two separate arrays (plus a third copy in app/api/translate/route.ts's
// LANGUAGE_NAMES map), which was a repeat source of bugs when one list got a new
// language added and the others didn't. LEARNING no longer needs to be restricted
// to languages with public-library books, now that users can upload their own
// text in any language directly.
const ALL_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'ca', label: 'Catalan' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'tr', label: 'Turkish' },
  { code: 'pl', label: 'Polish' },
  { code: 'nl', label: 'Dutch' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'th', label: 'Thai' },
  { code: 'id', label: 'Indonesian' },
  { code: 'bn', label: 'Bengali' },
  { code: 'fa', label: 'Persian' },
  { code: 'he', label: 'Hebrew' },
  { code: 'ur', label: 'Urdu' },
  { code: 'ro', label: 'Romanian' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'cs', label: 'Czech' },
  { code: 'sk', label: 'Slovak' },
  { code: 'bg', label: 'Bulgarian' },
  { code: 'el', label: 'Greek' },
  { code: 'sv', label: 'Swedish' },
  { code: 'no', label: 'Norwegian' },
  { code: 'da', label: 'Danish' },
  { code: 'fi', label: 'Finnish' },
  { code: 'sr', label: 'Serbian' },
  { code: 'hr', label: 'Croatian' },
  { code: 'ms', label: 'Malay' },
  { code: 'sw', label: 'Swahili' },
  { code: 'az', label: 'Azerbaijani' },
  { code: 'ka', label: 'Georgian' },
  { code: 'hy', label: 'Armenian' },
];

const POPULAR_LANGUAGE_CODES = ['en', 'es', 'de', 'fr', 'ru', 'uk', 'zh', 'pt'];

type LanguageDropdownProps = {
  value: string;
  languages: { code: string; label: string }[];
  popularCodes: string[];
  onChange: (code: string) => void;
};

function LanguageDropdown({ value, languages, popularCodes, onChange }: LanguageDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = languages.find(l => l.code === value);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSelect = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery("");
  };

  const trimmedQuery = query.trim().toLowerCase();
  const popularLanguages = languages.filter(l => popularCodes.includes(l.code));
  const listLanguages = trimmedQuery
    ? languages.filter(l => l.label.toLowerCase().includes(trimmedQuery))
    : languages.filter(l => !popularCodes.includes(l.code));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full border border-[#e7e5e4] bg-white px-3 py-1.5 text-sm font-medium text-[#1a1a1a] hover:border-[#a8a29e] transition-colors"
      >
        {selected?.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[220px] rounded-xl border border-[#e7e5e4] bg-white shadow-lg overflow-hidden">
          <div className="border-b border-[#e7e5e4] p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search language..."
              className="w-full rounded-lg border border-[#e7e5e4] px-2.5 py-1.5 text-sm text-[#1a1a1a] outline-none focus:border-[#a8a29e]"
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto py-1">
            {!trimmedQuery && popularLanguages.length > 0 && (
              <>
                <div className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[#a8a29e]">
                  Popular
                </div>
                {popularLanguages.map(l => (
                  <button
                    key={l.code}
                    onClick={() => handleSelect(l.code)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#1a1a1a] hover:bg-[#f5f5f4] transition-colors"
                  >
                    <span className="w-4 text-[#2c2c2c]">{l.code === value ? '✓' : ''}</span>
                    {l.label}
                  </button>
                ))}
                <div className="my-1 border-t border-[#e7e5e4]" />
              </>
            )}
            {listLanguages.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[#a8a29e]">No languages found</div>
            ) : (
              listLanguages.map(l => (
                <button
                  key={l.code}
                  onClick={() => handleSelect(l.code)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#1a1a1a] hover:bg-[#f5f5f4] transition-colors"
                >
                  <span className="w-4 text-[#2c2c2c]">{l.code === value ? '✓' : ''}</span>
                  {l.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nativeLanguage, setNativeLanguage] = useState('ru');
  const [learningLanguage, setLearningLanguage] = useState('en');
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
      setLoading(false);

      const savedNative = localStorage.getItem('balaka_native_language');
      const savedLearning = localStorage.getItem('balaka_learning_language');
      if (savedNative) setNativeLanguage(savedNative);
      if (savedLearning) setLearningLanguage(savedLearning);

      if (data.session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('native_language, learning_language')
          .eq('id', data.session.user.id)
          .single();
        if (profile?.native_language) {
          setNativeLanguage(profile.native_language);
          localStorage.setItem('balaka_native_language', profile.native_language);
        }
        if (profile?.learning_language) {
          setLearningLanguage(profile.learning_language);
          localStorage.setItem('balaka_learning_language', profile.learning_language);
        }
      }
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

  const handleLanguageChange = async (type: 'native' | 'learning', code: string) => {
    if (type === 'native') setNativeLanguage(code);
    else setLearningLanguage(code);
    localStorage.setItem(type === 'native' ? 'balaka_native_language' : 'balaka_learning_language', code);
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await supabase.from('profiles').update(
        type === 'native' ? { native_language: code } : { learning_language: code }
      ).eq('id', data.session.user.id);
    }
    localStorage.removeItem('paragraph_translations');
    window.location.reload();
  };

  return (
    <header className="mb-12 flex items-center justify-between gap-4 flex-wrap">
      <Link
        href="/"
        className="text-xl font-semibold tracking-tight text-[#1a1a1a] no-underline"
      >
        Balaka
      </Link>
      {!loading && (
        <div className="flex items-center gap-2 text-sm text-[#78716c]">
          <span>I learn</span>
          <LanguageDropdown
            value={learningLanguage}
            languages={ALL_LANGUAGES}
            popularCodes={POPULAR_LANGUAGE_CODES}
            onChange={(code) => handleLanguageChange('learning', code)}
          />
          <span>I know</span>
          <LanguageDropdown
            value={nativeLanguage}
            languages={ALL_LANGUAGES}
            popularCodes={POPULAR_LANGUAGE_CODES}
            onChange={(code) => handleLanguageChange('native', code)}
          />
        </div>
      )}
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
