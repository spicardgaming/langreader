"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Example = {
  english: string;
  russian: string;
  translation?: string;
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
  anchorTop: number;
  anchorLeft: number;
  width: number;
  loading: boolean;
  error?: string;
  wordData?: WordTranslateResult;
  phraseData?: PhraseTranslateResult;
  saveStatus?: "idle" | "saving" | "saved" | "already_saved" | "error";
  saveMessage?: string;
};

type PopupPlacement = {
  top: number;
  left: number;
  isMobile: boolean;
};

type ReaderProps = {
  title: string;
  paragraphs: string[];
};

const POPUP_GAP = 8;
const POPUP_VIEWPORT_MARGIN = 8;
const POPUP_MAX_HEIGHT_VH = 70;
const PARAGRAPH_FETCH_TIMEOUT_MS = 30_000;
const PARAGRAPH_LOAD_ERROR = "Loading error. Please try again";
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

function computePopupPlacement(
  anchorBottom: number,
  anchorTop: number,
  anchorLeft: number,
  popupWidth: number,
  containerWidth: number,
  popupHeight?: number,
): PopupPlacement {
  const isMobile = window.innerWidth < 768;
  
  if (isMobile) {
    // Mobile: fixed at bottom
    return { top: 0, left: 0, isMobile: true };
  }
  
  // Desktop: position near selected text
  const containerRect = document.querySelector('[data-reader-container]')?.getBoundingClientRect();
  let left = containerRect?.left ?? anchorLeft;
  
  // Ensure popup doesn't go off right edge
  if (left + popupWidth > window.innerWidth) {
    left = window.innerWidth - popupWidth - 16;
  }

  // Determine if popup should be above or below the word
  const estimatedHeight = popupHeight || 300;
  let top: number;
  
  if (anchorTop > window.innerHeight / 2) {
    // Show popup ABOVE the word
    top = anchorTop - estimatedHeight - POPUP_GAP;
  } else {
    // Show popup BELOW the word
    top = anchorBottom + POPUP_GAP;
  }

  return { top, left, isMobile: false };
}

const WORD_CHAR = /\p{L}/u;

function isSingleWord(text: string): boolean {
  const word = text.trim();
  return word.length > 0 && /^[\p{L}'-]+$/u.test(word);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isValidPhrase(text: string): boolean {
  const n = countWords(text);
  return n > 1 && n <= 10;
}

function isEnglishSelection(text: string): boolean {
  return /^[\p{L}\s'.,!?-]+$/u.test(text.trim());
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

  if (wordStart > end || wordEnd < start) return null;

  return setRangeOffsets(paragraph, wordStart, wordEnd);
}

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

export default function Reader({ title, paragraphs }: ReaderProps) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
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

  useEffect(() => {
    async function loadUserId() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
      }
    }
    loadUserId();
  }, []);

  const handleSaveCard = useCallback(async () => {
    if (!popup) return;

    setPopup((prev) => (prev ? { ...prev, saveStatus: "saving" } : prev));

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth");
        return;
      }

      const userId = session.user.id;

      const { data: existingCards } = await supabase
        .from("cards")
        .select("id")
        .eq("user_id", userId)
        .eq("word", popup.text)
        .limit(1);

      if (existingCards && existingCards.length > 0) {
        setPopup((prev) =>
          prev
            ? {
                ...prev,
                saveStatus: "already_saved",
                saveMessage: "Already saved",
              }
            : prev
        );
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', userId)
        .single();

      if (profile?.plan !== 'pro') {
        const { count } = await supabase
          .from('cards')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (count !== null && count >= 100) {
          setPopup((prev) => prev ? {
            ...prev,
            saveStatus: 'error',
            saveMessage: 'You have saved 100 words. Continue reading for free, or upgrade to Pro to save more.'
          } : prev);
          return;
        }
      }

      const cardData = {
        user_id: userId,
        word: popup.text,
        type: popup.isPhrase ? "phrase" : "word",
        translation: popup.isPhrase
          ? popup.phraseData?.translation || ""
          : popup.wordData?.translation || "",
        transcription: popup.isPhrase
          ? ""
          : popup.wordData?.transcription || "",
        examples: popup.isPhrase
          ? []
          : popup.wordData?.examples || [],
      };

      const { error } = await supabase.from("cards").insert(cardData);

      if (error) {
        throw error;
      }

      setPopup((prev) =>
        prev
          ? {
              ...prev,
              saveStatus: "saved",
              saveMessage: "Saved ✓",
            }
          : prev
      );
    } catch (error) {
      console.error("Error saving card:", error);
      setPopup((prev) =>
        prev
          ? {
              ...prev,
              saveStatus: "error",
              saveMessage: "Error saving card",
            }
          : prev
      );
    }
  }, [popup, router]);

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
      const popupHeight = popupRef.current.offsetHeight;
      setPopupPlacement(
        computePopupPlacement(
          popup.anchorBottom,
          popup.anchorTop,
          popup.anchorLeft,
          popup.width,
          containerWidth,
          popupHeight,
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

    let rawText = range.toString().trim();
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
      anchorBottom: selectionRect.bottom,
      anchorTop: selectionRect.top,
      anchorLeft: selectionRect.left,
      width: articleRect?.width ?? 700,
      loading: true,
    });

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: text, context, isPhrase, nativeLanguage: localStorage.getItem('balaka_native_language') || 'ru' }),
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

  const handleTouchEnd = useCallback(() => {
    setTimeout(() => {
      handleMouseUp();
    }, 100);
  }, [handleMouseUp]);

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
            nativeLanguage: localStorage.getItem('balaka_native_language') || 'ru',
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

  return (
    <div
      ref={pageRef}
      className="relative min-h-full bg-[#f7f5f0] py-12 px-4 pb-20 text-[#2c2c2c]"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
    >

      <article ref={articleRef} className="mx-auto w-full max-w-[700px]" data-reader-container>
        <header className="mb-10 border-b border-[#e0ddd6] pb-6">
          <h1 className="text-3xl font-normal leading-tight text-[#1a1a1a]">
            {title}
          </h1>
        </header>

        <div className="space-y-6">
          {paragraphs.map((text, index) => {
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
                        isOpen ? "Collapse translation" : "Translate paragraph"
                      }
                      aria-expanded={isOpen}
                    >
                      <ChevronIcon up={isOpen} />
                    </button>
                  </div>
                  {isOpen && pState?.loading ? (
                    <p className="mt-3 text-sm text-[#8a8580]">
                      Loading translation...
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
          className={`fixed z-50 overflow-y-auto px-6 py-5 ${
            popupPlacement?.isMobile
              ? 'bottom-0 left-0 right-0 rounded-t-xl max-h-[60vh]'
              : 'rounded-xl'
          }`}
          style={{
            ...(popupPlacement?.isMobile
              ? {
                  width: '100%',
                  maxHeight: '60vh',
                }
              : {
                  left: popupPlacement?.left ?? popup.anchorLeft,
                  top: popupPlacement?.top ?? popup.anchorBottom + POPUP_GAP,
                  width: popup.width,
                  maxHeight: `${POPUP_MAX_HEIGHT_VH}vh`,
                }),
            fontFamily: "system-ui, sans-serif",
            background: "#ffffff",
            border: "1px solid #e0e0e0",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <p className="text-lg font-bold leading-snug text-[#1a1a1a]">
              {popup.text}
            </p>
            {!popup.loading && !popup.error && (popup.wordData || popup.phraseData) && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveCard();
                }}
                disabled={popup.saveStatus === "saving" || popup.saveStatus === "saved" || popup.saveStatus === "already_saved"}
                className="shrink-0 rounded-md bg-[#2c2c2c] px-3 py-1.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ position: "relative", zIndex: 9999 }}
              >
                {popup.saveStatus === "saved" ? "Saved ✓" : popup.saveStatus === "already_saved" ? "Already saved" : popup.saveStatus === "saving" ? "Saving..." : "Save as a card"}
              </button>
            )}
          </div>
          {popup.saveStatus === "error" && popup.saveMessage && (
            <p className="mt-2 text-sm text-red-600">{popup.saveMessage}</p>
          )}

          {popup.loading ? (
            <p className="mt-2 text-sm text-[#8a8580]">Loading...</p>
          ) : popup.error ? (
            <p className="mt-2 text-sm text-red-600">{popup.error}</p>
          ) : popup.isPhrase && popup.phraseData ? (
            <>
              <p className="mt-3 text-base text-[#1a1a1a]">
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
              <p className="mt-3 text-base text-[#1a1a1a]">
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
                        {example.russian ?? example.translation}
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
