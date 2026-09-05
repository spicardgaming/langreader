"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AccountTabs from "@/app/components/AccountTabs";
import "./vocabulary.css";

type Card = {
  id: string;
  word: string;
  translation: string;
  type: "word" | "phrase";
  transcription: string | null;
  examples: Array<{ english: string; russian?: string; translation?: string }> | null;
  book_title: string | null;
  created_at: string;
};

type Collection = {
  id: string;
  name: string;
};

const UNDO_DELAY_MS = 5000;

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="vocab-chevron"
      style={{ transform: up ? "rotate(180deg)" : undefined }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function VocabularyPage() {
  const router = useRouter();
  const actionsRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [cardCollectionIds, setCardCollectionIds] = useState<Record<string, string[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeCollectionState, setActiveCollectionState] = useState<string>("all");
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);

  // 3.3 additions
  const [typeFilter, setTypeFilter] = useState<"all" | "word" | "phrase">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsView, setActionsView] = useState<"menu" | "move" | "add">("menu");
  const [pendingDelete, setPendingDelete] = useState<{ cards: Card[]; timeoutId: ReturnType<typeof setTimeout> } | null>(null);

  // 3.4 additions — Add word or phrase dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<"word" | "phrase">("word");
  const [addCollectionId, setAddCollectionId] = useState<string>("none");
  const [addWord, setAddWord] = useState("");
  const [addTranslation, setAddTranslation] = useState("");
  const [addExample, setAddExample] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addDuplicate, setAddDuplicate] = useState<Card | null>(null);
  const [addCreatingCollection, setAddCreatingCollection] = useState(false);
  const [addNewCollectionName, setAddNewCollectionName] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 3.5 additions — pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const listTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }
      setUserId(session.user.id);

      const [cardsRes, collectionsRes] = await Promise.all([
        supabase
          .from("cards")
          .select("id, word, translation, type, transcription, examples, book_title, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("collections")
          .select("id, name")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true }),
      ]);

      const loadedCards = cardsRes.data || [];
      setCards(loadedCards);
      setCollections(collectionsRes.data || []);

      if (loadedCards.length > 0) {
        const cardIds = loadedCards.map((c) => c.id);
        const { data: linksData } = await supabase
          .from("card_collections")
          .select("card_id, collection_id")
          .in("card_id", cardIds);

        const map: Record<string, string[]> = {};
        (linksData || []).forEach((link) => {
          if (!map[link.card_id]) map[link.card_id] = [];
          map[link.card_id].push(link.collection_id);
        });
        setCardCollectionIds(map);
      }

      setLoading(false);
    }
    load();
  }, [router]);

  // Close Actions menu on outside click / Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
        setActionsView("menu");
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActionsOpen(false);
        setActionsView("menu");
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // Auto-dismiss the "Added to your vocabulary" toast
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const setActiveCollection = (value: string) => {
    setActiveCollectionState(value);
    setTypeFilter("all");
    setSelectedIds(new Set());
    setActionsOpen(false);
    setActionsView("menu");
    setCurrentPage(1);
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name || !userId) return;

    setCreatingCollection(true);
    const { data, error } = await supabase
      .from("collections")
      .insert({ user_id: userId, name })
      .select("id, name")
      .single();
    setCreatingCollection(false);

    if (error) {
      if (error.code === "23505") {
        window.alert("You already have a collection with this name.");
      } else {
        window.alert("Something went wrong. Please try again.");
      }
      return;
    }

    if (data) {
      setCollections((prev) => [...prev, data]);
      setActiveCollection(data.id);
      setNewCollectionName("");
      setNewCollectionOpen(false);
    }
  };

  // ---- Actions: Move / Add to collection ----

  const applyToSelected = async (targetCollectionId: string, mode: "move" | "add") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (mode === "move") {
      // Remove all existing memberships for these cards, then assign the target collection
      await supabase.from("card_collections").delete().in("card_id", ids);
    }

    const rows = ids.map((cardId) => ({ card_id: cardId, collection_id: targetCollectionId }));
    await supabase.from("card_collections").upsert(rows, { onConflict: "card_id,collection_id", ignoreDuplicates: true });

    // Refresh local membership map
    setCardCollectionIds((prev) => {
      const next = { ...prev };
      ids.forEach((cardId) => {
        const existing = mode === "move" ? [] : next[cardId] || [];
        next[cardId] = existing.includes(targetCollectionId) ? existing : [...existing, targetCollectionId];
      });
      return next;
    });

    setSelectedIds(new Set());
    setActionsOpen(false);
    setActionsView("menu");
  };

  // ---- Actions: Delete selected (soft delete with Undo) ----

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${ids.length} card${ids.length > 1 ? "s" : ""}? This will remove them from your vocabulary and all collections.`
    );
    if (!confirmed) return;

    const cardsToDelete = cards.filter((c) => ids.includes(c.id));

    // Optimistically remove from view right away
    setCards((prev) => prev.filter((c) => !ids.includes(c.id)));
    setSelectedIds(new Set());
    setActionsOpen(false);
    setActionsView("menu");

    const timeoutId = setTimeout(async () => {
      await supabase.from("cards").delete().in("id", ids);
      setPendingDelete(null);
    }, UNDO_DELAY_MS);

    setPendingDelete({ cards: cardsToDelete, timeoutId });
  };

  const handleUndoDelete = () => {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timeoutId);
    setCards((prev) => [...pendingDelete.cards, ...prev].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
    setPendingDelete(null);
  };

  // ---- Add word or phrase dialog ----

  const handleOpenAddDialog = () => {
    setAddType("word");
    // Pre-select the current collection if a real one is active; otherwise default to "No collection"
    setAddCollectionId(
      activeCollectionState !== "all" && activeCollectionState !== "none" ? activeCollectionState : "none"
    );
    setAddWord("");
    setAddTranslation("");
    setAddExample("");
    setAddDuplicate(null);
    setAddNewCollectionName("");
    setAddOpen(true);
  };

  const checkForDuplicate = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || !userId) {
      setAddDuplicate(null);
      return;
    }
    const { data } = await supabase
      .from("cards")
      .select("id, word, translation, type, transcription, examples, book_title, created_at")
      .eq("user_id", userId)
      .ilike("word", trimmed)
      .limit(1)
      .maybeSingle();
    setAddDuplicate(data || null);
  };

  const handleViewDuplicate = () => {
    if (!addDuplicate) return;
    setAddOpen(false);
    setActiveCollection("all");
    setTimeout(() => {
      const el = document.getElementById(`card-${addDuplicate.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const handleCreateCollectionInline = async () => {
    const name = addNewCollectionName.trim();
    if (!name || !userId) return;

    setAddCreatingCollection(true);
    const { data, error } = await supabase
      .from("collections")
      .insert({ user_id: userId, name })
      .select("id, name")
      .single();
    setAddCreatingCollection(false);

    if (error) {
      window.alert(error.code === "23505" ? "You already have a collection with this name." : "Something went wrong.");
      return;
    }

    if (data) {
      setCollections((prev) => [...prev, data]);
      setAddCollectionId(data.id);
      setAddNewCollectionName("");
    }
  };

  const handleSaveNewCard = async () => {
    const word = addWord.trim();
    const translation = addTranslation.trim();
    if (!word || !translation || !userId) return;

    setAddSaving(true);

    const { data: newCard, error } = await supabase
      .from("cards")
      .insert({
        user_id: userId,
        word,
        translation,
        type: addType,
        transcription: "",
        examples: addExample.trim() ? [{ english: addExample.trim() }] : [],
        book_id: null,
        book_title: null,
      })
      .select("id, word, translation, type, transcription, examples, book_title, created_at")
      .single();

    if (error || !newCard) {
      setAddSaving(false);
      window.alert("Something went wrong. Please try again.");
      return;
    }

    if (addCollectionId !== "none") {
      await supabase.from("card_collections").insert({ card_id: newCard.id, collection_id: addCollectionId });
      setCardCollectionIds((prev) => ({ ...prev, [newCard.id]: [addCollectionId] }));
    }

    setCards((prev) => [newCard, ...prev]);
    setAddSaving(false);
    setAddOpen(false);
    setSuccessMessage("Added to your vocabulary");
  };

  // ---- Derived data ----

  const noCollectionCount = useMemo(
    () => cards.filter((c) => !cardCollectionIds[c.id] || cardCollectionIds[c.id].length === 0).length,
    [cards, cardCollectionIds]
  );

  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    collections.forEach((col) => {
      counts[col.id] = cards.filter((c) => (cardCollectionIds[c.id] || []).includes(col.id)).length;
    });
    return counts;
  }, [cards, collections, cardCollectionIds]);

  const collectionFilteredCards = useMemo(() => {
    if (activeCollectionState === "all") return cards;
    if (activeCollectionState === "none") {
      return cards.filter((c) => !cardCollectionIds[c.id] || cardCollectionIds[c.id].length === 0);
    }
    return cards.filter((c) => (cardCollectionIds[c.id] || []).includes(activeCollectionState));
  }, [cards, activeCollectionState, cardCollectionIds]);

  const visibleCards = useMemo(() => {
    if (activeCollectionState !== "all" || typeFilter === "all") return collectionFilteredCards;
    return collectionFilteredCards.filter((c) => c.type === typeFilter);
  }, [collectionFilteredCards, activeCollectionState, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleCards.length / PAGE_SIZE));
  // If filtering/deleting shrank the list, fall back to the last page that still exists
  const safePage = Math.min(currentPage, totalPages);
  const pagedCards = visibleCards.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedIds(new Set());
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getPageNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | string)[] = [1];
    const rangeStart = Math.max(2, current - 2);
    const rangeEnd = Math.min(total - 1, current + 2);
    if (rangeStart > 2) pages.push("...");
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (rangeEnd < total - 1) pages.push("...");
    pages.push(total);
    return pages;
  };

  const activeTitle =
    activeCollectionState === "all"
      ? "All saved"
      : activeCollectionState === "none"
      ? "No collection"
      : collections.find((c) => c.id === activeCollectionState)?.name || "Collection";

  const getCardCategoryLabel = (cardId: string) => {
    const ids = cardCollectionIds[cardId] || [];
    if (ids.length === 0) return "No collection";
    const first = collections.find((c) => c.id === ids[0])?.name || "Collection";
    return ids.length > 1 ? `${first} +${ids.length - 1}` : first;
  };

  return (
    <div className="vocab-page">
      <AccountTabs />

      <header className="vocab-header">
        <div>
          <h1>My vocabulary</h1>
          <p>Words and phrases saved while reading.</p>
        </div>
        <div className="vocab-header-actions">
          <button
            className="vocab-btn vocab-btn-ghost"
            onClick={() => setNewCollectionOpen((prev) => !prev)}
          >
            + New collection
          </button>
          <button className="vocab-btn vocab-btn-primary" onClick={handleOpenAddDialog}>
            + Add word or phrase
          </button>
        </div>
      </header>

      {newCollectionOpen && (
        <div className="vocab-card vocab-new-row-standalone">
          <input
            autoFocus
            placeholder="Collection name"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateCollection()}
          />
          <button className="vocab-btn vocab-btn-primary" disabled={creatingCollection} onClick={handleCreateCollection}>
            Create
          </button>
          <button className="vocab-btn vocab-btn-ghost" onClick={() => { setNewCollectionOpen(false); setNewCollectionName(""); }}>
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <div className="vocab-card vocab-empty">Loading...</div>
      ) : (
        <div className="vocab-layout">
          <aside className="vocab-sidebar">
            <div className="vocab-side-head">
              <strong>Collections</strong>
              <span style={{ color: "#68736e" }}>{collections.length}</span>
            </div>
            <div className="vocab-collections">
              <button
                className={`vocab-collection${activeCollectionState === "all" ? " is-current" : ""}`}
                onClick={() => setActiveCollection("all")}
              >
                <span>All saved</span>
                <small>{cards.length}</small>
              </button>
              <button
                className={`vocab-collection${activeCollectionState === "none" ? " is-current" : ""}`}
                onClick={() => setActiveCollection("none")}
              >
                <span>No collection</span>
                <small>{noCollectionCount}</small>
              </button>
              {collections.map((col) => (
                <button
                  key={col.id}
                  className={`vocab-collection${activeCollectionState === col.id ? " is-current" : ""}`}
                  onClick={() => setActiveCollection(col.id)}
                >
                  <span>{col.name}</span>
                  <small>{collectionCounts[col.id] || 0}</small>
                </button>
              ))}
            </div>
          </aside>

          <main>
            <label className="vocab-mobile-collection">
              <select value={activeCollectionState} onChange={(e) => setActiveCollection(e.target.value)}>
                <option value="all">All saved · {cards.length}</option>
                <option value="none">No collection · {noCollectionCount}</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name} · {collectionCounts[col.id] || 0}
                  </option>
                ))}
              </select>
            </label>

            <div className="vocab-list-head">
              <h2>{activeTitle}</h2>
              {activeCollectionState === "all" && (
                <div className="vocab-type-filter" role="tablist" aria-label="Filter saved vocabulary by type">
                  {(["all", "word", "phrase"] as const).map((t) => (
                    <button
                      key={t}
                      role="tab"
                      aria-selected={typeFilter === t}
                      className={`vocab-type-pill${typeFilter === t ? " active" : ""}`}
                      onClick={() => { setTypeFilter(t); setSelectedIds(new Set()); setCurrentPage(1); }}
                    >
                      {t === "all" ? "All types" : t === "word" ? "Words" : "Phrases"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="vocab-toolbar">
              <div className="vocab-toolbar-left" ref={actionsRef}>
                <button
                  className="vocab-btn"
                  disabled={selectedIds.size === 0}
                  onClick={() => setActionsOpen((prev) => !prev)}
                >
                  Actions ▾
                </button>
                <span className="vocab-selected-count">
                  <b>{selectedIds.size}</b> selected
                </span>

                {actionsOpen && (
                  <div className="vocab-actions-menu">
                    {actionsView === "menu" && (
                      <>
                        <button className="vocab-btn vocab-btn-ghost" onClick={() => setActionsView("move")}>
                          Move to collection
                        </button>
                        <button className="vocab-btn vocab-btn-ghost" onClick={() => setActionsView("add")}>
                          Add to another collection
                        </button>
                        <button className="vocab-btn vocab-btn-ghost vocab-danger" onClick={handleDeleteSelected}>
                          Delete selected
                        </button>
                      </>
                    )}
                    {(actionsView === "move" || actionsView === "add") && (
                      <>
                        {collections.length === 0 ? (
                          <p className="vocab-menu-empty">Create a collection first.</p>
                        ) : (
                          collections.map((col) => (
                            <button
                              key={col.id}
                              className="vocab-btn vocab-btn-ghost"
                              onClick={() => applyToSelected(col.id, actionsView === "move" ? "move" : "add")}
                            >
                              {col.name}
                            </button>
                          ))
                        )}
                        <button className="vocab-btn vocab-btn-ghost" onClick={() => setActionsView("menu")}>
                          ← Back
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <span className="vocab-visible-count">
                <b>{visibleCards.length}</b> saved items
              </span>
            </div>

            <div ref={listTopRef} />

            {visibleCards.length === 0 ? (
              <div className="vocab-card vocab-empty">
                {cards.length === 0 ? (
                  <>
                    <p>Your vocabulary is empty.</p>
                    <p style={{ marginTop: 4, fontSize: 13 }}>Save words while reading or add one manually.</p>
                    <button className="vocab-btn vocab-btn-primary" style={{ marginTop: 14 }} onClick={handleOpenAddDialog}>
                      Add word or phrase
                    </button>
                  </>
                ) : typeFilter !== "all" ? (
                  <>
                    <p>{typeFilter === "word" ? "No saved words yet." : "No saved phrases yet."}</p>
                    <button className="vocab-btn" style={{ marginTop: 14 }} onClick={() => { setTypeFilter("all"); setCurrentPage(1); }}>
                      Show all types
                    </button>
                  </>
                ) : (
                  <>
                    <p>No cards in this collection yet.</p>
                    <button className="vocab-btn vocab-btn-primary" style={{ marginTop: 14 }} onClick={handleOpenAddDialog}>
                      Add word or phrase
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="vocab-list">
                {pagedCards.map((card) => {
                  const isOpen = expanded.has(card.id);
                  const isSelected = selectedIds.has(card.id);
                  const example = card.examples && card.examples.length > 0 ? card.examples[0] : null;
                  const exampleTranslation = example ? (example.translation ?? example.russian ?? "") : "";
                  const canExpand = !!example;

                  return (
                    <article
                      key={card.id}
                      id={`card-${card.id}`}
                      className={`vocab-card vocab-entry${isOpen ? " is-open" : ""}${isSelected ? " is-selected" : ""}`}
                    >
                      <div className="vocab-entry-head">
                        <label className="vocab-check" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="vocab-select"
                            checked={isSelected}
                            onChange={() => toggleSelected(card.id)}
                            aria-label={`Select ${card.word}`}
                          />
                          <span className="vocab-check-circle" aria-hidden="true">
                            {isSelected && <CheckIcon />}
                          </span>
                        </label>

                        <div
                          className="vocab-title"
                          style={{ cursor: canExpand ? "pointer" : "default" }}
                          onClick={() => canExpand && toggleExpanded(card.id)}
                        >
                          <h3>{card.word}</h3>
                          <p className="vocab-translation">{card.translation}</p>
                          <div className="vocab-meta">
                            <span className="vocab-category">{getCardCategoryLabel(card.id)}</span>
                            {card.book_title && (
                              <span className="vocab-source">
                                <BookIcon /> {card.book_title}
                              </span>
                            )}
                          </div>
                        </div>

                        {canExpand && (
                          <button
                            className="vocab-entry-buttons"
                            onClick={() => toggleExpanded(card.id)}
                            aria-label={isOpen ? "Collapse card" : "Expand card"}
                          >
                            <ChevronIcon up={isOpen} />
                          </button>
                        )}
                      </div>

                      {isOpen && example && (
                        <div className="vocab-expanded">
                          <div className="vocab-context">
                            <p>{example.english}</p>
                            {exampleTranslation && <p>{exampleTranslation}</p>}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <nav className="vocab-pagination" aria-label="Vocabulary pages">
                <button
                  className="vocab-btn vocab-btn-ghost"
                  disabled={safePage === 1}
                  onClick={() => handlePageChange(safePage - 1)}
                >
                  Previous
                </button>
                {getPageNumbers(safePage, totalPages).map((page, idx) =>
                  typeof page === "string" ? (
                    <span key={`ellipsis-${idx}`} className="vocab-page-ellipsis">…</span>
                  ) : (
                    <button
                      key={page}
                      className={`vocab-btn vocab-page${page === safePage ? " is-current" : ""}`}
                      aria-current={page === safePage ? "page" : undefined}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  className="vocab-btn vocab-btn-ghost"
                  disabled={safePage === totalPages}
                  onClick={() => handlePageChange(safePage + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </main>
        </div>
      )}

      {addOpen && (
        <div className="vocab-overlay" role="dialog" aria-modal="true" aria-labelledby="vocab-add-title">
          <div className="vocab-card vocab-dialog">
            <div className="vocab-dialog-head">
              <h3 id="vocab-add-title">Add word or phrase</h3>
              <button className="vocab-btn vocab-btn-ghost" onClick={() => setAddOpen(false)} aria-label="Close">
                ×
              </button>
            </div>

            <div className="vocab-form">
              <div className="vocab-form-row">
                <label className="vocab-form-label">
                  Type
                  <select value={addType} onChange={(e) => setAddType(e.target.value as "word" | "phrase")}>
                    <option value="word">Word</option>
                    <option value="phrase">Phrase</option>
                  </select>
                </label>
                <label className="vocab-form-label">
                  Collection
                  <select
                    value={addCollectionId}
                    onChange={(e) => setAddCollectionId(e.target.value)}
                  >
                    <option value="none">No collection</option>
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>{col.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="vocab-inline-create">
                <input
                  placeholder="Or create a new collection..."
                  value={addNewCollectionName}
                  onChange={(e) => setAddNewCollectionName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateCollectionInline()}
                />
                <button className="vocab-btn vocab-btn-ghost" disabled={addCreatingCollection} onClick={handleCreateCollectionInline}>
                  Create
                </button>
              </div>

              <label className="vocab-form-label">
                Word or phrase
                <input
                  value={addWord}
                  onChange={(e) => setAddWord(e.target.value)}
                  onBlur={(e) => checkForDuplicate(e.target.value)}
                />
              </label>

              {addDuplicate && (
                <div className="vocab-duplicate-warning">
                  This card may already exist.{" "}
                  <button className="vocab-link-button" onClick={handleViewDuplicate}>View existing card</button>
                </div>
              )}

              <label className="vocab-form-label">
                Translation
                <input value={addTranslation} onChange={(e) => setAddTranslation(e.target.value)} />
              </label>

              <label className="vocab-form-label">
                Example <span className="vocab-optional">optional</span>
                <textarea rows={2} value={addExample} onChange={(e) => setAddExample(e.target.value)} />
              </label>

              <div className="vocab-dialog-actions">
                <button className="vocab-btn vocab-btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
                <button
                  className="vocab-btn vocab-btn-primary"
                  disabled={addSaving || !addWord.trim() || !addTranslation.trim()}
                  onClick={handleSaveNewCard}
                >
                  {addSaving ? "Saving..." : "Add to collection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="vocab-toast vocab-toast-success" role="status" aria-live="polite">
          <span>{successMessage}</span>
        </div>
      )}

      {pendingDelete && (
        <div className="vocab-toast" role="status" aria-live="polite">
          <span>
            {pendingDelete.cards.length} card{pendingDelete.cards.length > 1 ? "s" : ""} deleted.
          </span>
          <button className="vocab-toast-undo" onClick={handleUndoDelete}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
