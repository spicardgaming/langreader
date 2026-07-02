# Balaka — Project Snapshot
_Last updated: July 2026_

## Current status
Stage 4 complete. Working on UI/UX improvements before language switcher implementation.

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
  - `false` = open to all (current production setting)
  - `true` = upload blocked for free users, inline upgrade message shown
- 100 card limit for free users: on 101st save attempt shows upgrade message
- Monthly character limit: 1,000,000 chars/month for Pro, resets after 30 days
- Stripe integration:
  - `/api/stripe/checkout` — creates Checkout session (subscription or one-time)
  - `/api/stripe/webhook` — handles `checkout.session.completed` → sets plan to `pro`; `customer.subscription.deleted` → sets plan to `free`
  - Production webhook registered on Stripe Dashboard → langreader.vercel.app
  - Pricing page `/pricing` with Free / Pro / Donate cards, buttons connected to Stripe
  - Price IDs hardcoded in `app/pricing/page.tsx` (NEXT_PUBLIC_ vars unreliable in browser onClick)
- Admin identification via `NEXT_PUBLIC_ADMIN_EMAIL` env variable
- Admin book upload interface at `/admin`
- Public library from Supabase (`is_public` column on `books`)
- `created_at` bug fixed — added `DEFAULT now()` to books table

---

## How to add a book to the public library (Admin)

1. Go to `/admin` (must be logged in as admin email)
2. Fill in:
   - **Book title** — display name
   - **Language** — select language of the text
   - **Type** — `Original` (read as-is) or `Retelling` (Claude will simplify)
3. Upload `.txt` file → click **Upload**
4. Book is saved to Supabase `books` table with `status='done'` (original) or retelling is generated
5. Go to **Supabase → Table Editor → books**
6. Find the book row → set `is_public = true`
7. Book appears on the main page at `/`

Note: only books with `is_public = true` AND `status = 'done'` are shown on the main page.

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
  layout.tsx                      # Root layout: Header + Footer
  auth/page.tsx                   # Login, register, forgot password
  account/page.tsx                # My books + my cards (expandable cards, progress polling)
  account/reader/[id]/page.tsx    # User book reader (original_text or retelling_text)
  account/reader/[id]/layout.tsx  # Dynamic metadata (uses await params)
  reader/[id]/page.tsx            # Public book reader (loads from Supabase)
  admin/page.tsx                  # Admin book upload (checks NEXT_PUBLIC_ADMIN_EMAIL)
  pricing/page.tsx                # Pricing plans (Free / Pro / Donate)
  about/page.tsx
  contacts/page.tsx
  feedback/page.tsx
  api/
    translate/route.ts            # Word/phrase/paragraph translation via Claude Haiku
    retell/route.ts               # Chunk-based retelling via Claude Haiku
    stripe/
      checkout/route.ts           # Create Stripe Checkout session
      webhook/route.ts            # Handle Stripe webhook events
  components/
    Reader.tsx                    # Shared reader component
    Header.tsx
    Footer.tsx
lib/
  supabase.ts                     # Supabase client (anon key)
  books.ts                        # Legacy hardcoded books (no longer used for main page)
  prompts/
    retell.md                     # Retelling prompt (loaded at runtime via fs.readFileSync)
SNAPSHOT.md                       # This file — project state for AI context
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
| is_public | boolean | default false — shows on main page if true + status=done |
| progress | integer | default 0 — retelling progress 0-100% |
| created_at | timestamptz | DEFAULT now() |

RLS: users manage their own books (`auth.uid() = user_id`)
Public policy: `is_public = true` books are readable by everyone (SELECT)

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

RLS: users manage their own profile (`auth.uid() = id`)
Auto-trigger: `handle_new_user()` creates profile on registration

---

## Environment variables

```
# Anthropic
ANTHROPIC_API_KEY

# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY         # server-only, bypasses RLS

# Stripe
STRIPE_SECRET_KEY                 # server-only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
NEXT_PUBLIC_STRIPE_DONATE_PRICE_ID
STRIPE_WEBHOOK_SECRET             # different for local CLI vs production Vercel

# App
NEXT_PUBLIC_APP_URL               # http://localhost:3000 or https://langreader.vercel.app
NEXT_PUBLIC_PRO_REQUIRED          # 'true' or 'false' — controls upload paywall
NEXT_PUBLIC_ADMIN_EMAIL           # admin email for /admin page access
```

---

## API routes

### POST /api/translate
Request: `{ word, context, isPhrase?, isParagraph? }`
- Single word → `{ translation, transcription, examples [{english, russian}], isVerb, verbForms }`
- isPhrase → `{ translation, explanation }`
- isParagraph → `{ paragraphTranslation }`
Model: claude-haiku-4-5-20251001

### POST /api/retell
Request: `{ bookId, userId }`
1. Fetch book from Supabase
2. Normalize text, calculate hash
3. Check for existing retelling (deduplication across all users)
4. If found → copy retelling, skip Claude call
5. If not → split into ~12,000 char chunks by paragraph boundaries
6. Process each chunk sequentially via Claude Haiku
7. Update `progress` in Supabase after each chunk
8. Join results, clean output (remove #, ##, *, **)
9. Save to Supabase with status='done'
Model: claude-haiku-4-5-20251001, max_tokens: 4096, maxDuration: 300

### POST /api/stripe/checkout
Request: `{ priceId, userId, email }`
- mode: 'subscription' if Pro price, 'payment' if Donate
- Returns: `{ url }` — Stripe Checkout URL

### POST /api/stripe/webhook
Events handled:
- `checkout.session.completed` + mode=subscription → profiles.plan = 'pro'
- `customer.subscription.deleted` → profiles.plan = 'free'

---

## Key decisions & patterns

- **Deduplication:** text normalized (whitespace, punctuation, quotes, lowercase) before hashing. Hash = btoa(first 200 chars) + total length. Shared across all users.
- **Retelling prompt:** stored in `lib/prompts/retell.md`, loaded via `fs.readFileSync` at request time.
- **Chunk processing:** text split into ~12,000 char chunks at paragraph boundaries. Progress saved after each chunk. maxDuration=300 for Vercel.
- **Paragraph cache:** translations cached in localStorage. Key = first 50 chars of paragraph.
- **Pro paywall:** single env variable `NEXT_PUBLIC_PRO_REQUIRED`. Set to `false` for soft launch.
- **Card limit:** checked server-side via count query before insert. Message shown inline in popup.
- **Stripe Price IDs:** hardcoded in `app/pricing/page.tsx` — NEXT_PUBLIC_ env vars unreliable in browser onClick handlers.
- **Webhook secret:** two separate secrets — one for local (stripe CLI), one for production (Stripe Dashboard).
- **Reader component:** single `Reader.tsx` shared between public and user book pages.
- **Word selection:** uses `\p{L}/u` Unicode regex for language-agnostic character detection.
- **Public books:** loaded from Supabase where `is_public=true` AND `status=done`. Admin sets `is_public` manually in Supabase dashboard.
- **User book reader:** reads `retelling_text || original_text` — supports both types.

---

## Known issues

- Double-click word selection captures trailing space — workaround: use click+drag
- epub upload not implemented (shows "coming soon")
- Hydration warning in console — cosmetic, caused by browser extensions

---

## Deferred (post UI/UX improvements)

- Language switcher: "I know [lang] — I learn [lang]" in header, saved to profiles
- Multilingual URLs: `/en/reader/`, `/es/reader/` etc.
- Dynamic translation language based on user's native language setting
- Book card UI redesign on main page
- epub/pdf upload support
- Card export (Anki etc.)
- Card categories by source book
- Audio transcription in cards (needs TTS service + Supabase Storage)
- Google Analytics
- Lazy load for library
- PWA / mobile app
