"use client";

import {
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { BOOKS } from "@/lib/books";

type Example = {
  english: string;
  russian: string;
};

type VerbFormEntry = {
  name: string;
  form: string;
};

type VerbForms = {
  tense: string;
  forms: VerbFormEntry[];
};

type WordTranslateResult = {
  translation: string;
  transcription: string;
  examples: Example[];
  isVerb: boolean;
  verbForms: VerbForms | null;
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
  error?: string;
};

type PopupState = {
  text: string;
  isPhrase: boolean;
  anchorBottom: number;
  anchorLeft: number;
  width: number;
  loading: boolean;
  error?: string;
  wordData?: WordTranslateResult;
  phraseData?: PhraseTranslateResult;
};

type PopupPlacement = {
  top: number;
  left: number;
};

const POPUP_GAP = 8;
const POPUP_VIEWPORT_MARGIN = 8;
const POPUP_MAX_HEIGHT_VH = 70;
const PARAGRAPH_FETCH_TIMEOUT_MS = 30_000;
const PARAGRAPH_LOAD_ERROR = "Ошибка загрузки. Попробуйте снова";
const PARAGRAPH_TRANSLATIONS_STORAGE_KEY = "paragraph_translations";
const PARAGRAPH_CACHE_KEY_LENGTH = 50;

function getParagraphCacheKey(text: string): string {
  return text.slice(0, PARAGRAPH_CACHE_KEY_LENGTH);
}

function loadParagraphTranslationsFromStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PARAGRAPH_TRANSLATIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function saveParagraphTranslationsToStorage(cache: Record<string, string>): void {
  try {
    localStorage.setItem(
      PARAGRAPH_TRANSLATIONS_STORAGE_KEY,
      JSON.stringify(cache),
    );
  } catch {
    // localStorage unavailable or quota exceeded
  }
}

function getSelectionRect(range: Range): DOMRect {
  const rect = range.getBoundingClientRect();
  if (rect.width > 0 || rect.height > 0) {
    return rect;
  }
  const clientRect = range.getClientRects()[0];
  return clientRect ?? rect;
}

/** Coordinates relative to the page container (position: absolute). */
function computePopupPlacement(
  anchorBottom: number,
  anchorLeft: number,
  popupWidth: number,
  containerWidth: number,
): PopupPlacement {
  let left = anchorLeft;
  const maxLeft = containerWidth - popupWidth - POPUP_VIEWPORT_MARGIN;
  left = Math.max(POPUP_VIEWPORT_MARGIN, Math.min(left, maxLeft));

  const top = anchorBottom + POPUP_GAP;
  return { top, left };
}

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

export default function ReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const book = BOOKS[id];

  const [popup, setPopup] = useState<PopupState | null>(null);
  const [paragraphTranslationCache, setParagraphTranslationCache] = useState<
    Record<string, string>
  >(loadParagraphTranslationsFromStorage);
  const [paragraphStates, setParagraphStates] = useState<
    Record<number, ParagraphState>
  >({});
  const pageRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPlacement, setPopupPlacement] = useState<PopupPlacement | null>(
    null,
  );
  const skipCloseClickRef = useRef(false);
  const fetchIdRef = useRef(0);
  const paragraphFetchIdRef = useRef<Record<number, number>>({});

  const closePopup = useCallback(() => {
    setPopup(null);
    setPopupPlacement(null);
  }, []);

  useLayoutEffect(() => {
    if (!popup || !popupRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!popupRef.current || !popup || !pageRef.current) return;
      const containerWidth = pageRef.current.clientWidth;
      setPopupPlacement(
        computePopupPlacement(
          popup.anchorBottom,
          popup.anchorLeft,
          popup.width,
          containerWidth,
        ),
      );
    };

    updatePosition();

    const el = popupRef.current;
    const observer = new ResizeObserver(updatePosition);
    observer.observe(el);
    window.addEventListener("resize", updatePosition);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePosition);
    };
  }, [
    popup?.text,
    popup?.loading,
    popup?.error,
    popup?.wordData,
    popup?.phraseData,
    popup?.anchorBottom,
    popup?.anchorLeft,
    popup?.width,
  ]);

  useEffect(() => {
    if (!popup || !popupRef.current) return;
    popupRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [
    popup?.text,
    popup?.loading,
    popup?.wordData,
    popup?.phraseData,
    popup?.error,
  ]);

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
    const selectionRect = getSelectionRect(activeRange);
    const pageRect = pageRef.current?.getBoundingClientRect();
    const articleRect = articleRef.current?.getBoundingClientRect();
    const context = getParagraphContext(activeRange);

    skipCloseClickRef.current = true;
    const fetchId = ++fetchIdRef.current;

    setPopupPlacement(null);
    setPopup({
      text,
      isPhrase,
      anchorBottom: selectionRect.bottom - (pageRect?.top ?? 0),
      anchorLeft: selectionRect.left - (pageRect?.left ?? 0),
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
      const cacheKey = getParagraphCacheKey(text);
      const cached = paragraphTranslationCache[cacheKey];
      const isOpen = paragraphStates[index]?.open ?? false;

      if (isOpen) {
        setParagraphStates((prev) => ({
          ...prev,
          [index]: { open: false, loading: false },
        }));
        return;
      }

      if (cached !== undefined) {
        setParagraphStates((prev) => ({
          ...prev,
          [index]: { open: true, loading: false },
        }));
        return;
      }

      const fetchId = (paragraphFetchIdRef.current[index] ?? 0) + 1;
      paragraphFetchIdRef.current[index] = fetchId;

      setParagraphStates((prev) => ({
        ...prev,
        [index]: { open: true, loading: true, error: undefined },
      }));

      void (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          PARAGRAPH_FETCH_TIMEOUT_MS,
        );

        try {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              word: text,
              context: text,
              isParagraph: true,
            }),
            signal: controller.signal,
          });

          const payload = (await res.json()) as ParagraphTranslateResult & {
            error?: string;
          };

          if (!res.ok) {
            throw new Error(payload.error ?? PARAGRAPH_LOAD_ERROR);
          }

          const translation = payload.paragraphTranslation;
          if (typeof translation !== "string" || !translation.trim()) {
            throw new Error(PARAGRAPH_LOAD_ERROR);
          }

          if (paragraphFetchIdRef.current[index] !== fetchId) return;

          setParagraphTranslationCache((prev) => {
            const next = { ...prev, [cacheKey]: translation };
            saveParagraphTranslationsToStorage(next);
            return next;
          });
          setParagraphStates((prev) => {
            if (!prev[index]?.open) {
              return { ...prev, [index]: { open: false, loading: false } };
            }
            return {
              ...prev,
              [index]: { open: true, loading: false, error: undefined },
            };
          });
        } catch (err) {
          if (paragraphFetchIdRef.current[index] !== fetchId) return;

          const message =
            err instanceof DOMException && err.name === "AbortError"
              ? PARAGRAPH_LOAD_ERROR
              : err instanceof Error
                ? err.message || PARAGRAPH_LOAD_ERROR
                : PARAGRAPH_LOAD_ERROR;

          setParagraphStates((prev) => {
            if (!prev[index]?.open) {
              return { ...prev, [index]: { open: false, loading: false } };
            }
            return {
              ...prev,
              [index]: {
                open: true,
                loading: false,
                error: message,
              },
            };
          });
        } finally {
          clearTimeout(timeoutId);
          if (paragraphFetchIdRef.current[index] !== fetchId) return;
          setParagraphStates((prev) => {
            const current = prev[index];
            if (!current?.open || !current.loading) {
              return prev;
            }
            return {
              ...prev,
              [index]: { ...current, loading: false },
            };
          });
        }
      })();
    },
    [paragraphTranslationCache, paragraphStates],
  );

  if (!book) {
    return (
      <div
        className="flex min-h-full items-center justify-center bg-[#f7f5f0] px-4 py-12 text-[#2c2c2c]"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        <p className="text-lg text-[#57534e]">Книга не найдена</p>
      </div>
    );
  }

  const { title: bookTitle, paragraphs: bookParagraphs } = book;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: { '@type': 'Person', name: book.author },
    inLanguage: 'en',
    abstract: book.paragraphs[0].slice(0, 150),
  }

  return (
    <div
      ref={pageRef}
      className="relative min-h-full bg-[#f7f5f0] py-12 px-4 pb-[500px] text-[#2c2c2c]"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      onMouseUp={handleMouseUp}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article ref={articleRef} className="mx-auto w-full max-w-[700px]">
        <header className="mb-10 border-b border-[#e0ddd6] pb-6">
          <p className="mb-2 text-sm tracking-wide text-[#8a8580] uppercase">
            Читалка
          </p>
          <h1 className="text-3xl font-normal leading-tight text-[#1a1a1a]">
            {bookTitle}
          </h1>
        </header>

        <div className="space-y-6">
          {bookParagraphs.map((text, index) => {
            const cacheKey = getParagraphCacheKey(text);
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
                  {isOpen &&
                  paragraphTranslationCache[cacheKey] !== undefined ? (
                    <div
                      className="mt-3 rounded-md bg-[#f0eeea] px-4 py-3 text-base leading-[1.7] text-[#444]"
                      style={{
                        fontFamily: "system-ui, sans-serif",
                      }}
                    >
                      {paragraphTranslationCache[cacheKey]}
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
          ref={popupRef}
          role="dialog"
          aria-live="polite"
          className="absolute z-50 overflow-y-auto rounded-xl px-6 py-5"
          style={{
            left: popupPlacement?.left ?? popup.anchorLeft,
            top: popupPlacement?.top ?? popup.anchorBottom + POPUP_GAP,
            width: popup.width,
            maxHeight: `${POPUP_MAX_HEIGHT_VH}vh`,
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
              {popup.wordData.isVerb && popup.wordData.verbForms ? (
                <div className="mt-3 rounded-md bg-[#f5f5f5] px-4 py-3">
                  <p className="text-sm font-semibold text-[#333]">
                    {popup.wordData.verbForms.tense}
                  </p>
                  <table className="mt-2 w-full text-sm">
                    <tbody>
                      {popup.wordData.verbForms.forms.map((entry, i) => (
                        <tr key={i}>
                          <td className="py-1 pr-4 align-top text-[#666]">
                            {entry.name}
                          </td>
                          <td className="py-1 align-top text-[#1a1a1a]">
                            {entry.form}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
