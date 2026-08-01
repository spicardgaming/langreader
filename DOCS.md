# Balaka — Developer & Operations Guide

---

## 1. Local development

### Requirements
- Node.js 18+, npm, VSCode + Cline extension

### Setup
```bash
git clone https://github.com/spicardgaming/langreader
cd langreader
npm install
```

Create `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_DONATE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PRO_REQUIRED=false
NEXT_PUBLIC_ADMIN_EMAIL=your@email.com
```

```bash
npm run dev
```

---

## 2. Deploy to production

Vercel auto-deploys on push to `master`.

```bash
git add .
git commit -m "description"
git push
```

All env vars from `.env.local` must also be in Vercel → Settings → Environment Variables.
`STRIPE_WEBHOOK_SECRET` in Vercel = production webhook secret (different from local CLI secret).

---

## 3. Adding a book to the public library

**Always upload locally** (`localhost:3000/admin`), not via `langreader.vercel.app/admin` — see Section 14 for why.

1. Log in as admin, go to `localhost:3000/admin`
2. Fill: title, language, type (Original = readability formatting only / Retelling = Claude simplifies), optional cover image
3. Upload `.txt` → wait for processing to finish locally (progress shown in account)
4. Supabase → `books` table → set `is_public = true` on that row
5. Book appears on main page (filtered by `learning_language` for each user)

Source for copyright-free books: [Project Gutenberg](https://www.gutenberg.org)

---

## 4. Managing users and subscriptions

Supabase → `profiles` table, or use the read-only views:
- `profiles_free_view` — free users only
- `profiles_pro_view` — pro users only

Columns: `plan`, `chars_used`, `period_start`, `native_language`, `learning_language`, `email`, `stripe_subscription_id`

Manually upgrade: set `plan = 'pro'` on a row.

---

## 5. Admin account

### Change password
Site → Sign in → Forgot password → follow email link.

### Switch to new admin account
1. Register new account
2. Update `NEXT_PUBLIC_ADMIN_EMAIL` in Vercel + `.env.local`
3. Redeploy
4. Old admin's books stay public and unaffected

---

## 6. Testing Stripe locally

```bash
# Terminal 1
npm run dev

# Terminal 2
.\stripe.exe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy `whsec_...` → `.env.local` → restart dev server.

Test card: `4242 4242 4242 4242`, any future date/CVC.

Re-auth (every 90 days): `.\stripe.exe login`

---

## 7. Toggling Pro paywall

Vercel env var `NEXT_PUBLIC_PRO_REQUIRED`:
- `false` = open to all (soft launch)
- `true` = Pro required for uploads

Manual redeploy needed after changing.

---

## 8. Updating prompts

Edit directly, no code changes:
- `lib/prompts/retell.md` — simplification/retelling rules
- `lib/prompts/format.md` — readability formatting rules (no content change)

```bash
git add . && git commit -m "update prompt" && git push
```

---

## 9. Managing available languages

In `app/components/Header.tsx`:

```ts
const LEARNING_LANGUAGES = [ /* must have books available */ ];
const NATIVE_LANGUAGES = [ /* translation targets, no book requirement */ ];
```

**Critical:** any language code added here MUST also be added to `LANGUAGE_NAMES` in `app/api/translate/route.ts`, or translation for that language silently falls back to Russian/English.

To add a learning language: confirm books exist in that language first, then uncomment/add in Header.tsx AND translate/route.ts, commit, push.

---

## 10. Key Supabase tables & views

| Table/View | Purpose |
|------------|---------|
| `books` | All books |
| `books_admin_view` | Read-only: admin's books only |
| `books_user_view` | Read-only: all non-admin books |
| `cards` | Vocabulary cards |
| `profiles` | User settings/plan |
| `profiles_free_view` | Read-only: free users |
| `profiles_pro_view` | Read-only: pro users |

Views use `WITH (security_invoker = true)` — required to avoid Supabase security linter warnings. Do NOT use subqueries to `auth.users` inside views (also flagged as security risk) — hardcode the admin UUID instead.

### Resetting a stuck book (processing/error)
`books` table → set `status = pending`, `progress = 0` → user clicks retry button in account.

---

## 11. Supabase Storage

Bucket `covers` — public, admin-only uploads via `/admin` form. URL stored in `books.cover_url`.

---

## 12. Reading progress

localStorage key: `reading_progress_${bookId}` → page number. Device-specific, not synced (see SNAPSHOT.md Possible Improvements).

---

## 13. Translation system

`/api/translate` takes `nativeLanguage` (translation target) and `learningLanguage` (source text language) from the request body, both sourced from `localStorage` in `Reader.tsx`:
- `balaka_native_language`
- `balaka_learning_language`

Prompts dynamically insert both language names. Verb forms and examples are generated in the learning language, translations/explanations in the native language.

When adding new languages, update `LANGUAGE_NAMES` map in `app/api/translate/route.ts` to match `Header.tsx` language lists.

---

## 14. Uploading large books — Vercel timeout issue

### Problem
Vercel serverless functions have execution time limits. Books over ~200KB may time out mid-processing on `langreader.vercel.app`, leaving `status = processing` stuck with a partial `progress` value that never updates.

### Solution: upload locally
1. `npm run dev`
2. Go to `localhost:3000/admin`
3. Upload — no time limit locally
4. Book saves to Supabase (cloud) — safe to shut down PC after
5. Set `is_public = true` in Supabase to publish

### If a book gets stuck anyway
Supabase → `books` → set `status = error` → user/admin clicks "Retry" or "Retry formatting" button in `/account`.

### Future fix
Migrate `/api/retell` and `/api/format` to a dedicated server (Railway/Render, ~$5-20/mo) when scaling — removes the time limit entirely. Keep Vercel for the frontend.

---

## 15. Paragraph length enforcement (technical note)

Both `/api/retell` and `/api/format` apply `enforceMaxSentencesPerParagraph()` — a JS function that splits any paragraph exceeding N sentences into smaller ones, run AFTER Claude's response, using regex sentence-boundary detection.

This exists because prompt instructions alone ("break long paragraphs") are unreliable for certain text types (e.g. long uninterrupted dialogue monologues) — Claude sometimes ignores the instruction. Code-level enforcement is deterministic, adds no extra API cost, and guarantees the rule is followed.

Limits: 6 sentences for format.md (original), 5 sentences for retell.md (retelling).

