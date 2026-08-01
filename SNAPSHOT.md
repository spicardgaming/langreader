# Balaka — Project Snapshot
_Last updated: July 2026_

## Current status
Stage 4 complete. UI/UX improvements done. Language switcher implemented and working. Currently mid-task: adding Upgrade to Pro / Cancel Pro buttons to account page.

---

## IN PROGRESS — next steps for new chat

**Task: Add Upgrade/Cancel Pro buttons to /account**

Confirmed requirements:
1. "Upgrade to read your texts" button → opens Stripe Checkout for Pro plan directly (not just link to /pricing)
2. "Cancel Pro account" button → cancels subscription via Stripe API (`stripe.subscriptions.cancel`)
3. Buttons are conditional: "Upgrade" shown only to `plan=free` users, "Cancel Pro" shown only to `plan=pro` users

**Completed so far:**
- Added `stripe_subscription_id` column to `profiles` table (SQL executed)

**Still needed:**
1. Update `app/api/stripe/webhook/route.ts` — save `subscription.id` to `profiles.stripe_subscription_id` when `checkout.session.completed` fires with `mode=subscription`
2. Create new API route `app/api/stripe/cancel/route.ts` — calls `stripe.subscriptions.cancel(subscriptionId)`, then updates `profiles.plan = 'free'`
3. Update `app/account/page.tsx` UI — add conditional buttons based on `profile.plan`:
   - Free: "Upgrade to read your texts" → calls checkout with Pro price ID (same flow as pricing page)
   - Pro: "Cancel Pro account" → calls new cancel API route, with confirm dialog
4. Mockup reference: buttons appear next to the Email display box on `/account`, black button for upgrade, underlined text link for cancel

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
- Monthly character limit: 1,000,000 chars/month for Pro, resets after 30 days
- Stripe integration: checkout + webhook, production webhook on Vercel
- Pricing page `/pricing` with Free / Pro / Donate
- Admin identification via `NEXT_PUBLIC_ADMIN_EMAIL`
- Admin book upload interface at `/admin` with cover image upload
- Public library from Supabase (`is_public` + `status=done`)
- `created_at` bug fixed

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
| Pro | $4.99/mo | Upload texts, retelling, epub/txt/pdf, export cards, unlimited cards, 1M chars/month |
| Donate | Any | One-time via Stripe |

---

## File structure (key files)

```
app/
  page.tsx                        # Main page: upload + public library (filtered by learning_language)
  layout.tsx                      # Root layout: Header + Footer
  auth/page.tsx
  account/page.tsx                # My books (grid) + my cards; NEEDS: upgrade/cancel pro buttons
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
      checkout/route.ts           # Stripe init inside POST (not module level!)
      webhook/route.ts            # Stripe init inside POST; NEEDS: save subscription_id
      cancel/route.ts             # NOT YET CREATED — needed for cancel flow
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
| created_at | timestamptz | |

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
| stripe_subscription_id | text | NEW — added for cancel flow, not yet populated by webhook |

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
```

---

## Key decisions & patterns

- **Deduplication:** normalized text hash, shared across all users.
- **Chunking:** split by single `\n+` (not `\n\n+`) — some source texts lack double breaks entirely.
- **Paragraph length enforcement:** done in JS code (`enforceMaxSentencesPerParagraph`), NOT relying solely on prompt instructions — Claude cannot be trusted to reliably break very long single-paragraph dialogue blocks even with explicit prompt rules. Code-level enforcement is deterministic and free (no extra tokens).
- **Retelling target length:** 50-70% of original (not just "not below 70%" — needed explicit upper bound too).
- **Format vs Retell:** format.md preserves ALL content, just improves readability. retell.md simplifies language and shortens to 50-70%.
- **Stripe init:** must be inside route handler functions, not module level (Vercel build fails otherwise).
- **Public reader bug (fixed):** `/reader/[id]/page.tsx` was only reading `original_text`, ignoring `retelling_text` entirely — always check both readers use `retelling_text || original_text`.
- **Translation language:** fully dynamic now — `nativeLanguage` (translation target) and `learningLanguage` (source text language, affects examples + verb forms) both read from localStorage and passed to `/api/translate`.
- **Language lists must stay in sync:** `Header.tsx` (LEARNING_LANGUAGES, NATIVE_LANGUAGES) and `app/api/translate/route.ts` (LANGUAGE_NAMES) need matching codes or translation breaks silently (falls back to Russian/English).
- **Large file uploads:** Vercel has execution time limits; formatting/retelling can time out for large books (200KB+). **Solution: upload public library books locally** (`localhost:3000/admin`) — writes to same Supabase DB, no time limit locally. Books persist in Supabase permanently even after shutting down local PC.
- **Supabase Views:** created for easier admin moderation without restructuring the `books`/`profiles` tables — must use `security_invoker=true` and avoid subqueries to `auth.users` to prevent security warnings.

---

## Known issues

- Double-click word selection captures trailing space — workaround: use click+drag
- epub upload not implemented
- Hydration warning in console — cosmetic

---

## Possible improvements (deferred)

### High priority
- Reading progress sync to Supabase (currently localStorage only, device-specific)
- Full UI internationalization (interface strings currently English-only regardless of native_language)
- epub/pdf upload support
- Migrate heavy processing (retell/format) to Railway/Render when scaling — Vercel time limits won't hold at scale

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

