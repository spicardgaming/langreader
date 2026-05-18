"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TITLE = "The Morning Walk";

const PARAGRAPHS = [
  "On a quiet Sunday morning, Emma left her small apartment and walked toward the park. The streets were still empty, and the air smelled faintly of rain from the night before.",
  "She carried a paperback novel in her coat pocket and a thermos of tea in her hand. Reading outdoors had become her favorite ritual whenever the weather allowed it.",
  "At the park gate, an old man was feeding pigeons near a bench. He nodded politely as she passed, and she smiled back without breaking her stride.",
  "Emma found a sunny spot beneath a maple tree and sat down. She opened her book, took a sip of tea, and let the first sentence pull her gently into another world.",
  "Time moved differently when she read. The distant sound of bicycles and children playing became a soft background, like music she did not need to follow.",
  "When the sun climbed higher, she closed the book and looked up at the green canopy above. The walk home would be short, but the story would stay with her all day.",
];

type TranslateResult = {
  translation: string;
  transcription: string;
  examples: string[];
};

type PopupState = {
  word: string;
  x: number;
  y: number;
  loading: boolean;
  error?: string;
  data?: TranslateResult;
};

function isSingleWord(text: string): boolean {
  const word = text.trim();
  return word.length > 0 && /^[a-zA-Z'-]+$/.test(word);
}

function getParagraphContext(range: Range): string {
  let node: Node | null = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }
  const paragraph = (node as Element | null)?.closest("p[data-paragraph]");
  return paragraph?.textContent?.trim() ?? "";
}

export default function Home() {
  const [popup, setPopup] = useState<PopupState | null>(null);
  const skipCloseClickRef = useRef(false);
  const fetchIdRef = useRef(0);

  const closePopup = useCallback(() => {
    setPopup(null);
  }, []);

  useEffect(() => {
    const onDocumentClick = () => {
      if (skipCloseClickRef.current) {
        skipCloseClickRef.current = false;
        return;
      }
      closePopup();
    };

    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, [closePopup]);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return;
    }

    const word = selection.toString();
    if (!isSingleWord(word)) {
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const context = getParagraphContext(range);
    const normalizedWord = word.trim();

    skipCloseClickRef.current = true;
    const fetchId = ++fetchIdRef.current;

    setPopup({
      word: normalizedWord,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
      loading: true,
    });

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: normalizedWord, context }),
    })
      .then(async (res) => {
        const payload = (await res.json()) as TranslateResult & {
          error?: string;
        };
        if (!res.ok) {
          throw new Error(payload.error ?? "Ошибка перевода");
        }
        return payload;
      })
      .then((data) => {
        if (fetchId !== fetchIdRef.current) return;
        setPopup((prev) =>
          prev?.word === normalizedWord
            ? { ...prev, loading: false, data }
            : prev,
        );
      })
      .catch((err: Error) => {
        if (fetchId !== fetchIdRef.current) return;
        setPopup((prev) =>
          prev?.word === normalizedWord
            ? {
                ...prev,
                loading: false,
                error: err.message || "Не удалось загрузить перевод",
              }
            : prev,
        );
      });
  }, []);

  return (
    <div
      className="min-h-full bg-[#f7f5f0] py-12 px-4 text-[#2c2c2c]"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      onMouseUp={handleMouseUp}
    >
      <article className="mx-auto w-full max-w-[700px]">
        <header className="mb-10 border-b border-[#e0ddd6] pb-6">
          <p className="mb-2 text-sm tracking-wide text-[#8a8580] uppercase">
            Читалка
          </p>
          <h1 className="text-3xl font-normal leading-tight text-[#1a1a1a]">
            {TITLE}
          </h1>
        </header>

        <div className="space-y-6">
          {PARAGRAPHS.map((text, index) => (
            <div
              key={index}
              className="flex gap-4 rounded-lg bg-white/70 px-5 py-4 shadow-sm"
            >
              <span
                className="shrink-0 pt-0.5 text-sm tabular-nums text-[#a8a29e] select-none"
                aria-hidden
              >
                {index + 1}
              </span>
              <p
                data-paragraph
                className="text-lg leading-[1.75] text-[#333]"
              >
                {text}
              </p>
            </div>
          ))}
        </div>
      </article>

      {popup && (
        <div
          role="dialog"
          aria-live="polite"
          className="fixed z-50 w-[min(320px,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-[#e0ddd6] bg-white px-4 py-3 shadow-lg"
          style={{
            left: popup.x,
            top: popup.y,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <p className="text-base font-semibold text-[#1a1a1a]">{popup.word}</p>

          {popup.loading ? (
            <p className="mt-2 text-sm text-[#8a8580]">Загрузка...</p>
          ) : popup.error ? (
            <p className="mt-2 text-sm text-red-600">{popup.error}</p>
          ) : popup.data ? (
            <div className="mt-2 space-y-2 text-sm text-[#333]">
              <p>
                <span className="text-[#8a8580]">Перевод: </span>
                {popup.data.translation}
              </p>
              <p>
                <span className="text-[#8a8580]">Транскрипция: </span>
                {popup.data.transcription}
              </p>
              <ul className="space-y-1 border-t border-[#eee] pt-2">
                {popup.data.examples.map((example, i) => (
                  <li key={i} className="leading-snug text-[#444]">
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
