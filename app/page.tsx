"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "./landing.css";

/* NOTE ON ASSETS
   Place these files (from balaka-media-assets.zip) into /public/landing/ before
   testing this page, so the paths below resolve:
     public/landing/upload-result.png
     public/landing/check.svg
     public/landing/arrow.svg
     public/landing/favicon.svg
*/

function ArrowIcon() {
  return <img src="/landing/arrow.svg" alt="" width={16} height={16} />;
}
function CheckIcon() {
  return <img src="/landing/check.svg" alt="" width={16} height={16} />;
}

export default function LandingPreview() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [nativeLanguage, setNativeLanguage] = useState("ru");
  const [learningLanguage, setLearningLanguage] = useState("en");
  const [libraryBooks, setLibraryBooks] = useState<
    { id: string; title: string; cover_url: string | null }[]
  >([]);
  const [libraryLoading, setLibraryLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
      setLoading(false);

      const savedNative = localStorage.getItem("balaka_native_language");
      const savedLearning = localStorage.getItem("balaka_learning_language");
      if (savedNative) setNativeLanguage(savedNative);
      if (savedLearning) setLearningLanguage(savedLearning);

      if (data.session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("native_language, learning_language")
          .eq("id", data.session.user.id)
          .single();
        if (profile?.native_language) {
          setNativeLanguage(profile.native_language);
          localStorage.setItem("balaka_native_language", profile.native_language);
        }
        if (profile?.learning_language) {
          setLearningLanguage(profile.learning_language);
          localStorage.setItem("balaka_learning_language", profile.learning_language);
        }
      }
    }
    checkSession();
  }, []);

  useEffect(() => {
    async function loadLibraryBooks() {
      setLibraryLoading(true);
      const { data, error } = await supabase
        .from("books")
        .select("id, title, cover_url")
        .eq("is_public", true)
        .eq("status", "done")
        .eq("language", learningLanguage)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setLibraryBooks(data);
      }
      setLibraryLoading(false);
    }
    loadLibraryBooks();
  }, [learningLanguage]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      {/* ================= HEADER ================= */}
      <div className="sticky-header-bar">
        <header className="site-header">
          <div className="brand">
            <span className="brand-mark">b</span>
            balaka
          </div>
          <nav>
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <a href="#library">Library</a>
            <Link href="/pricing">Pricing</Link>
          </nav>
          {!loading && (
            <div className="header-actions">
              {isAuthenticated ? (
                <>
                  <Link href="/account" className="button outline small">My account</Link>
                  <button onClick={handleSignOut} className="button small">Sign out</button>
                </>
              ) : (
                <>
                  <Link href="/auth" className="sign-in">Sign in</Link>
                  <Link href="/auth" className="button small">Start free</Link>
                </>
              )}
            </div>
          )}
        </header>
      </div>

      {/* ================= HERO ================= */}
      <section className="section-shell hero">
        <div className="hero-copy">
          <p className="eyebrow"><span>●</span> Learn a language through stories</p>
          <h1>
            Read in a new language — <em>even</em> when the original still feels difficult
          </h1>
          <p className="lead">
            Balaka adapts texts and books for comfortable reading, explains unfamiliar words, and saves useful vocabulary.
          </p>
          <div className="button-row">
            <Link href="/auth" className="button">Start reading for free</Link>
            <a href="#how-it-works" className="text-link">See how it works<span>→</span></a>
          </div>
          <p className="microcopy">No credit card required · Free plan available</p>
        </div>

        <div className="hero-product">
          <div className="reader-window">
            <div className="window-bar">
              <span className="window-dot" /><span className="window-dot" /><span className="window-dot" />
              <span className="window-title reader-menu">BALAKA</span>
            </div>
            <div className="reader-progress"><span /></div>
            <div className="reader-page">
              <p className="chapter-label">Chapter 2</p>
              <h3>En mis años más jóvenes y vulnerables</h3>
              <p>
                mi padre me dio un consejo que desde entonces he dado vueltas en mi cabeza.
                &ldquo;Cuando sientas ganas de criticar a alguien&rdquo;, me dijo, &ldquo;recuerda que no
                todas las personas han tenido las <mark>ventajas</mark> que tú tuviste&rdquo;.
              </p>
              <div className="word-card" style={{ position: "static", marginTop: 18 }}>
                <div className="word-card-head">
                  <strong>ventajas</strong>
                  <button aria-label="Close">×</button>
                </div>
                <p className="word-meta">advantages</p>
                <p>Conditions or qualities that help someone achieve a better result.</p>
                <button className="save-word">+ Save word</button>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16, textAlign: "center", position: "relative", zIndex: 2 }}>
            <Link href="/account" className="button pale" style={{ display: "inline-flex" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12" />
                <path d="m7 8 5-5 5 5" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              Upload your own text
            </Link>
          </div>
        </div>
      </section>

      <div className="language-strip">
        <span>Read in:</span>
        <b>English</b><i>·</i><b>German</b><i>·</i><b>French</b><i>·</i><b>Spanish</b><i>·</i><b>Italian</b>
        <a href="#library">and other languages</a>
      </div>

      {/* ================= TWO WAYS TO READ ================= */}
      <section id="how-it-works" className="section-shell mode-section">
        <div className="section-heading centered">
          <p className="kicker">Read at your level</p>
          <h2>One text. Two ways to read.</h2>
          <p>Don&apos;t put aside an interesting book or article because the language feels difficult. Choose the mode that works for you now.</p>
        </div>

        <div className="mode-comparison">
          <div className="mode-card">
            <div className="mode-top">
              <span className="mode-icon">Aa</span>
              <span className="tag">The author&apos;s words</span>
            </div>
            <p className="kicker" style={{ marginTop: 18 }}>Original</p>
            <h3>Read the text as it was written</h3>
            <p>Keep the author&apos;s language and style, with translation and explanations available whenever you need them.</p>
            <div className="text-sample">
              <p>&ldquo;Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, “and what is the use of a book,” thought Alice “without pictures or conversations?”&rdquo;</p>
            </div>
            <div className="mode-footer">
              <small>The original text is ready to read — no upload required.</small>
              <Link href="/reader/c12739df-67a3-41cc-9a20-039d96385a8d" className="button small">
                Read the original →
              </Link>
            </div>
          </div>

          <div className="mode-card adapted">
            <div className="mode-top">
              <span className="mode-icon sparkle">+</span>
              <span className="tag">Clearer language</span>
            </div>
            <p className="kicker" style={{ marginTop: 18 }}>Retelling</p>
            <h3>Follow the same story more easily</h3>
            <p>Read an adapted retelling with clearer wording and simpler sentences while the central meaning stays intact.</p>
            <div className="text-sample">
              <p>&ldquo;Alice sat by her sister on the bank, but she was bored. Her sister was reading a book with no pictures or conversations. Alice wondered why anyone would read such a dull book.&rdquo;</p>
            </div>
            <div className="mode-footer">
              <small>We&apos;ve already prepared an adapted version for easier reading.</small>
              <Link href="/reader/5edfe290-b9c8-4b0b-9241-87a7b3be92ee" className="button small">
                Read the retelling →
              </Link>
            </div>
          </div>

          <span className="or-badge">or</span>
        </div>
      </section>

      {/* ================= HOW IT WORKS STEPS ================= */}
      <section className="steps-section">
        <div className="section-shell section-heading split">
          <div>
            <p className="kicker light">How it works</p>
            <h2>From a file to the first page in minutes</h2>
          </div>
          <p>No courses or artificial dialogues. Learn with a book or text you genuinely want to read.</p>
        </div>

        <div className="section-shell steps-grid">
          <article>
            <p className="step-number">01</p>
            <div className="step-visual">
              <div className="mini-book one" />
              <div className="mini-book two" />
            </div>
            <h3>Choose what to read</h3>
            <p>Pick from the library, or upload your own .txt, .epub, or .pdf.</p>
          </article>

          <article>
            <p className="step-number">02</p>
            <div className="step-visual">
              <div className="choice-visual" style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                <span>Original</span>
                <b>Adaptation +</b>
              </div>
            </div>
            <h3>Set the difficulty</h3>
            <p>Keep the original wording, or create a simpler adaptation.</p>
          </article>

          <article>
            <p className="step-number">03</p>
            <div className="step-visual translate-visual">
              <span>Tap a word for support:</span>
              <div>
                <b>advirtió</b>
                <span>warned — verb, past tense</span>
              </div>
            </div>
            <h3>Read with support</h3>
            <p>Tap a word to see its translation, form, and explanation in context.</p>
          </article>

          <article>
            <p className="step-number">04</p>
            <div className="step-visual card-visual" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div>
                <small>SAVED WORD</small>
                <b>aliviada</b>
                <span>relieved · adjective</span>
              </div>
              <span className="saved-check"><CheckIcon /></span>
            </div>
            <h3>Save new words</h3>
            <p>Build a personal vocabulary from what you read, one word at a time.</p>
          </article>
        </div>
      </section>

      {/* ================= EVERYTHING STAYS INSIDE THE TEXT ================= */}
      <section id="features" className="section-shell reader-feature">
        <div className="feature-copy">
          <p className="kicker">Balaka smart webreader</p>
          <h2>Everything you need stays inside the text</h2>
          <p>No switching between a dictionary, translator, and notes. Stay on the page and keep reading.</p>
          <ul className="feature-list">
            <li>
              <CheckIcon />
              <span>
                <b>Context-aware translation</b>
                <small>Get the meaning that fits the sentence, not the first dictionary result.</small>
              </span>
            </li>
            <li>
              <CheckIcon />
              <span>
                <b>Word form and explanation</b>
                <small>See the base form, part of speech, and a clear explanation.</small>
              </span>
            </li>
            <li>
              <CheckIcon />
              <span>
                <b>Progress across devices</b>
                <small>Continue exactly where you stopped, on any device.</small>
              </span>
            </li>
          </ul>
        </div>

        <div className="reader-stage">
          <div className="reader-window compact">
            <div className="window-bar">
              <span className="window-dot" /><span className="window-dot" /><span className="window-dot" />
              <span className="window-title reader-menu">BALAKA</span>
            </div>
            <div className="reader-page">
              <p className="chapter-label">Chapter 2</p>
              <h3>En mis años más jóvenes y vulnerables</h3>
              <p className="faded-copy">
                mi padre me dio un consejo que desde entonces he dado vueltas en mi cabeza.
                &ldquo;Cuando sientas ganas de criticar a alguien&rdquo;, me dijo, &ldquo;recuerda que no
                todas las personas han tenido las <mark>ventajas</mark> que tú tuviste&rdquo;.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= LIBRARY ================= */}
      <section id="library" className="library-section">
        <div className="section-shell">
          <h2 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: 32, margin: 0 }}>
            Not sure where to begin?
          </h2>

          {libraryLoading ? (
            <p style={{ marginTop: 40, color: "#7a827e" }}>Loading...</p>
          ) : libraryBooks.length === 0 ? (
            <div style={{ marginTop: 40, textAlign: "center", padding: "50px 0" }}>
              <p style={{ color: "#6e7773", marginBottom: 20 }}>
                No public texts in this language yet — be the first to add one.
              </p>
              <Link href="/account" className="button pale">Upload your own text</Link>
            </div>
          ) : (
            <div className="books-grid" style={{ marginTop: 40 }}>
              {libraryBooks.map((book, i) => {
                const tones = ["gold", "brick", "blue", "forest"];
                const tone = tones[i % tones.length];
                return (
                  <Link key={book.id} href={`/reader/${book.id}`} className="book-item">
                    <div
                      className={`book-cover ${book.cover_url ? "" : tone}`}
                      style={book.cover_url ? { backgroundImage: `url(${book.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                    >
                      {!book.cover_url && <span className="cover-mark">B</span>}
                    </div>
                    <p style={{ marginTop: 10, fontSize: 14, fontFamily: "var(--serif)", color: "#2b2b23" }}>
                      {book.title}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ================= UPLOAD YOUR CONTENT ================= */}
      <section className="section-shell upload-section">
        <div className="upload-card">
          <div className="upload-copy">
            <p className="kicker" style={{ color: "#f0d9c9" }}>Your content</p>
            <h2>Read the book or text you choose</h2>
            <p>Upload a file, choose the original or an adaptation, and Balaka will prepare it for comfortable reading.</p>
            <div className="file-types">
              <span>TXT</span><span>EPUB</span><span>PDF</span>
            </div>
            <Link href="/account" className="button pale">Upload your text</Link>
            <small>Up to 2,000,000 characters (more than 500 pages) on the Pro plan</small>
          </div>
          <div className="product-screenshot">
            <img src="/landing/upload-result.png" alt="Word lookup inside an uploaded text, showing an on-page translation and Save as a card" />
          </div>
        </div>
      </section>

      {/* ================= COMING SOON ================= */}
      <section className="section-shell coming-section">
        <div className="section-heading centered">
          <p className="kicker">Coming soon</p>
          <h2>Read wherever you find a great text</h2>
          <p>Balaka is growing beyond the library. These new ways to read are already in progress.</p>
        </div>

        <div className="coming-grid">
          <article>
            <span className="soon-pill">Coming soon</span>
            <div className="extension-art">
              <div className="browser-frame">
                <div>balaka.app</div>
                <p>A crisp result <mark>vocabulario</mark> completes the idea.</p>
                <span>vocabulary<br /><small>noun</small></span>
              </div>
            </div>
            <h3>Browser extension</h3>
            <p>Translate words and save vocabulary on any website — from articles and blogs to the news.</p>
            <div className="extension-buttons">
              <a href="#" className="install-button secondary"><span className="browser-icon chrome-icon">C</span>Chrome</a>
              <a href="#" className="install-button secondary"><span className="browser-icon firefox-icon">F</span>Firefox</a>
            </div>
          </article>

          <article>
            <span className="soon-pill">Coming soon</span>
            <div className="pwa-art">
              <div className="phone">
                <div className="phone-notch" />
                <b>balaka</b>
                <div className="phone-book">
                  Your saved text
                  <small>Available offline</small>
                </div>
              </div>
              <span className="offline-badge">Offline ready</span>
            </div>
            <h3>Balaka PWA</h3>
            <p>Install Balaka on your phone, read without extra data, and return to any text in one tap.</p>
            <a href="#" className="install-button">Install the PWA</a>
          </article>
        </div>
      </section>

      {/* ================= GROWS WITH YOUR LANGUAGE ================= */}
      <section className="audience-section">
        <div className="section-shell audience-grid">
          <div className="audience-title">
            <p className="kicker light">Your pace</p>
            <h2>Balaka grows with your language</h2>
            <p>Start with an accessible version and gradually move toward original texts.</p>
          </div>
          <div className="level-list">
            <article>
              <span>01</span>
              <div>
                <small>GET STARTED</small>
                <h3>Start with an adaptation</h3>
                <p>Follow the story in shorter and simpler wording than the original.</p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <small>KEEP GOING</small>
                <h3>Move to the original</h3>
                <p>The narrative stays familiar, so it&apos;s easier to read as-is.</p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <small>MAKE IT YOURS</small>
                <h3>Build your own collection</h3>
                <p>Upload books, articles, and texts that matter to you.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ================= PRICING ================= */}
      <section className="section-shell pricing-section">
        <div className="section-heading centered">
          <p className="kicker">Simple pricing</p>
          <h2>Start free. Read more with Pro.</h2>
          <p>No hidden add-ons or complicated limits on every action.</p>
        </div>

        <div className="pricing-grid">
          <div className="price-card">
            <div className="plan-name">Free</div>
            <h3>$0</h3>
            <div><p>A great way to start reading</p></div>
            <Link href="/auth" className="button outline small">Start for free</Link>
            <ul>
              <li><CheckIcon />Read books from the library</li>
              <li><CheckIcon />Save up to 100 words and phrases</li>
            </ul>
          </div>

          <div className="price-card pro">
            <span className="popular">Save with yearly</span>
            <div className="plan-name">Pro</div>
            <h3>$6.99 <small>/ month</small></h3>
            <div><p>or $69.99/year — 2 months free</p></div>
            <Link href="/pricing" className="button small">Try Pro →</Link>
            <ul>
              <li><CheckIcon />Everything in Free</li>
              <li><CheckIcon />Upload your own texts — .txt, .epub, or .pdf</li>
              <li><CheckIcon />Simplified retelling of uploaded texts</li>
              <li><CheckIcon />Up to 2,000,000 characters (more than 500 pages)</li>
              <li><CheckIcon />Unlimited saved words</li>
            </ul>
          </div>
        </div>
        <p className="pricing-note">Cancel anytime — you keep Pro access until the end of your billing period.</p>
      </section>

      {/* ================= FAQ ================= */}
      <section className="section-shell faq-section">
        <div>
          <p className="kicker">Questions & answers</p>
          <h2 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: "clamp(32px,4vw,44px)", lineHeight: 1.1, marginTop: 12 }}>
            What to know before your first text
          </h2>
        </div>
        <div className="faq-list">
          <details open>
            <summary>What level is Balaka for? <span>+</span></summary>
            <p>Balaka works best for readers who know some basics of the language and want real reading practice — the adaptation mode makes it approachable even earlier.</p>
          </details>
          <details>
            <summary>What is an adapted version? <span>+</span></summary>
            <p>An adaptation keeps the story and meaning of the original but uses simpler wording and shorter sentences, so it&apos;s easier to follow while you&apos;re still building vocabulary.</p>
          </details>
          <details>
            <summary>What can I upload? <span>+</span></summary>
            <p>Any .txt, .epub, or .pdf file in the language you&apos;re learning — on the Pro plan, up to 2,000,000 characters (more than 500 pages) per file.</p>
          </details>
          <details>
            <summary>Can I continue on another device? <span>+</span></summary>
            <p>Yes — your reading progress and saved words follow your account, so you can pick up exactly where you left off on any device.</p>
          </details>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="section-shell" style={{ paddingBottom: 110 }}>
        <div className="final-cta">
          <div className="cta-book"><span>B</span></div>
          <div>
            <p className="kicker" style={{ color: "#f0d9c9" }}>Your next read</p>
            <h2>The book, article, or story you have wanted to read can be next.</h2>
            <Link href="/auth" className="button pale">Start reading for free</Link>
          </div>
          <div className="cta-card">
            <small>SAVED WORD</small>
            <b>curiosidad</b>
            <span>curiosity · noun</span>
          </div>
        </div>
      </section>
    </>
  );
}
