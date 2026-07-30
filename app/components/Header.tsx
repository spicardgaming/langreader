"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const LEARNING_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  // { code: 'fr', label: 'French' },
  // { code: 'it', label: 'Italian' },
  // { code: 'pt', label: 'Portuguese' },
  // { code: 'ca', label: 'Catalan' },
];

const NATIVE_LANGUAGES = [
  
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
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
  { code: 'ru', label: 'Russian' },
];

type LanguageDropdownProps = {
  value: string;
  languages: { code: string; label: string }[];
  onChange: (code: string) => void;
};

function LanguageDropdown({ value, languages, onChange }: LanguageDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = languages.find(l => l.code === value);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-xl border border-[#e7e5e4] bg-white py-1 shadow-lg">
          {languages.map(l => (
            <button
              key={l.code}
              onClick={() => { onChange(l.code); setOpen(false); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#1a1a1a] hover:bg-[#f5f5f4] transition-colors"
            >
              <span className="w-4 text-[#2c2c2c]">
                {l.code === value ? '✓' : ''}
              </span>
              {l.label}
            </button>
          ))}
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
        if (profile?.native_language) setNativeLanguage(profile.native_language);
        if (profile?.learning_language) setLearningLanguage(profile.learning_language);
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
            languages={LEARNING_LANGUAGES}
            onChange={(code) => handleLanguageChange('learning', code)}
          />
          <span>I know</span>
          <LanguageDropdown
            value={nativeLanguage}
            languages={NATIVE_LANGUAGES}
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
