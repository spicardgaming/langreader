# Balaka — Project Snapshot
_Last updated: July 2026_

## Current status
Stage 4 complete. UI/UX improvements done. Working on language switcher implementation next.

---

## Completed stages

### Stage 0 — Setup
- Next.js (App Router), Tailwind CSS, Supabase, Vercel, GitHub
- VSCode + Cline, Anthropic API key

### Stage 1 — Reader
- Word selection → translation, transcription, IPA, 2 examples
- Phrase selection → translation + explanation
- Auto-expand partial word selection to full word
- Unicode-compatible word boundary detection (`\p{L}/u`) — supports accented chars (é, ó, ñ, ü etc.)
- Touch support for mobile word selection (`onTouchEnd` + 100ms setTimeout)
- Paragraph translation button with localStorage cache
- Verb forms in correct tense
- Popup positioning: above/below word on desktop, fixed bottom on mobile
- Save word/phrase as a card button

### Stage 2 — Account & Upload
- Supabase Auth: register, login, password recovery
- Header (logo, My account, Sign in/out) and Footer (Share, About us, Contacts, Feedback, Pricing)
- `/account` page: my books + my cards sections
- `/auth` page: login + register + forgot password
- Cards saved to Supabase `cards` table
- Expandable word cards on `/account` (collapsed: word + translation; expanded: + transcription + examples)
- Static pages: `/pricing`, `/about`, `/contacts`, `/feedback`

### Stage 3 — Retelling
- `books` table in Supabase
- File upload on main page (.txt; epub coming soon)
- `/api/retell` route — chunk-based retelling via Claude Haiku
  - Text split into ~12,000 char chunks by paragraph boundaries
  - Each chunk processed sequentially
  - Progress saved to `books.progress` after each chunk
  - Results joined and cleaned (removes #, ##, *, **)
- Retelling prompt in `lib/prompts/retell.md` (loaded via fs.readFileSync)
- Deduplication by normalized text hash (strips whitespace, punctuation, quotes, lowercases)
- Shared `Reader.tsx` component (used in `/reader/[id]` and `/account/reader/[id]`)
- Pagination with smart page numbers (shows first/last + 2 around current)
- Book deletion
- Progress bar on `/account` during processing (polling every 10s)
- Message "Large texts take time. Keep this tab open!" during processing

### Stage 4 — Protection & Monetization ✅
- `profiles` table in Supabase (`id`, `plan`, `chars_used`, `period_start`)
- RLS policy on `profiles`: users manage their own profile
- Auto-trigger: creates profile on user registration (`handle_new_user` function)
- Pro paywall on upload: controlled via `NEXT_PUBLIC_PRO_REQUIRED` env variable
- 100 card limit for free users
- Monthly character limit: 1,000,000 chars/month for Pro, resets after 30 days
- Stripe integration: checkout + webhook, production webhook on Vercel
- Pricing page `/pricing` with Free / Pro / Donate
- Admin identification via `NEXT_PUBLIC_ADMIN_EMAIL`
- Admin book upload interface at `/admin` with cover image upload
- Public library from Supabase (`is_public` + `status=done`)
- `created_at` bug fixed — added `DEFAULT now()` to books table

### UI/UX improvements ✅
- Book grid with 2:3 aspect ratio covers on main page and `/account`
- Colored placeholders using `book.id.charCodeAt(0) % COVER_COLORS.length`
- Supabase Storage bucket `covers` for admin-uploaded cover images
- Smart pagination with ellipsis
- Reading progress saved to localStorage per book (`reading_progress_${bookId}`)
- Two-button choice for pending user books: "Read original" / "Create retelling"
- Unique meta tags for public books: `Read [title] in [language] Online with Translation — Balaka`
- Mobile touch selection support

---

## Next: Language switcher
Plan:
- Add `native_language` and `learning_language` columns to `profiles`
- Store in localStorage for non-logged-in users
- Switcher UI in header: "I know [lang] — I learn [lang]"
- Filter public library by `learning_language`
- Dynamic translation language based on `native_language` in `/api/translate`

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
  page.tsx                        # Main page: upload + public library from Supabase
  layout.tsx                      # Root layout: Header + Footer + global metadata
  auth/page.tsx                   # Login, register, forgot password
  account/page.tsx                # My books (grid with colors) + my cards (expandable)
  account/reader/[id]/page.tsx    # User book reader (original_text or retelling_text)
  account/reader/[id]/layout.tsx  # Dynamic metadata (uses await params)
  reader/[id]/page.tsx            # Public book reader (loads from Supabase)
  reader/[id]/layout.tsx          # Dynamic metadata from Supabase
  admin/page.tsx                  # Admin book upload with cover image
  pricing/page.tsx                # Pricing plans (Free / Pro / Donate)
  about/page.tsx
  contacts/page.tsx
  feedback/page.tsx
  api/
    translate/route.ts            # Word/phrase/paragraph translation via Claude Haiku
    retell/route.ts               # Chunk-based retelling via Claude Haiku
    stripe/
      checkout/route.ts           # Create Stripe Checkout session (Stripe init inside POST)
      webhook/route.ts            # Handle Stripe webhook events (Stripe init inside POST)
  components/
    Reader.tsx                    # Shared reader component
    Header.tsx
    Footer.tsx
lib/
  supabase.ts                     # Supabase client (anon key)
  prompts/
    retell.md                     # Retelling prompt (loaded at runtime via fs.readFileSync)
SNAPSHOT.md                       # Project state for AI context
DOCS.md                           # Operations guide
```

---

## Database (Supabase)

### `books`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | → auth.users |
| title | text | |
| original_text | text | |
| retelling_text | text | |
| type | text | 'original' or 'retelling' |
| status | text | 'pending' / 'processing' / 'done' / 'error' |
| language | text | default 'en' |
| text_hash | text | normalized hash for deduplication |
| is_public | boolean | default false — shown on main page if true + status=done |
| progress | integer | default 0 — retelling progress 0-100% |
| cover_url | text | URL to cover image in Supabase Storage |
| created_at | timestamptz | DEFAULT now() |

### `cards`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | → auth.users |
| word | text | word or phrase |
| translation | text | |
| transcription | text | IPA, empty for phrases |
| examples | jsonb | array of `{english, russian}` |
| type | text | 'word' or 'phrase' |
| created_at | timestamptz | |

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | = auth.users.id |
| plan | text | 'free' or 'pro', default 'free' |
| chars_used | int8 | monthly character usage, default 0 |
| period_start | timestamptz | billing period start, default now() |

### Storage buckets
- `covers` — public bucket for book cover images (admin only uploads)

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
NEXT_PUBLIC_PRO_REQUIRED          # 'true' or 'false'
NEXT_PUBLIC_ADMIN_EMAIL
```

---

## Key decisions & patterns

- **Deduplication:** normalized text hash. Shared across all users.
- **Retelling prompt:** `lib/prompts/retell.md`, loaded via `fs.readFileSync`.
- **Chunk processing:** ~12,000 char chunks, sequential, maxDuration=300.
- **Pro paywall:** `NEXT_PUBLIC_PRO_REQUIRED` env var. Set to `false` for soft launch.
- **Card limit:** checked server-side via count query before insert.
- **Stripe init:** must be inside route handler functions, not module level (Vercel build fails otherwise).
- **Stripe Price IDs:** hardcoded in `app/pricing/page.tsx` — NEXT_PUBLIC_ vars unreliable in browser onClick.
- **Webhook secret:** two separate secrets — local CLI vs production Stripe Dashboard.
- **Public books:** `is_public=true` AND `status=done`. Admin sets `is_public` manually in Supabase.
- **User book reader:** reads `retelling_text || original_text`.
- **Word selection:** `\p{L}/u` Unicode regex — works for all languages.
- **Reading progress:** saved to localStorage as `reading_progress_${bookId}`.
- **Cover colors:** `book.id.charCodeAt(0) % COVER_COLORS.length` — consistent per book.

---

## Known issues

- Double-click word selection captures trailing space — workaround: use click+drag
- epub upload not implemented (shows "coming soon")
- Hydration warning in console — cosmetic, caused by browser extensions
- Translation language hardcoded as Russian in `/api/translate` — will be dynamic after language switcher

---

## Possible improvements (deferred)

### High priority
- **Reading progress sync to Supabase** — currently localStorage only (device-specific). Add `reading_progress` table with `user_id`, `book_id`, `page` for cross-device sync.
- **Dynamic translation language** — currently hardcoded Russian. After language switcher: use `native_language` from user profile.
- **epub/pdf upload support** — currently shows "coming soon"

### Medium priority
- **Card categories by source book** — tag cards with book they came from
- **Card export** (Anki, CSV etc.)
- **Audio transcription in cards** — needs TTS service (Google TTS or ElevenLabs) + Supabase Storage
- **Google Analytics** — add tracking
- **Multilingual URLs** — `/en/reader/`, `/es/reader/` etc.

### Low priority / Future
- **Admin interface improvements** — bulk book management, edit existing books
- **Book catalog page** — `/[lang]/reader/` with search and filters
- **Lazy load for library** — 60 books then "load more"
- **PWA / mobile app**
- **Integration with readly.co**
- **Reading mode for visually impaired**
- **Audio retelling**

