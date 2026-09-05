# Balaka — Project Snapshot
_Last updated: July 2026_

## Current status
Stage 4 complete. UI/UX improvements done. Language switcher implemented and working. Upgrade/Cancel Pro subscription flow implemented and tested end-to-end (checkout, webhook, in-app cancellation, and direct-in-Stripe cancellation). Reading progress now syncs to Supabase for logged-in users (cross-device), tested and confirmed working. `/api/retell` and `/api/format` migrated off Vercel to a standalone server on Railway, tested end-to-end in production with large books. Monthly/per-file character limits reworked (1M → 2M, plus a one-time "grace pass" and a hard per-file cap) — see DOCS.md Section 16 for the cost reasoning. epub and PDF upload/extraction implemented and tested end-to-end in production on langreader.vercel.app (extraction, Read original, Create retelling, both formats) — see DOCS.md Section 16b.

Real launch is approaching. Concurrency hardening (retry-with-backoff, orphaned-job cleanup, processing concurrency limit) is now implemented and deployed. Legal pages (Privacy Policy, Terms of Service) are live and linked from the footer. Pricing raised to $6.99/month (or $69.99/year) — see "Pricing update" below. Language architecture overhaul and upload consolidation to `/account` are done. Stripe is still running in test mode (no real payments yet), so switching Vercel to the Pro plan isn't urgent this moment — but it's still required before flipping Stripe to live mode, since Hobby's terms prohibit commercial/paid use (confirmed directly from Vercel's current terms). Homepage → landing page redesign is complete and merged into `app/page.tsx` — see "Homepage → landing page ✅" below. `/account` is now split into three real tabs (Books / Vocabulary / Profile) with a full vocabulary/collections feature built from scratch — see "My vocabulary ✅" below.

Full UI internationalization is intentionally postponed — interface stays English-only for now. PWA is planned as the final step, after all other plan items are done.

---

## Completed stages

### Stage 0 — Setup
- Next.js (App Router), Tailwind CSS, Supabase, Vercel, GitHub
- VSCode + Cline, Anthropic API key

### Stage 1 — Reader
- Word selection → translation, transcription, IPA, 2 examples
- Phrase selection → translation + explanation
- Auto-expand partial word selection to full word
- Unicode-compatible word boundary detection (`\p{L}/u`) — supports accented chars and all languages
- Touch support for mobile word selection (`onTouchEnd` + 100ms setTimeout)
- Paragraph translation button with localStorage cache
- Verb forms in correct tense — now dynamic based on learning language
- Popup positioning: above/below word on desktop, fixed bottom on mobile
- Save word/phrase as a card button

### Stage 2 — Account & Upload
- Supabase Auth: register, login, password recovery
- Header with language switcher + Header/Footer
- `/account` page: my books (grid) + my cards (expandable)
- `/auth` page: login + register + forgot password
- Cards saved to Supabase `cards` table
- Static pages: `/pricing`, `/about`, `/contacts`, `/feedback`

### Stage 3 — Retelling
- `books` table in Supabase
- File upload on main page (.txt; epub coming soon)
- `/api/retell` route — chunk-based retelling via Claude Haiku
  - Text split by single newlines `/\n+/` (not `/\n\n+/` — some books lack double breaks)
  - Each chunk processed sequentially
  - Progress saved to `books.progress` after each chunk
  - Post-processing: `enforceMaxSentencesPerParagraph()` — hard limit of 5 sentences/paragraph via JS regex (not just prompt instruction) — this reliably prevents giant unbroken paragraphs regardless of what Claude returns
  - Results cleaned (removes #, ##, *, **)
- Retelling prompt in `lib/prompts/retell.md` — includes 50-70% length target, "own words" instruction, chronological order preservation, explicit paragraph-break rule
- Deduplication by normalized text hash (strips whitespace, punctuation, quotes, lowercases)
- Shared `Reader.tsx` component (used in `/reader/[id]` and `/account/reader/[id]`)
- Pagination with smart page numbers (shows first/last + 2 around current)
- Book deletion
- Progress bar on `/account` during processing (polling every 10s)

### Stage 4 — Protection & Monetization ✅
- `profiles` table: `id`, `plan`, `chars_used`, `period_start`, `native_language`, `learning_language`, `email`, `stripe_subscription_id`
- RLS policy on `profiles`: users manage their own profile
- Auto-trigger: creates profile on user registration (`handle_new_user` function, includes email now)
- Pro paywall on upload: `NEXT_PUBLIC_PRO_REQUIRED` env variable
- 100 card limit for free users
- Monthly character limit: 2,000,000 chars/month for Pro, resets after 30 days
- Hard per-file cap: no single upload may exceed 2,000,000 characters, regardless of remaining quota
- "Grace pass": if a file first pushes a user over their monthly quota (and they hadn't already exceeded it), the upload is still processed for free, once per period — see DOCS.md Section 16 for the cost reasoning behind these numbers
- Stripe integration: checkout + webhook, production webhook on Vercel
- Pricing page `/pricing` with Free / Pro / Donate
- Admin identification via `NEXT_PUBLIC_ADMIN_EMAIL`
- Admin book upload interface at `/admin` with cover image upload
- Public library from Supabase (`is_public` + `status=done`)
- `created_at` bug fixed

### Subscription management — Upgrade/Cancel Pro ✅
- `stripe_subscription_id` column added to `profiles`
- `app/api/stripe/checkout/route.ts` — added `subscription_data: { metadata: { userId } }` so the *subscription* itself (not just the checkout session) carries `userId`; required for subscription-level webhook events (e.g. cancellations initiated directly in Stripe) to identify the user
- `app/api/stripe/webhook/route.ts`:
  - `checkout.session.completed` (mode=subscription) saves `stripe_subscription_id` on the profile, alongside setting `plan='pro'`, and clears `subscription_cancel_at`
  - `customer.subscription.updated` — new handler, the authoritative source for whether a subscription is scheduled to cancel and when; syncs `subscription_cancel_at` any time this changes (whether triggered by our own cancel route or directly in the Stripe dashboard)
  - `customer.subscription.deleted` — fires when a subscription actually ends (immediately, or because a scheduled end-of-period cancellation has now passed); this is the single place `profiles.plan` actually gets downgraded to `'free'`, alongside clearing `stripe_subscription_id` and `subscription_cancel_at`
- **Cancellation model: end-of-period, not immediate.** `app/api/stripe/cancel/route.ts` calls `stripe.subscriptions.update(id, { cancel_at_period_end: true })` rather than `stripe.subscriptions.cancel()` — matches standard SaaS practice (Readlang and most others work this way too): the person keeps Pro access for whatever they already paid for, and the subscription simply doesn't renew. `profiles.plan` is deliberately *not* touched by this route — only the `customer.subscription.deleted` webhook handler downgrades it, once the period actually ends.
- New `profiles.subscription_cancel_at` column (timestamptz, nullable) — holds the date Pro access will end, if a cancellation is scheduled; `null` otherwise. Set both optimistically by the cancel route (for instant UI feedback) and authoritatively by the `customer.subscription.updated` webhook handler (covers all paths, including direct-in-Stripe cancellation).
- `app/account/page.tsx` — three states next to the email box: Free → "Upgrade to read your texts" button; Pro, not cancelling → "Cancel Pro account" link; Pro, cancellation scheduled → "Pro (cancels on [date])" text plus a **"Resume subscription"** link
- New route `app/api/stripe/resume/route.ts` — un-schedules a pending cancellation via `stripe.subscriptions.update(id, { cancel_at_period_end: false })`; the existing `customer.subscription.updated` webhook handler already clears `subscription_cancel_at` correctly once this flips (no webhook changes needed), the route also clears it directly for instant UI feedback
- **Stripe API gotcha:** as of the "Basil" API version (2025-03-31) and all versions since (the account here is on `2026-06-24.dahlia`), `current_period_end`/`current_period_start` no longer exist on the top-level `Subscription` object — they moved to `subscription.items.data[0].current_period_end`. Reading the old top-level field silently returns `undefined`, and passing that into `new Date(undefined * 1000).toISOString()` throws at runtime (surfaced as a 500 from `/api/stripe/cancel`). Both `cancel/route.ts` and the `customer.subscription.updated` webhook handler read `items.data?.[0]?.current_period_end` first, falling back to the old top-level field defensively.
- **Local dev convenience:** added `concurrently` as a dev dependency and a new `npm run dev:full` script (`concurrently "npm run dev" "stripe.exe listen --forward-to localhost:3000/api/stripe/webhook"`) — runs Next.js and the Stripe CLI listener together in one terminal, so it's no longer possible to forget to start `stripe listen` before testing a Stripe flow locally (a mistake that repeatedly caused "payment succeeded in Stripe but profile never updated" confusion during development). Use `npm run dev:full` instead of `npm run dev` when testing anything Stripe-related.
- Tested end-to-end locally with Stripe CLI (`stripe listen`), including test card `4242 4242 4242 4242`: upgrade, in-app cancel (now end-of-period), and direct-in-Stripe cancel all correctly sync `profiles.plan` and `subscription_cancel_at`

### Pricing update: $6.99/month + yearly option ✅
- Pro price raised from $4.99 to **$6.99/month**, based on real infrastructure cost pressure identified while tallying fixed costs (Supabase $25/mo, Railway $5/mo, Vercel Pro $20/mo — see note below, domain + email ≈ $3.73/mo combined) against current-competitor pricing (checked directly against Readlang's own site: their base Premium is $6/mo, Premium Plus $15/mo; Eppika sits at $6.99/mo) — $6.99 lines up with Eppika and stays well under LingQ (~$10+) and Readlang's higher tier
- **New yearly option: $69.99/year** ("2 months free" — ~17% off the $83.88/year monthly-equivalent), chosen over steeper discounts specifically because a too-generous annual discount would undo the margin reasoning behind the price increase in the first place
- **Stripe prices are immutable once used in a transaction** — the existing $4.99 price couldn't be edited, so two brand-new prices were created instead (`$6.99/mo` and `$69.99/yr`), both in USD (previous price had been created in EUR despite the site displaying "$" — cleaned up as part of this change, all new prices are USD to match the displayed currency)
- Replaced the single `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` env var with two: `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID` and `NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID`. `checkout/route.ts`'s subscription-vs-one-time-payment mode detection now checks against either — this is safety-critical logic (getting the price ID out of sync with this check would silently misroute a subscription into one-time-payment mode), so both the env var rename and this check were updated together and verified before considering the change complete
- `app/pricing/page.tsx` gained a Monthly/Yearly toggle, deliberately scoped *inside* the Pro plan card (positioned above its price) rather than spanning the whole page above all three plans — keeps it visually attached to the plan it actually affects at every screen width, including when the grid collapses to a single column on mobile
- `app/account/page.tsx`'s "Upgrade to read your texts" button intentionally always checks out at the monthly price with no plan/billing picker — kept as a single low-friction click for an already-logged-in, high-intent user, as opposed to `/pricing` (linked from the homepage CTA and Terms of Service) which is where undecided visitors compare both billing options. Consciously decided not to add a secondary "see yearly pricing" link here either, to keep this specific flow as fast as possible.
- **Note on Vercel:** confirmed the Hobby (free) tier's terms explicitly prohibit commercial use, defined to include any method of processing payment from site visitors — since Stripe is live, the project needs the Pro plan ($20/month) to be compliant, not just to unlock features. Flagged as a real to-do, not yet confirmed as switched over.

### Reading progress sync ✅
- New Supabase table `reading_progress`: composite primary key `(user_id, book_id)`, columns `page`, `updated_at`; RLS policy restricts each user to their own rows
- Applies to both `app/reader/[id]/page.tsx` (public books) and `app/account/reader/[id]/page.tsx` (user books)
- Logged-out users on public books: `localStorage` only, no sync (no `user_id` to attach progress to)
- Logged-in users: `localStorage` acts as a fast local cache (instant page restore on load, works offline); Supabase is the cross-device source of truth
- On book load: read `localStorage` first for instant display, then fetch from `reading_progress` in the background — if a saved page exists there, it overrides the local value and updates `localStorage` (handles reading the same book from a different device/browser)
- On page change: write to `localStorage` immediately, and `upsert` to `reading_progress` in the background (`onConflict: 'user_id,book_id'`) — not awaited, so page navigation isn't blocked by the network call
- No one-time migration of pre-existing `localStorage` progress into Supabase — sync simply starts fresh from the first page change after deploy
- Tested manually: progress carries over correctly when switching browsers / closing and reopening a book while logged in

### Processing server migration (Railway) ✅
- `/api/retell` and `/api/format` moved off Vercel entirely, to a standalone Node/Express server in a separate repo (`balaka-processing`, hosted on Railway, Hobby plan $5/mo) — removes Vercel's serverless execution time limit for large books (see DOCS.md Section 14 for the original problem, Section 16a for full technical detail)
- Authentication changed from a client-supplied `userId` in the request body to real verification of the user's Supabase session token (`Authorization: Bearer <token>`, checked server-side via `supabase.auth.getUser()`) — closes a previously-known trust gap
- New shared frontend helper `lib/processing.ts` (`callProcessingApi`) used by `admin/page.tsx`, `page.tsx`, and `account/page.tsx` instead of calling `fetch('/api/retell'|'/api/format', ...)` directly
- Fixed a real production issue: Railway's public-networking proxy has a 60-second idle keep-alive timeout, which was cutting off the original design (browser waits for one big response at the very end of processing). Both endpoints now respond immediately once the job is validated and marked "processing," then do the actual chunk-by-chunk Claude work as a background task — progress is still tracked via `books.progress` and picked up by the existing polling on `/account`, unchanged
- Added an in-memory `jobsInProgress` guard on the server to reject a second concurrent request for the same book (`409`), preventing duplicate jobs from racing on the same book's progress field
- Removed the automatic background `/api/format` call that used to fire immediately on every regular-user upload — uploads now just insert the book as `pending`; the actual processing (format or retell) only starts once the user explicitly picks "Read original" or "Create retelling" on `/account`. Saves API cost on uploads nobody follows through on, and eliminates a race where auto-format and a manually-requested retelling could collide on the same book
- `handleReadOriginal` on `/account` now actually calls `/api/format` (previously it skipped formatting entirely and just marked the book done with the raw, unformatted text) — the existing generic progress bar (tied to `status === 'processing'`, not to book type) picks this up automatically, no separate UI work needed
- Old `/api/retell` and `/api/format` routes are still present in the Vercel codebase but unused — kept temporarily as a rollback safety net, not called from anywhere in the frontend anymore

### Character limit refinement ✅
- Monthly Pro quota raised from 1,000,000 to 2,000,000 characters
- New hard per-file cap: no single upload may exceed 2,000,000 characters, checked before any quota logic, regardless of plan or remaining quota
- New "grace pass": the first upload in a period that pushes a user over their monthly quota is still processed for free (message: "You have reached your monthly limit of 2,000,000 characters. Anyway, we will finish this task for you for free.") — any further attempt once already over quota is hard-blocked as before
- Numbers chosen based on actual Claude Haiku 4.5 API pricing worked out from a worst-case single-file cost estimate — see DOCS.md Section 16 for the full math and the caveat that this doesn't by itself confirm overall Pro-tier profitability (translation-lookup volume during reading is the bigger unknown)

### Concurrency hardening ✅
Triggered by the question "what happens when 10-100 people upload/process books at the same time," ahead of opening the product up for real. Three steps, implemented in this order:

1. **Retry-with-backoff for Anthropic `429`/`529`s.** `callClaude()` in `server.js` now retries a rate-limited or overloaded response up to 4 times, using the `retry-after` header when Anthropic provides one, otherwise exponential backoff (1s, 2s, 4s, 8s). Previously a single rate-limited chunk would immediately fail the whole book to `status: 'error'`, even though a 429 is usually transient.
2. **Orphaned-job cleanup on server startup.** `jobsInProgress` and all in-flight background processing lived purely in memory — a Railway restart (new deploy, crash) while books were mid-processing used to leave them stuck showing "Processing..."/"Extracting..." with a stale progress percentage forever. `cleanupOrphanedJobs()` now runs once before the server starts accepting requests: any book already in `status = 'processing'` or `'extracting'` at startup (impossible for a freshly-started process to have legitimately caused) gets flipped to `status = 'error'`, so the person sees a clear "Retry" button instead.
3. **Concurrency limit on simultaneous processing jobs.** Added `p-limit` (pinned to `^3.1.0` — later major versions are ESM-only and don't support `require()`), capping how many books can be actively going through Claude (retell/format) at once to 3 (`CONCURRENT_PROCESSING_LIMIT`); the rest queue in memory until a slot frees up. Reduces how often concurrent uploads trip Anthropic's rate limits in the first place, and makes step 1's retries more effective (fewer simultaneous retries competing for the same limit).

**Explicitly deferred:** a durable, persistent job queue (e.g. Redis + BullMQ) that would let interrupted jobs actually *resume* after a restart, instead of just failing cleanly. This is the "correct" long-term answer but is meaningfully more infrastructure (a new service, a new failure mode, added cost) for a problem the three steps above should keep rare enough at current scale. Revisit if real usage shows steps 1-3 aren't sufficient.

Also investigated during this pass: `npm audit` flags a high-severity `pdfjs-dist` vulnerability (via `officeparser`) in `balaka-processing`. Determined not to be exploitable in our server-side, text-extraction-only usage — see DOCS.md Section 16b for the full writeup (the vulnerability requires browser/DOM scripting context we don't have, and `officeparser` already hardens against the underlying mechanism). No fix currently exists via `npm audit fix` regardless (every published `officeparser` version pins the same vulnerable `pdfjs-dist` version) — left as-is, documented so it isn't re-investigated from scratch later.

### Language architecture overhaul & upload consolidation ✅ (mostly — see remaining items below)
Triggered by a real question: "if a user learns English but uploads an Italian text, what happens?" Answer before this work: nothing correct — translation language came from a *global* `localStorage` setting (`balaka_learning_language`), not from the actual language of the book being read. Also found while investigating: regular-user uploads always hardcoded `language: 'en'` on insert regardless of the file's real content.

**Completed:**

1. **`books.language` is now the single source of truth for translation.** `Reader.tsx` takes a new `bookLanguage` prop (passed from `book.language` by both `app/reader/[id]/page.tsx` and `app/account/reader/[id]/page.tsx`) instead of reading `learningLanguage` from `localStorage`. Fixed a related bug found in the same code: paragraph-translation requests never sent `learningLanguage` at all, silently defaulting to English server-side regardless of the book. The global "I learn" setting still controls which public-library books are *shown* on the homepage, but no longer drives translation once a specific book is open.
2. **Regular-user uploads get an explicit language selector** — the new upload form on `/account` (see below) includes a language dropdown, same 41-language list used everywhere else. Closes the old `language: 'en'` hardcoding bug.
3. **Upload UI consolidated onto `/account`.** New collapsible "Upload text" section (black button with an upload icon, expands inline below it — no modal, matches the flat page layout) with title, language, optional cover image, and file — added right below the email/plan box, above "My books." `admin/page.tsx` keeps its own separate form unchanged (still has its own language `<select>`, now also expanded to all 41 codes). The homepage (`app/page.tsx`) dropped its upload widget entirely — the upload logic that used to live there (quota checks, epub/PDF handling) was removed rather than duplicated a third time. Replaced with a simple "Upload your own text" button linking to `/account` (logged in) or `/auth` (logged out).
4. **Click-protection on the Upload button** — `isUploading` disables it immediately on click, before any async work starts. Concretely observed during testing: a brief window with no visible feedback while the book row was being inserted was enough to cause a real accidental double-click.
5. **epub/PDF extraction is fire-and-forget from the client**, matching the existing pattern for `/api/retell`/`/api/format`: `/api/extract` is called without awaiting its response — the form closes and the book list refreshes immediately, showing "Extracting text..." via the already-built `extracting` status + 10-second polling + "Retry extraction" error flow. Fixed the "nothing happens for several seconds" issue that led to accidental double-uploads during testing. Trade-off accepted: the grace-pass alert no longer shows inline on the upload form for epub/PDF the instant it happens.
6. **Expanded supported languages.** No official fixed "Claude supports N languages" list exists — multilingual capability is a spectrum, not a hard boundary (formally evaluated on ~14 languages via translated MMLU, works well beyond that for higher-resource languages, more variably for lower-resource ones). `Header.tsx`'s `LEARNING_LANGUAGES`/`NATIVE_LANGUAGES` were consolidated into one shared `ALL_LANGUAGES` list (41 languages) used for both dropdowns — removes the old three-way sync requirement between two Header arrays and `LANGUAGE_NAMES` in `/api/translate/route.ts` (still two-way now: `Header.tsx` and `/api/translate/route.ts`, kept manually in sync; `/api/translate` now logs a `console.warn` if a language code isn't found, so a future desync is at least visible in server logs instead of silently mistranslating). The dropdown gained a search box (auto-focused on open) and a pinned "Popular" group (`en, es, de, fr, ru, uk, zh, pt`) shown above the full searchable list. `LEARNING_LANGUAGES` no longer needs public-library books to exist for a language, now that users can upload their own text in any language directly.
7. **Fixed a real production bug found while testing this work:** `localStorage`'s `balaka_native_language`/`balaka_learning_language` values could go stale when switching between test accounts in the same browser — `Header.tsx` displayed the correct value from the logged-in user's Supabase profile, but never wrote it back to `localStorage`, so other code reading `localStorage` directly (like `Reader.tsx`) could use a different, wrong value than what the header displayed. Fixed by syncing `localStorage` from the Supabase profile every time `Header.tsx` loads it.

**Still planned, not yet implemented:**

- SQL: `cards.language` and `books.detected_language` columns (not yet created)
- Claude-based language mismatch check, warn-only — fold into the existing `/api/format`/`/api/retell` Claude calls on Railway, ask Claude to also return the detected language code alongside its main task; if it disagrees with what the person declared at upload, save to `books.detected_language` and show a plain warning on `/account` — no auto-correction
- `cards.language` populated from `book.language` whenever a word/phrase is saved — groundwork for future per-language audio pronunciation

### Legal pages ✅
- New pages `app/privacyPolicy/page.tsx` and `app/termsOfService/page.tsx`, styled to match the rest of the site (same container/typography/color tokens as `pricing`, `account`; the legal-basis table from the draft was rendered as stacked cards instead of an HTML `<table>`, since no table is used anywhere else in the site)
- Content grounded in how Balaka actually operates today: Oleksandr Zlydennyi as an individual data controller based in Spain (no registered business entity yet), Supabase hosted in the EU, Stripe/Anthropic named explicitly as sub-processors involving a US data transfer, cancellation described as end-of-period (matching the actual `cancel_at_period_end` implementation), EU 14-day withdrawal right carved out for digital content, 14-year minimum age (matches Spain's LOPDGDD digital consent age)
- Styled after Readlang's Privacy Policy / Terms of Service (also a Spain-based, EU-facing language-learning subscription service) as a structural and tone reference — confirmed directly from Readlang's own published ToS, not inferred, before being used as a basis for comparison
- Two placeholders left deliberately blank pending real values: contact email (to be created, likely via the domain registrar once `balaka.app` is connected) and NIF/NIE tax ID (pending autónomo registration in Spain) — both pages explain what these are and that they're temporary
- **Known gap, disclosed directly in the Privacy Policy text:** there is no self-service "delete my account" button yet — deletion is currently a manual, by-request process (email us). This is flagged as a real product gap (GDPR's right to erasure expects this to be honorable, not necessarily self-service) rather than silently promising a capability that doesn't exist
- Both pages end with an explicit, visible disclaimer that this is a good-faith draft grounded in the product's real behavior, not a substitute for review by a qualified lawyer — appropriate given real payments and an international audience are involved
- Footer updated (`app/components/Footer.tsx`) to link both pages — previously they'd only have been reachable by direct URL

### Homepage → landing page ✅
Design drawn by Aleks (mockup produced with ChatGPT, delivered as a real HTML/CSS reference — `globals.css` with a full custom class system, a real product screenshot, and SVG icons), then adapted into React/Next.js matching this design system exactly rather than approximated by eye. Several rounds of comparison-against-mockup fixes followed; noting the real bugs found along the way since they're easy to reintroduce if this page is touched again without understanding why things are built the way they are.

**Structure:**
- `app/page.tsx` — full landing: sticky header, hero (with a live illustrative reader mock, not a real screenshot), language strip, "two ways to read" comparison, dark-green "how it works" steps, feature checklist, public library (real Supabase data, not mockup titles — see below), upload/content section (using a real screenshot, `public/landing/upload-result.png`), coming-soon (browser extension + PWA), audience/growth section, pricing (mirrors `/pricing`'s actual feature list, kept in sync deliberately), FAQ, final CTA
- `app/landing.css` — the real provided CSS almost verbatim (the duplicate `@import "tailwindcss"` line stripped, since the project's own root `globals.css` already has it), scoped to this one page via a plain import rather than merged into the site-wide stylesheet — avoids any class-name collision risk with the rest of the app, which uses Tailwind utilities exclusively
- Fonts: Georgia for headings (chosen deliberately — historically designed for on-screen body-text legibility, fitting for a reading app; kept distinct from Geist, which remains the right choice for the rest of the app's denser UI screens), Arial for body/nav/buttons — both system fonts, no Google Fonts load needed
- `app/components/SiteShell.tsx` — new client-component wrapper around `{children}` in the root layout; routes listed in `NO_CHROME_ROUTES` (now `["/"]`) skip the old pill-style `Header` and the site-wide `900px` container entirely, letting the landing's own full-width sticky header and full-bleed section backgrounds render correctly. Every other route (`/pricing`, `/account`, the reader, etc.) is unaffected — deliberately not reskinning the whole app, only the homepage
- `app/components/Footer.tsx` redesigned site-wide (not just the landing) — dark green + lime brand identity matching the new landing, grouped links (Product / Company / Legal), old "Share: Facebook/Twitter" block removed, full-bleed background via the standard `-50vw` break-out-of-parent-container technique

**Real bugs found and fixed during the comparison passes (useful to remember if this page changes again):**
- A translation word-card accidentally had two CSS classes combined (`word-card` + `floating-label`) with conflicting `border-radius` values (10px vs a 99px pill) — the more specific one silently won, making the card look wrong. Lesson: don't combine classes from this stylesheet casually: each is a complete, self-contained component style, not a mixin.
- The "Set the difficulty" step's comparison boxes stayed narrow despite the CSS specifying `width:78%` on them — because their flex-column parent (`.choice-visual`) had no explicit width of its own, so 78% was computed against a container that had already shrunk to fit its content (circular sizing). Fixed by giving the parent `width:100%` explicitly. The first attempted fix (just adding `flex-direction:column`) was necessary but not sufficient — this is a good example of a CSS bug where the visible symptom and the actual cause are two different rules.
- The sticky header's background didn't cover full page width — `background` was applied directly to `.site-header`, which itself has a constrained `width:min(1280px,...)`, not `100%`. Fixed by moving the sticky positioning and background onto a new full-width outer wrapper (`.sticky-header-bar`), keeping `.site-header`'s own centering for just its content.
- The footer's bottom copyright bar was a third child inside a 2-column CSS Grid (`grid-template-columns:170px 1fr`) with no explicit column span — it silently fell into the narrow first column instead of spanning the full width. Fixed with `col-span-full`.
- Library book cover titles: went through a few iterations before landing on a consistent rule — title is shown exactly once per book, always as a caption below the cover, for every book uniformly (real cover photo or placeholder alike). A large "B" watermark is used purely decoratively inside placeholder covers (no text overlay on the placeholder itself) — this was corrected after initially showing the title *inside* the placeholder for some books and *below* for others, which looked inconsistent once real cover photos and placeholders appeared in the same grid.

**Deliberate product decisions made while building this:**
- Public library section pulls **real** Supabase data (`is_public=true`, `status='done'`, filtered by the selected learning language), not the mockup's fictional titles (Gatsby, Jane Eyre, etc.) — those only ever appeared during the design-comparison phase.
- If no public books exist yet for the selected learning language, the section shows a centered "Upload your own text" prompt instead of an empty grid — turns an empty state into an actionable invitation rather than a dead end.
- Book covers are clickable (link straight to `/reader/[id]`), matching the real app's existing library behavior; no separate "Explore the library" link or "Read" button, since the covers themselves are already the click target.
- "Coming soon" Browser extension (Chrome/Firefox) and "Install the PWA" are real `<a>` elements (not inert text), currently pointing to `#` since those features don't exist yet — will need real destinations once built.
- Language picker in the header was tried and then removed. It was never part of the original mockup, added on request; it caused three separate rounds of mobile header breakage (see below) because the rest of the header's CSS — fixed heights, no wrap — was designed around a simpler header with no room for a two-pill language switcher. Removed entirely rather than keep patching around it: `LandingLanguageDropdown`, the 41-language list, `handleLanguageChange`, and the related CSS were all deleted. `learningLanguage`/`nativeLanguage` state is still read on this page (needed for the library filter below) — there's just no UI on the landing itself to change them anymore. Changing "I learn" from `/account` (using the old `Header.tsx`, untouched) still affects what the landing's library section shows on a later visit, since it reads the same profile/localStorage values.
- Sticky header chosen over a separate "back to top" button — simpler to implement (one CSS property) and more useful on a long page with anchor navigation, since it keeps navigation reachable throughout, not just a way back to the top.

**Mobile bugs found while testing on real devices and Chrome DevTools (useful if the header or `.mode-comparison` section changes again):**
- Language pills used an inline `style={{ display: "flex" }}` on the wrapper div — inline styles always beat stylesheet rules, *including media queries*, so the `@media(max-width:980px){.lang-pills{display:none}}` rule could never fire no matter the screen width. General lesson: don't mix inline `display` with a class-based responsive override for the same property — the media query will silently never apply.
- After moving `display:flex` into the stylesheet so the mobile media query could work, hiding the pills entirely turned out to be the wrong fix anyway — it removed the *only* way to change language on that page for mobile visitors. (Ultimately moot: the language picker was removed altogether, see above.)
- `.site-header` had a fixed `height` (`82px` at desktop, `70px` under `700px`) inherited from the original single-line-header design. Once extra content (the language pills, since removed) needed to wrap onto more than one line, the fixed height clipped it instead of growing, spilling header content into the hero section below. If `.site-header`'s content ever grows again (e.g. a mobile menu), check for `height:` on it first — it needs `height:auto` or `min-height`, not a fixed pixel value.
- `.site-header` itself didn't have `flex-wrap:wrap`, so when its children didn't fit one row, the browser tried to vertically center a suddenly-two-line-tall child (`.header-actions`) against a one-line-tall sibling (`.brand`), making the taller child's first line poke up above the brand instead of both stacking cleanly. Added `flex-wrap:wrap;row-gap:10px` to `.site-header` at both the `980px` and `700px` breakpoints as a general defensive fix — kept even after removing the language pills, since it also protects the (still two-line-capable) auth button pair on very narrow screens.
- The `-50vw` full-bleed trick used for the footer produces a horizontal scrollbar on desktop Chrome, because `100vw` includes the browser's scrollbar width while the actual visible viewport doesn't — a well-known quirk of that specific technique. Fixed pragmatically with `overflow-x:hidden` on `<body>` in `app/layout.tsx`, since the page has no legitimate horizontal content that would need to scroll.

### "One text. Two ways to read." section — updated to match a revised mockup ✅
Sample text changed to a real book already in the library (Alice in Wonderland — original and retelling, both already live), with new copy (`Read the text as it was written` / `Follow the same story more easily`), new tag labels (`The author's words` / `Clearer language`), and a new `.mode-footer` block per card (a caption + a real "Read the original" / "Read the retelling" button, added as new CSS since the original mockup didn't have this element). Buttons link directly to the two real book IDs (`c12739df-...` original, `5edfe290-...` retelling) via `/reader/[id]` — not `/auth` or a decorative placeholder, since both versions of that book already exist.

The `.or-badge` circle's positioning had to be reworked for this: it was originally `position:absolute` at a fixed `top:%` computed against the whole comparison block's height, which broke as soon as the cards grew taller with the new footer content added. Replaced with `position:static` plus CSS `order`, letting it sit in normal document flow exactly at the boundary between the two cards (with a small negative margin to visually overlap the seam) — this stays correct regardless of how tall the cards end up being, unlike the percentage-based version.

### My vocabulary ✅
Full rebuild of the old "My cards" list into a dedicated `/account/vocabulary` page with collections, bulk actions, and manual card creation — built from a design spec + HTML/CSS mockup (from the same visual language as the landing page: `#173f35` green, `#e7eccf`/lime accents, Georgia headings), adapted the same way as the landing (concrete CSS values instead of the mockup's own foreign design-token system, which isn't present in this app).

**Restructured `/account` into three tabs.** Originally a single long page (email/plan, upload form, book grid, cards list) that kept growing with every new feature — split into `Books` (`/account`), `Vocabulary` (`/account/vocabulary`), and `Profile` (`/account/profile`), navigated via a small shared `AccountTabs.tsx` component (active tab highlighted by `usePathname`). The email/subscription block moved entirely to the new Profile page rather than staying "always visible above tabs" as first proposed — Aleks's call, and the better one: it avoids duplicating the profile fetch/Upgrade/Cancel/Resume logic across pages, and gives three clean, equally-weighted destinations instead of two tabs plus a persistent settings block. `success_url` in `checkout/route.ts` updated to `/account/profile?success=true` to match.

**Data model:**
- `cards` gained `book_id` (FK to `books`, `on delete set null`), `book_title` (a point-in-time snapshot, so the source caption survives even if the book itself is later deleted), and `language`
- New `collections` table (`id`, `user_id`, `name`, unique per user) and `card_collections` join table (`card_id`, `collection_id`) — many-to-many, since one card can belong to several collections. "All saved" and "No collection" are computed views, not real rows.
- `Reader.tsx` takes a new required `bookId` prop; `handleSaveCard` now writes `book_id`/`book_title`/`language` alongside the existing fields. Both reader pages (`/reader/[id]`, `/account/reader/[id]`) pass `bookId={book.id}`.

**Scope deliberately narrowed from the original spec, agreed upfront:**
- No source-level "chapter" tracking — the app has no chapter concept (only page-of-10-paragraphs), so the source caption is just the book title, not `Book · Chapter N`.
- No pronunciation/audio button — depends on the not-yet-built TTS feature; stays on the roadmap, not part of this pass.
- "Undo" after delete implemented as a **client-side delayed commit** (cards disappear from view immediately, actual `DELETE` only fires after a 5-second window with no "Undo" click), not a database-level soft-delete (`deleted_at` column) — avoids new schema/infrastructure for a UX-only feature.
- Delete confirmation uses the existing app-wide `window.confirm()` convention (native OK/Cancel buttons) rather than a custom-labeled dialog, for consistency with how confirmations already work elsewhere (e.g. cancel subscription) — not a pixel-perfect match to the spec's custom "Cancel/Delete" button labels.

**Built in five stages (3.1 → 3.5), each confirmed working before the next:**
1. Route, card loading, collapsed/expanded list — no sidebar, no selection, no dialog yet. Expand arrow only shown when a card actually has example data (phrase-type cards saved via the reader currently have none — a real, pre-existing data gap, not a bug introduced here).
2. Collections sidebar (desktop) + `<select>` fallback (mobile, `≤740px`) with per-collection counts, "New collection" creation with duplicate-name handling (relies on the `unique(user_id, name)` DB constraint). Initially placed the creation UI at the bottom of the sidebar; moved to a full-width row directly under the header per feedback, matching the mockup's actual header-level placement — clicking a collection with cards that haven't been explicitly assigned yet (which, before step 3, is *all* of them) correctly shows 0/empty, not a bug.
3. Type filter (All types/Words/Phrases, shown only inside "All saved"), card selection (checkbox visually secondary, doesn't trigger expand; chevron doesn't trigger selection), selection count, Actions menu (disabled until something is selected; closes on outside click or `Esc`) with Move to collection (clears all existing memberships first, then assigns the target — matches spec's "from All saved/No collection, just assigns"), Add to another collection (additive, uses `upsert` with `ignoreDuplicates` to avoid unique-constraint errors), and Delete selected with the delayed-commit Undo described above.
4. "Add word or phrase" dialog — Type/Collection/Word/Translation/Example fields, collection pre-selected when opened from within a real collection, "Create new collection" as its own inline row under the dropdown rather than an in-list option (plain `<select>` handles a special "create new" entry poorly, especially for keyboard/screen-reader use). Duplicate detection on blur (case-insensitive exact match on `word`) shows a non-blocking warning with a "View existing card" link that switches to "All saved" and scrolls the matching card into view (`id="card-{id}"` added to each card for this). Manually-added cards have no transcription and at most a single unband-translated example sentence — expanded view only renders a translation line when one actually exists, rather than showing a blank line.
5. Pagination (20/page, same ellipsis pattern already used for the reader's own pagination, page-change scrolls to the list's own top rather than the site's top, selection clears, current collection/filter persist, clamps to the last valid page if filtering/deleting shrank the list below the current page number), empty states matched to the spec's exact copy with actionable buttons ("Add word or phrase" / "Show all types" as appropriate), and mobile polish (toolbar wraps instead of overflowing, tighter dialog padding on small screens).

### epub & PDF upload ✅
- New private Supabase Storage bucket `book-sources`, RLS-scoped so each user can only access their own uploaded files (path prefix `${userId}/...`)
- New `books.source_path` column, pointing to the raw uploaded file in that bucket
- New Railway endpoint `/api/extract`: downloads the raw file via the service-role client, extracts plain text using `officeparser` (`parseOffice()` → `ast.toText()`, auto-detects epub vs PDF from the file content itself — no format-specific server code needed), then applies the same 2,000,000-character monthly quota + grace-pass logic used for `.txt` uploads (duplicated server-side here, since the character count is only known *after* extraction — noted as minor tech debt, see DOCS.md Section 16b)
- Unlike `/api/retell` and `/api/format`, `/api/extract` runs synchronously (awaited, not fire-and-forget) — extraction is fast (no Claude calls involved) and comfortably finishes well under Railway's 60-second idle timeout
- New book status `extracting`, shown on `/account` as "Extracting text..." (no percentage — extraction isn't chunked, so a progress bar wouldn't be meaningful); picked up by the same 10-second polling used for `processing`
- New hard cap on raw file size: 20MB per upload for epub/PDF (separate from the 2,000,000-character cap on extracted text, since these files can be large due to embedded images even when the actual text is small) — file weight itself has no effect on Claude token cost, since only the extracted plain text is ever sent to the API, not the raw file
- Error retry flow distinguishes extraction failures (`book.source_path` present → "Retry extraction", re-runs `/api/extract` on the already-uploaded file) from format/retelling failures (existing "Retry formatting" / "Retry" buttons, unchanged)
- Client-side changes generalized from an epub-specific `isEpub` flag to a `needsExtraction` flag covering both epub and PDF — the upload flow, storage path, and content-type are now derived from the actual file extension rather than hardcoded
- PDF text extraction quality depends entirely on the source document — scanned pages with no text layer extract nothing (surfaces as a clear error rather than failing silently), and complex layouts (columns, footnotes) can produce rougher text than a typical epub; both formats tested end-to-end (extraction, Read original, Create retelling) and confirmed working

### UI/UX improvements ✅
- Book grid with 2:3 aspect ratio covers, colored placeholders (`book.id.charCodeAt(0) % COVER_COLORS.length`)
- Supabase Storage bucket `covers` for admin cover uploads
- Smart pagination with ellipsis
- Reading progress saved to localStorage per book
- Two-button choice for pending user books: "Read original" / "Create retelling"
- Unique meta tags for public books (dynamic, loaded from Supabase)
- Mobile touch selection support
- Clickable book covers link directly to reader

### Original text formatting ✅ (Stage 5)
- `lib/prompts/format.md` — improves readability WITHOUT changing content
- `/api/format` route — same chunking approach as retell, reformats `original_text` in place
- Same `enforceMaxSentencesPerParagraph()` applied (max 6 sentences)
- Both admin uploads and user uploads of originals go through formatting automatically
- "Retry formatting" button added for original books stuck in error status

### Language switcher ✅
- Header UI: "I learn [dropdown] I know [dropdown]" with custom pill-style dropdowns (Google Play Books style)
- `LEARNING_LANGUAGES` — only languages with books available (currently en, es, de — commented list for easy expansion)
- `NATIVE_LANGUAGES` — expanded list (ru, en, es, de, fr, it, pt, uk, ca, zh, ja, ko, ar, hi, tr, pl, nl, vi, th, id)
- Saved to `profiles` (logged in) or localStorage (logged out)
- Main page library filters books by `learning_language`
- `/api/translate` dynamically generates translations in `nativeLanguage` AND examples/verb forms in `learningLanguage` (both passed from Reader.tsx via localStorage)
- Paragraph translation cache cleared on language change to avoid stale translations
- **Important:** `LANGUAGE_NAMES` map must be kept in sync between `Header.tsx` (NATIVE_LANGUAGES/LEARNING_LANGUAGES) and `app/api/translate/route.ts` (LANGUAGE_NAMES) — adding a language to Header without adding it to translate route breaks translation for that language

---

## Monetization model

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | Read library books, save up to 100 cards |
| Pro | $6.99/mo or $69.99/yr (2 months free) | Upload texts, retelling, epub/txt/pdf, unlimited cards, 2M chars/month, export cards (coming soon) |
| Donate | Any | One-time via Stripe |

---

## File structure (key files)

```
app/
  page.tsx                        # Main page: upload + public library (filtered by learning_language)
  layout.tsx                      # Root layout: Header + Footer
  auth/page.tsx
  account/page.tsx                # My books (grid) + my cards; Upgrade/Cancel Pro buttons next to email
  account/reader/[id]/page.tsx    # User book reader (retelling_text || original_text)
  account/reader/[id]/layout.tsx
  reader/[id]/page.tsx            # Public book reader — reads retelling_text || original_text
  reader/[id]/layout.tsx          # Dynamic metadata from Supabase
  admin/page.tsx                  # Admin book upload with cover image, calls /api/format for originals
  pricing/page.tsx
  about/page.tsx
  contacts/page.tsx
  feedback/page.tsx
  api/
    translate/route.ts            # Dynamic native+learning language translation
    retell/route.ts               # Chunk-based retelling, enforceMaxSentencesPerParagraph
    format/route.ts               # Chunk-based original text formatting, same paragraph enforcement
    stripe/
      checkout/route.ts           # Stripe init inside POST; subscription_data.metadata.userId set
      webhook/route.ts            # Stripe init inside POST; saves subscription_id, handles subscription.deleted
      cancel/route.ts             # Cancels subscription via Stripe API, resets plan to free
  components/
    Reader.tsx                    # Shared reader, passes nativeLanguage + learningLanguage to translate API
    Header.tsx                    # Language switcher with LanguageDropdown component
    Footer.tsx
lib/
  supabase.ts
  prompts/
    retell.md
    format.md
SNAPSHOT.md
DOCS.md
```

---

## Database (Supabase)

### `books`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | → auth.users |
| title | text | |
| original_text | text | formatted for readability if type=original |
| retelling_text | text | |
| type | text | 'original' or 'retelling' |
| status | text | 'pending' / 'processing' / 'done' / 'error' |
| language | text | |
| text_hash | text | normalized hash for deduplication |
| is_public | boolean | |
| progress | integer | 0-100% |
| cover_url | text | |
| created_at | timestamptz | DEFAULT now() |

### `cards`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | |
| word | text | |
| translation | text | |
| transcription | text | |
| examples | jsonb | `{english, russian}` — key names kept for compatibility even though "english" now holds the learning-language example |
| type | text | 'word' or 'phrase' |
| book_id | uuid | FK → `books`, `on delete set null` — the book stays deletable without breaking the card |
| book_title | text | snapshot of the book's title at the time the card was saved; survives even if `book_id` later goes null |
| language | text | not yet used for anything (озвучка groundwork), but populated going forward |
| created_at | timestamptz | |

### `collections`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | |
| name | text | unique per `user_id` |
| created_at | timestamptz | |

"All saved" and "No collection" are computed views on `/account/vocabulary`, not rows in this table.

### `card_collections`
| Column | Type | Notes |
|--------|------|-------|
| card_id | uuid | FK → `cards`, `on delete cascade`, part of composite PK |
| collection_id | uuid | FK → `collections`, `on delete cascade`, part of composite PK |

Many-to-many — one card can belong to several collections at once.

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| plan | text | 'free' or 'pro' |
| chars_used | int8 | |
| period_start | timestamptz | |
| native_language | text | default 'ru' |
| learning_language | text | default 'en' |
| email | text | populated by trigger on signup; backfilled manually for old accounts |
| stripe_subscription_id | text | populated by webhook on subscription checkout; cleared to null only when the subscription actually ends (`customer.subscription.deleted`), not when cancellation is first requested |
| subscription_cancel_at | timestamptz | null unless a cancellation is scheduled; holds the date Pro access will end. Set by both `/api/stripe/cancel` (optimistic) and the `customer.subscription.updated` webhook (authoritative) |

### `reading_progress`
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid | → auth.users, part of composite PK |
| book_id | uuid | → books, part of composite PK |
| page | integer | default 1 |
| updated_at | timestamptz | default now() |

Primary key: `(user_id, book_id)` — enables `upsert` on page change instead of manual existence checks. RLS: users manage only their own rows.

### Views (read-only, for easier moderation in Supabase dashboard)
- `books_admin_view` — books where `user_id = admin's uuid` (WITH security_invoker=true)
- `books_user_view` — books where `user_id != admin's uuid` (WITH security_invoker=true)
- `profiles_free_view` — profiles where `plan = 'free'` (WITH security_invoker=true)
- `profiles_pro_view` — profiles where `plan = 'pro'` (WITH security_invoker=true)

**Important:** Views must be created with `WITH (security_invoker = true)` to avoid Supabase security warnings about SECURITY DEFINER bypassing RLS.

### Storage buckets
- `covers` — public bucket for book cover images

---

## Environment variables

```
ANTHROPIC_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
NEXT_PUBLIC_STRIPE_DONATE_PRICE_ID
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_PRO_REQUIRED
NEXT_PUBLIC_ADMIN_EMAIL
NEXT_PUBLIC_PROCESSING_API_URL
```

Separately, the `balaka-processing` repo on Railway has its own env vars (`ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`) — see DOCS.md Section 16a.

---

## Key decisions & patterns

- **Deduplication:** normalized text hash, shared across all users.
- **Chunking:** split by single `\n+` (not `\n\n+`) — some source texts lack double breaks entirely.
- **Paragraph length enforcement:** done in JS code (`enforceMaxSentencesPerParagraph`), NOT relying solely on prompt instructions — Claude cannot be trusted to reliably break very long single-paragraph dialogue blocks even with explicit prompt rules. Code-level enforcement is deterministic and free (no extra tokens).
- **Retelling target length:** 50-70% of original (not just "not below 70%" — needed explicit upper bound too).
- **Format vs Retell:** format.md preserves ALL content, just improves readability. retell.md simplifies language and shortens to 50-70%.
- **Stripe init:** must be inside route handler functions, not module level (Vercel build fails otherwise).
- **Stripe subscription metadata:** `userId` must be set on the *subscription* via `subscription_data.metadata` at checkout creation time, not only on the checkout session's own `metadata`. Subscription-level webhook events (like `customer.subscription.deleted`, which fires on cancellations made directly in the Stripe dashboard) only carry the subscription's own metadata — without this, those events can't be tied back to a user.
- **Stripe webhook testing:** requires `stripe listen --forward-to localhost:3000/api/stripe/webhook` running in a separate terminal during local testing — without it, Checkout still completes and redirects successfully, but no webhook event ever reaches localhost, so `profiles.plan` silently never updates. Easy to miss since the checkout flow itself appears to succeed.
- **Public reader bug (fixed):** `/reader/[id]/page.tsx` was only reading `original_text`, ignoring `retelling_text` entirely — always check both readers use `retelling_text || original_text`.
- **Translation language:** fully dynamic now — `nativeLanguage` (translation target) and `learningLanguage` (source text language, affects examples + verb forms) both read from localStorage and passed to `/api/translate`.
- **Language lists must stay in sync:** `Header.tsx` (LEARNING_LANGUAGES, NATIVE_LANGUAGES) and `app/api/translate/route.ts` (LANGUAGE_NAMES) need matching codes or translation breaks silently (falls back to Russian/English).
- **Large file uploads:** Vercel has execution time limits; formatting/retelling can time out for large books (200KB+). **Solution: upload public library books locally** (`localhost:3000/admin`) — writes to same Supabase DB, no time limit locally. Books persist in Supabase permanently even after shutting down local PC.
- **Supabase Views:** created for easier admin moderation without restructuring the `books`/`profiles` tables — must use `security_invoker=true` and avoid subqueries to `auth.users` to prevent security warnings.

---

## Known issues

- Double-click word selection captures trailing space — workaround: use click+drag
- Hydration warning in console — cosmetic
- Old `/api/retell` and `/api/format` routes still exist in the Vercel codebase but are unused (superseded by the Railway server) — safe to delete once the migration has proven stable for a while; kept for now as a rollback safety net
- `/api/stripe/cancel` still trusts `userId` from the request body rather than verifying the session server-side — unlike the new Railway processing server, this route wasn't touched during the migration and still has the same trust gap noted previously; worth revisiting if stricter auth is needed later

---

## Possible improvements (deferred)

### High priority
(none currently — see Medium/Low priority below for what's left)

### Postponed (intentionally deferred, not a priority right now)
- Full UI internationalization (interface strings currently English-only regardless of native_language) — too much code to justify right now

### Medium priority
- Card categories by source book
- Card export (Anki, CSV)
- Audio transcription in cards (TTS + Supabase Storage)
- Google Analytics
- Multilingual URLs (`/en/reader/`, `/es/reader/`)

### Low priority / Future
- Admin interface improvements
- Book catalog page with search/filters
- Lazy load for library
- PWA / mobile app
- Reading mode for visually impaired
- Audio retelling
