# Balaka — Project Snapshot
_Last updated: June 2026_

## Current status
Stage 4 in progress (Protection & Monetization). Stages 0–3 complete. Stripe integration done.

---

## Completed stages

### Stage 0 — Setup
- Next.js (App Router), Tailwind CSS, Supabase, Vercel, GitHub
- VSCode + Cline, Anthropic API key

### Stage 1 — Reader
- Word selection → translation, transcription, IPA, 2 examples
- Phrase selection → translation + explanation
- Auto-expand partial word selection to full word
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
- `/api/retell` route — retelling via Claude Haiku
- Retelling prompt in `lib/prompts/retell.md` (loaded via fs.readFileSync)
- Deduplication by normalized text hash (strips whitespace, punctuation, quotes, lowercases)
- Shared `Reader.tsx` component (used in `/reader/[id]` and `/account/reader/[id]`)
- Pagination: 10 paragraphs per page
- Book deletion

### Stage 4 — Protection & Monetization (in progress)

#### Done
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
  - Price IDs hardcoded in `app/pricing/page.tsx` (NEXT_PUBLIC_ vars unreliable in browser)

#### TODO
- Admin identification via `ADMIN_EMAIL` env variable
- Admin book upload interface

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
  page.tsx                        # Main page: upload + library books
  layout.tsx                      # Root layout: Header + Footer
  auth/page.tsx                   # Login, register, forgot password
  account/page.tsx                # My books + my cards (expandable cards)
  account/reader/[id]/page.tsx    # User book reader
  reader/[id]/page.tsx            # Public book reader
  pricing/page.tsx                # Pricing plans (Free / Pro / Donate)
  about/page.tsx
  contacts/page.tsx
  feedback/page.tsx
  api/
    translate/route.ts            # Word/phrase/paragraph translation via Claude Haiku
    retell/route.ts               # Book retelling via Claude Haiku
    stripe/
      checkout/route.ts           # Create Stripe Checkout session
      webhook/route.ts            # Handle Stripe webhook events
  components/
    Reader.tsx                    # Shared reader component
    Header.tsx
    Footer.tsx
lib/
  supabase.ts                     # Supabase client (anon key)
  books.ts                        # Hardcoded public books (BOOKS, BOOK_LANGUAGE)
  prompts/
    retell.md                     # Retelling prompt (loaded at runtime via fs.readFileSync)
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
| created_at | timestamptz | |

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
STRIPE_WEBHOOK_SECRET             # different for local vs production

# App
NEXT_PUBLIC_APP_URL               # http://localhost:3000 or https://langreader.vercel.app
NEXT_PUBLIC_PRO_REQUIRED          # 'true' or 'false' — controls upload paywall
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
5. If not → call Claude Haiku with prompt from `lib/prompts/retell.md`
6. Clean output (remove leading `#` and `---` lines)
Model: claude-haiku-4-5-20251001, max_tokens: 4096

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
- **Paragraph cache:** translations cached in localStorage. Key = first 50 chars of paragraph.
- **Pro paywall:** single env variable `NEXT_PUBLIC_PRO_REQUIRED`. Set to `false` to open all features during soft launch.
- **Card limit:** checked server-side via count query before insert. Message shown inline in popup.
- **Stripe Price IDs:** hardcoded in `app/pricing/page.tsx` — `NEXT_PUBLIC_` env vars unreliable in browser context for button onClick handlers.
- **Webhook secret:** two separate secrets — one for local (stripe CLI), one for production (Stripe Dashboard).
- **Reader component:** single `Reader.tsx` shared between public and user book pages.

---

## Known issues

- `created_at` shows 01.01.1970 for books — Supabase default not set correctly
- Double-click word selection captures trailing space — workaround: use click+drag
- epub upload not implemented (shows "coming soon")
- Hydration warning in console — cosmetic, caused by browser extensions

---

## Deferred (post Stage 4)

- Multilingual URLs: `/en/reader/`, `/es/reader/` etc.
- Language selection in account settings
- Book card UI redesign on main page
- Admin interface for book management
- epub/pdf upload support
- Card export (Anki etc.)
- Card categories by source book
- Audio transcription in cards (needs TTS service + Supabase Storage)
- Google Analytics
- Lazy load for library (60 books, then full catalog link)
- PWA / mobile app