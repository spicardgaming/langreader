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

type Example = {
  english: string;
  russian: string;
};

type WordTranslateResult = {
  translation: string;
  transcription: string;
  examples: Example[];
};

type PhraseTranslateResult = {
  translation: string;
  explanation: string;
};

type ParagraphTranslateResult = {
  paragraphTranslation: string;
};

type ParagraphState = {
  open: boolean;
  loading: boolean;
  translation?: string;
  error?: string;
};

type PopupState = {
  text: string;
  isPhrase: boolean;
  left: number;
  top: number;
  width: number;
  loading: boolean;
  error?: string;
  wordData?: WordTranslateResult;
  phraseData?: PhraseTranslateResult;
};

const WORD_CHAR = /[a-zA-Z'-]/;

function isSingleWord(text: string): boolean {
  const word = text.trim();
  return word.length > 0 && /^[a-zA-Z'-]+$/.test(word);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isValidPhrase(text: string): boolean {
  const n = countWords(text);
  return n > 1 && n <= 10;
}

function isEnglishSelection(text: string): boolean {
  return /^[a-zA-Z\s'.,!?-]+$/.test(text.trim());
}

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {up ? (
        <path d="M18 15l-6-6-6 6" />
      ) : (
        <path d="M6 9l6 6 6-6" />
      )}
    </svg>
  );
}

function getParagraphFromRange(range: Range): HTMLParagraphElement | null {
  let node: Node | null = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }
  if (!(node instanceof Element)) {
    return null;
  }
  const paragraph = node.closest("p[data-paragraph]");
  return paragraph instanceof HTMLParagraphElement ? paragraph : null;
}

function getParagraphContext(range: Range): string {
  return getParagraphFromRange(range)?.textContent?.trim() ?? "";
}

function getOffsetInElement(element: Element, container: Node, offset: number): number {
  const preRange = document.createRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(container, offset);
  return preRange.toString().length;
}

function setRangeOffsets(
  element: Element,
  start: number,
  end: number,
): Range | null {
  const range = document.createRange();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let startSet = false;

  let textNode: Text | null;
  while ((textNode = walker.nextNode() as Text | null)) {
    const nodeEnd = pos + textNode.length;

    if (!startSet && start < nodeEnd) {
      range.setStart(textNode, start - pos);
      startSet = true;
    }

    if (startSet && end <= nodeEnd) {
      range.setEnd(textNode, end - pos);
      return range;
    }

    pos = nodeEnd;
  }

  return null;
}

/** Expands range to word boundaries; returns null if not exactly one word. */
function expandRangeToWholeWord(
  range: Range,
  paragraph: Element,
): Range | null {
  const text = paragraph.textContent ?? "";
  if (!text) return null;

  const start = getOffsetInElement(paragraph, range.startContainer, range.startOffset);
  const end = getOffsetInElement(paragraph, range.endContainer, range.endOffset);

  if (start > end) return null;

  let wordStart = start;
  while (wordStart > 0 && WORD_CHAR.test(text[wordStart - 1]!)) {
    wordStart--;
  }

  let wordEnd = end;
  while (wordEnd < text.length && WORD_CHAR.test(text[wordEnd]!)) {
    wordEnd++;
  }

  const word = text.slice(wordStart, wordEnd);
  if (!isSingleWord(word)) return null;

  // Selection must touch the same word (not span a gap between words).
  if (wordStart > end || wordEnd < start) return null;

  return setRangeOffsets(paragraph, wordStart, wordEnd);
}

/** Expands partial first/last words in a multi-word selection to full word boundaries. */
function expandRangeToPhraseBounds(
  range: Range,
  paragraph: Element,
): Range | null {
  const text = paragraph.textContent ?? "";
  if (!text) return null;

  const start = getOffsetInElement(paragraph, range.startContainer, range.startOffset);
  const end = getOffsetInElement(paragraph, range.endContainer, range.endOffset);

  if (start > end) return null;

  let phraseStart = start;
  while (phraseStart > 0 && WORD_CHAR.test(text[phraseStart - 1]!)) {
    phraseStart--;
  }

  let phraseEnd = end;
  while (phraseEnd < text.length && WORD_CHAR.test(text[phraseEnd]!)) {
    phraseEnd++;
  }

  if (phraseStart === start && phraseEnd === end) {
    return range;
  }

  return setRangeOffsets(paragraph, phraseStart, phraseEnd);
}

export default function Home() {
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [paragraphStates, setParagraphStates] = useState<
    Record<number, ParagraphState>
  >({});
  const articleRef = useRef<HTMLElement>(null);
  const skipCloseClickRef = useRef(false);
  const fetchIdRef = useRef(0);
  const paragraphFetchIdRef = useRef<Record<number, number>>({});

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

    const range = selection.getRangeAt(0);
    const paragraph = getParagraphFromRange(range);
    if (
      !paragraph ||
      !paragraph.contains(range.startContainer) ||
      !paragraph.contains(range.endContainer)
    ) {
      return;
    }

    const rawText = range.toString().trim();
    if (!rawText || !isEnglishSelection(rawText)) {
      return;
    }

    const isPhrase = isValidPhrase(rawText);
    let activeRange: Range;

    if (isPhrase) {
      const expandedRange = expandRangeToPhraseBounds(range, paragraph);
      if (!expandedRange) {
        return;
      }
      if (expandedRange !== range) {
        selection.removeAllRanges();
        selection.addRange(expandedRange);
      }
      activeRange = expandedRange;
    } else {
      const expandedRange = expandRangeToWholeWord(range, paragraph);
      if (!expandedRange) {
        return;
      }
      selection.removeAllRanges();
      selection.addRange(expandedRange);
      activeRange = expandedRange;

      const word = expandedRange.toString().trim();
      if (!isSingleWord(word)) {
        return;
      }
    }

    const text = activeRange.toString().trim();
    const selectionRect = activeRange.getBoundingClientRect();
    const articleRect = articleRef.current?.getBoundingClientRect();
    const context = getParagraphContext(activeRange);

    skipCloseClickRef.current = true;
    const fetchId = ++fetchIdRef.current;

    setPopup({
      text,
      isPhrase,
      left: articleRect?.left ?? selectionRect.left,
      top: selectionRect.bottom,
      width: articleRect?.width ?? 700,
      loading: true,
    });

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: text, context, isPhrase }),
    })
      .then(async (res) => {
        const payload = (await res.json()) as
          | (WordTranslateResult & { error?: string })
          | (PhraseTranslateResult & { error?: string });
        if (!res.ok) {
          throw new Error(payload.error ?? "Ошибка перевода");
        }
        return payload;
      })
      .then((data) => {
        if (fetchId !== fetchIdRef.current) return;
        setPopup((prev) =>
          prev?.text === text
            ? {
                ...prev,
                loading: false,
                ...(isPhrase
                  ? { phraseData: data as PhraseTranslateResult }
                  : { wordData: data as WordTranslateResult }),
              }
            : prev,
        );
      })
      .catch((err: Error) => {
        if (fetchId !== fetchIdRef.current) return;
        setPopup((prev) =>
          prev?.text === text
            ? {
                ...prev,
                loading: false,
                error: err.message || "Не удалось загрузить перевод",
              }
            : prev,
        );
      });
  }, []);

  const toggleParagraphTranslation = useCallback(
    (index: number, text: string) => {
      let shouldFetch = false;

      setParagraphStates((prev) => {
        const current = prev[index];

        if (current?.open) {
          return { ...prev, [index]: { ...current, open: false } };
        }

        if (current?.translation) {
          return { ...prev, [index]: { ...current, open: true } };
        }

        if (current?.loading) return prev;

        shouldFetch = true;
        return { ...prev, [index]: { open: true, loading: true } };
      });

      if (!shouldFetch) return;

      const fetchId = (paragraphFetchIdRef.current[index] ?? 0) + 1;
      paragraphFetchIdRef.current[index] = fetchId;

      fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: text, context: text, isParagraph: true }),
      })
        .then(async (res) => {
          const payload = (await res.json()) as ParagraphTranslateResult & {
            error?: string;
          };
          if (!res.ok) {
            throw new Error(payload.error ?? "Ошибка перевода");
          }
          return payload;
        })
        .then((data) => {
          if (paragraphFetchIdRef.current[index] !== fetchId) return;
          setParagraphStates((prev) => ({
            ...prev,
            [index]: {
              open: true,
              loading: false,
              translation: data.paragraphTranslation,
            },
          }));
        })
        .catch((err: Error) => {
          if (paragraphFetchIdRef.current[index] !== fetchId) return;
          setParagraphStates((prev) => ({
            ...prev,
            [index]: {
              open: true,
              loading: false,
              error: err.message || "Не удалось загрузить перевод",
            },
          }));
        });
    },
    [],
  );

  return (
    <div
      className="min-h-full bg-[#f7f5f0] py-12 px-4 text-[#2c2c2c]"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      onMouseUp={handleMouseUp}
    >
      <article ref={articleRef} className="mx-auto w-full max-w-[700px]">
        <header className="mb-10 border-b border-[#e0ddd6] pb-6">
          <p className="mb-2 text-sm tracking-wide text-[#8a8580] uppercase">
            Читалка
          </p>
          <h1 className="text-3xl font-normal leading-tight text-[#1a1a1a]">
            {TITLE}
          </h1>
        </header>

        <div className="space-y-6">
          {PARAGRAPHS.map((text, index) => {
            const pState = paragraphStates[index];
            const isOpen = pState?.open ?? false;

            return (
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <p
                      data-paragraph
                      className="min-w-0 flex-1 text-lg leading-[1.75] text-[#333]"
                    >
                      {text}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleParagraphTranslation(index, text);
                      }}
                      className="mt-1 shrink-0 rounded p-1 text-[#a8a29e] transition-colors hover:bg-[#f0eeea] hover:text-[#78716c]"
                      aria-label={
                        isOpen ? "Свернуть перевод" : "Перевести абзац"
                      }
                      aria-expanded={isOpen}
                    >
                      <ChevronIcon up={isOpen} />
                    </button>
                  </div>
                  {isOpen && pState?.loading ? (
                    <p className="mt-3 text-sm text-[#8a8580]">
                      Загрузка перевода...
                    </p>
                  ) : null}
                  {isOpen && pState?.error ? (
                    <p className="mt-3 text-sm text-red-600">{pState.error}</p>
                  ) : null}
                  {isOpen && pState?.translation ? (
                    <div
                      className="mt-3 rounded-md bg-[#f0eeea] px-4 py-3 text-base leading-[1.7] text-[#444]"
                      style={{
                        fontFamily: "system-ui, sans-serif",
                      }}
                    >
                      {pState.translation}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </article>

      {popup && (
        <div
          role="dialog"
          aria-live="polite"
          className="fixed z-50 rounded-xl px-6 py-5"
          style={{
            left: popup.left,
            top: popup.top,
            width: popup.width,
            marginTop: 8,
            fontFamily: "system-ui, sans-serif",
            background: "#ffffff",
            border: "1px solid #e0e0e0",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
          }}
        >
          <p className="text-lg font-bold leading-snug text-[#1a1a1a]">
            {popup.text}
          </p>

          {popup.loading ? (
            <p className="mt-2 text-sm text-[#8a8580]">Загрузка...</p>
          ) : popup.error ? (
            <p className="mt-2 text-sm text-red-600">{popup.error}</p>
          ) : popup.isPhrase && popup.phraseData ? (
            <>
              <p className="mt-1.5 text-base text-[#1a1a1a]">
                {popup.phraseData.translation}
              </p>
              <div className="mt-3 border-t border-[#e8e6e1] pt-3">
                <p className="text-sm leading-relaxed text-[#555]">
                  {popup.phraseData.explanation}
                </p>
              </div>
            </>
          ) : popup.wordData ? (
            <>
              <p className="mt-1.5 text-base text-[#1a1a1a]">
                {popup.wordData.translation}
              </p>
              {popup.wordData.transcription ? (
                <p className="mt-1 text-sm italic text-[#8a8580]">
                  {popup.wordData.transcription}
                </p>
              ) : null}
              {popup.wordData.examples.length > 0 ? (
                <ul className="mt-3 space-y-3 border-t border-[#e8e6e1] pt-3">
                  {popup.wordData.examples.map((example, i) => (
                    <li key={i}>
                      <p className="text-sm leading-snug text-[#333]">
                        {example.english}
                      </p>
                      <p className="mt-0.5 text-sm leading-snug text-[#8a8580]">
                        {example.russian}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
