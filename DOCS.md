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
NEXT_PUBLIC_PROCESSING_API_URL=https://balaka-processing-production.up.railway.app
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

The `/api/retell` and `/api/format` processing itself no longer runs on Vercel — see Section 16a for the separate `balaka-processing` repo/deployment on Railway.

---

## 3. Adding a book to the public library

**Always upload locally** (`localhost:3000/admin`), not via `langreader.vercel.app/admin` — see Section 14 for why this historically mattered; the processing itself now runs on Railway regardless (Section 16a), which removes the original timeout concern, but local upload is still the established habit for the admin library.

1. Log in as admin, go to `localhost:3000/admin`
2. Fill: title, language, type (Original = readability formatting only / Retelling = Claude simplifies), optional cover image
3. Upload `.txt` → wait for processing to finish (progress shown in account)
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

**Recommended: `npm run dev:full`** — runs Next.js and the Stripe CLI listener together in one terminal (via `concurrently`), so it's impossible to forget to start `stripe listen` before testing. This was a repeat source of confusion during development: Checkout would complete successfully in Stripe with no visible error, but `profiles.plan` would silently never update because no webhook event ever reached localhost.

```bash
npm run dev:full
```

If you need them separate for any reason:
```bash
# Terminal 1
npm run dev

# Terminal 2
.\stripe.exe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy `whsec_...` → `.env.local` → restart dev server.

Test card: `4242 4242 4242 4242`, any future date/CVC.

Re-auth (every 90 days): `.\stripe.exe login`

**Important:** `stripe listen` must be running in its own terminal for the *entire* duration of any local Stripe test. If it isn't running, Checkout still completes and redirects successfully on the surface, but no webhook event ever reaches localhost — so `profiles.plan` silently never updates. Easy to miss since nothing visibly errors.

For subscriptions specifically: `checkout/route.ts` sets `subscription_data.metadata.userId` (not just the checkout session's own `metadata`) — this is required so that subscription-level events like `customer.subscription.deleted` (fired when a subscription is cancelled directly in the Stripe dashboard, not just via the app's own cancel button) can still be tied back to a user.

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

These files also need to be manually kept in sync in the separate `balaka-processing` repo (Section 16a) — they are not shared/imported between the two repos, just copy-pasted.

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
| `reading_progress` | Cross-device reading progress, composite PK `(user_id, book_id)` |

Views use `WITH (security_invoker = true)` — required to avoid Supabase security linter warnings. Do NOT use subqueries to `auth.users` inside views (also flagged as security risk) — hardcode the admin UUID instead.

### Resetting a stuck book (processing/error)
`books` table → set `status = pending`, `progress = 0` → user clicks retry button in account.

---

## 11. Supabase Storage

Bucket `covers` — public, admin-only uploads via `/admin` form. URL stored in `books.cover_url`.

Bucket `book-sources` — private, RLS-scoped so each user can only access files under their own `${userId}/...` path prefix. Holds raw uploaded epub files before extraction; downloaded by the Railway processing server using its service-role key (no signed URL needed). See Section 16b.

---

## 12. Reading progress

Synced to Supabase (`reading_progress` table) for logged-in users, with `localStorage` (key `reading_progress_${bookId}` → page number) acting as a fast local cache. Logged-out users on public books remain `localStorage`-only (no `user_id` to attach progress to). See SNAPSHOT.md "Reading progress sync" section for the full design.

---

## 13. Translation system

`/api/translate` takes `nativeLanguage` (translation target) and `learningLanguage` (source text language) from the request body, both sourced from `localStorage` in `Reader.tsx`:
- `balaka_native_language`
- `balaka_learning_language`

Prompts dynamically insert both language names. Verb forms and examples are generated in the learning language, translations/explanations in the native language.

When adding new languages, update `LANGUAGE_NAMES` map in `app/api/translate/route.ts` to match `Header.tsx` language lists.

---

## 14. Uploading large books — historical Vercel timeout issue (resolved)

### The original problem
Vercel serverless functions have execution time limits. Books over ~200KB used to time out mid-processing on `langreader.vercel.app`, leaving `status = processing` stuck with a partial `progress` value that never updated.

### Resolution
As of the Railway migration (Section 16a), `/api/retell` and `/api/format` no longer run on Vercel at all — they run on a separate long-running Node server on Railway, called directly from the browser. Vercel's execution time limit no longer applies to this workflow. Large books (200KB+) have been tested end-to-end in production and complete successfully.

### If a book gets stuck anyway
Supabase → `books` → set `status = error` → user/admin clicks "Retry" or "Retry formatting" button in `/account`.

---

## 15. Paragraph length enforcement (technical note)

Both `/api/retell` and `/api/format` apply `enforceMaxSentencesPerParagraph()` — a JS function that splits any paragraph exceeding N sentences into smaller ones, run AFTER Claude's response, using regex sentence-boundary detection.

This exists because prompt instructions alone ("break long paragraphs") are unreliable for certain text types (e.g. long uninterrupted dialogue monologues) — Claude sometimes ignores the instruction. Code-level enforcement is deterministic, adds no extra API cost, and guarantees the rule is followed.

Limits: 6 sentences for format.md (original), 5 sentences for retell.md (retelling).

---

## 16. Character limits & cost economics

### The numbers
- **Per-file hard cap:** no single upload may exceed **2,000,000 characters**, regardless of plan or remaining monthly quota. This check happens first, before any quota logic, and applies unconditionally.
- **Monthly Pro quota:** **2,000,000 characters/month**, tracked via `profiles.chars_used`, resetting every 30 days from `profiles.period_start`.
- **"Grace pass":** if a single upload is the *first* one in the current period to push the user over their monthly quota (i.e. `chars_used` was still under 2,000,000 before this upload), the upload is still processed for free — the person sees "You have reached your monthly limit of 2,000,000 characters. Anyway, we will finish this task for you for free." Any *further* upload attempt in the same period, once `chars_used` is already over 2,000,000, is hard-blocked with the standard limit message — no further grace.
- Because the per-file cap and the monthly quota are the same number (2,000,000), a single file can never itself jump from "under quota" to "wildly over quota" — the worst case for the grace pass is bounded to roughly one extra file's worth of quota overage, at most once per 30-day period per account.

### Why these specific numbers
Worked out from Claude Haiku 4.5 API pricing (`$1/million input tokens`, `$5/million output tokens`, checked live rather than assumed, since rates change over time) and the app's chunking behavior (12,000 characters per chunk, ≈ 1 token per 4 characters as a rough estimate for Latin-script text):

For a 2,000,000-character file (~167 chunks):
- **Format** (worst case — output is roughly the same size as input, since formatting doesn't shorten content):
  - Input: ~600,000 tokens × $1/M ≈ **$0.60**
  - Output: ~500,000 tokens × $5/M ≈ **$2.50**
  - **Total ≈ $3.10** for one full-size file
- **Retell** (cheaper — output is 50-70% of input length by design, see Section 15):
  - **Total ≈ $2.10** for one full-size file

Against $4.99/month Pro revenue, even the worst case (one grace-pass format job at max size) leaves roughly $2 of margin before Stripe fees (~$0.45), shared hosting costs (Vercel/Supabase/Railway), and — importantly — the **recurring, harder-to-predict cost of in-reader translation lookups** (`/api/translate`, also Claude Haiku), which isn't captured in this file-processing estimate at all and depends on how much an individual user actually reads and looks up month to month.

**Bottom line:** the 2,000,000 character limits are safely bounded on their own, but they don't by themselves confirm overall Pro-tier profitability — that depends more on translation-lookup volume per active reader. Worth checking real per-user cost in the Anthropic Console usage dashboard after this has been live for a while, and revisiting the quota if needed.

---

## 16a. Processing server (Railway) — `balaka-processing`

`/api/retell` and `/api/format` were migrated off Vercel to a separate, standalone Node/Express server, to remove Vercel's serverless execution time limit for large books (Section 14).

### Repository
Separate GitHub repo: `balaka-processing` (private). Not a subfolder of `langreader` — kept independent so Vercel doesn't try to build/deploy it, and so Railway has a clean single-purpose repo to deploy from.

```
balaka-processing/
├── package.json       (express, cors, @supabase/supabase-js)
├── server.js           (both endpoints, all processing logic)
├── .env.example
└── lib/
    └── prompts/
        ├── retell.md    (must be manually kept in sync with the main repo's copy)
        └── format.md    (same)
```

### Hosting
Railway, Hobby plan ($5/mo — the free trial's credit-based limits and possible sleep/stop behavior weren't reliable enough for production use). Public domain auto-generated by Railway: `https://balaka-processing-production.up.railway.app`.

### Environment variables (set in Railway → Variables, not `.env.local`)
```
ANTHROPIC_API_KEY
SUPABASE_URL                  (same value as NEXT_PUBLIC_SUPABASE_URL on Vercel)
SUPABASE_ANON_KEY             (same value as NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel)
SUPABASE_SERVICE_ROLE_KEY
FRONTEND_URL                  (comma-separated list of allowed origins for CORS, e.g.
                                http://localhost:3000,https://langreader.vercel.app,https://balaka.app)
PORT                          (Railway sets this automatically)
```
**When the custom domain changes or is added, `FRONTEND_URL` must be updated** with the new origin, or the browser's CORS preflight will block requests from that domain.

### Authentication model
The processing server does **not** trust a `userId` field in the request body (unlike the original Vercel routes). Instead, the frontend sends the user's real Supabase session token in the `Authorization: Bearer <token>` header; the server verifies it via `supabase.auth.getUser(token)` and derives the user id itself. This closes the previously-known gap where `/api/retell` and `/api/format` trusted a client-supplied `userId` at face value.

On the frontend, all calls go through a shared helper, `lib/processing.ts` → `callProcessingApi(endpoint, bookId)`, which reads the current session and attaches the token automatically. `app/admin/page.tsx`, `app/page.tsx`, and `app/account/page.tsx` all use this helper instead of calling `fetch('/api/retell'|'/api/format', ...)` directly.

### Critical: Railway's 60-second idle connection timeout
Railway's public-networking proxy has a **Keep-Alive idle timeout of 60 seconds** — if an HTTP connection sits with no bytes flowing for 60+ seconds, the proxy closes it from its side, even though Railway's own documented *maximum* request duration is much longer (15 minutes) and the Node process itself keeps running uninterrupted server-side.

This mattered here because the original design had the browser's `fetch()` call block and wait for a single JSON response only once the *entire* chunk-processing loop finished — for any book taking longer than ~60 seconds, the browser would see a network error (and any local retry logic could then race a second, duplicate processing job against the first, corrupting `books.progress`), even though the server had not actually failed and kept working in the background.

**Fix:** both `/api/retell` and `/api/format` now validate the request (auth, book ownory, quota) and mark `status = 'processing'` synchronously, respond to the browser immediately (typically well under a second), and only *then* kick off the actual chunk-by-chunk Claude processing loop as a fire-and-forget background task. Progress is still written to `books.progress` exactly as before, and the existing polling on `/account` (every 10s) picks it up — no frontend changes were needed for this part. An in-memory `jobsInProgress` Set on the server also rejects (`409`) a second request for a book that's already being processed, to prevent duplicate concurrent jobs from ever starting in the first place.

### Local testing
Since `admin/page.tsx`, `page.tsx`, and `account/page.tsx` all call the Railway URL directly (not a local `/api/...` route), testing locally via `npm run dev` on `localhost:3000` exercises the *real* Railway server — there is no separate "local mode" for the processing server itself. This is useful: bugs in the Railway server's behavior (e.g. the idle-timeout issue above) reproduce identically whether the frontend is opened from `localhost:3000` or `langreader.vercel.app`, since the Railway server is the same either way. Vercel-specific issues (e.g. the old serverless timeout) do *not* reproduce locally, since `npm run dev` has no execution time limit of its own — those specifically require testing against the deployed `langreader.vercel.app`.

---

## 16b. epub & PDF upload and text extraction

### Flow
Unlike `.txt`, epub and PDF files can't just be read as plain text client-side — epub is a ZIP archive of XHTML chapters plus metadata, and PDF is a binary layout format — both need a real parser. The flow (identical for both formats):

1. Client uploads the raw file (unparsed) to a private Supabase Storage bucket, `book-sources`, at path `${userId}/${bookId}.${extension}`
2. A `books` row is inserted with `status = 'extracting'`, `original_text = ''`, and `source_path` pointing to that Storage path
3. The client calls the Railway server's `/api/extract` endpoint (via the same `callProcessingApi` helper used for `retell`/`format`, just with `'extract'` as the endpoint)
4. The server downloads the file using its own service-role Supabase client (no signed URL needs to cross the network — the server already has full access), parses it with `officeparser`, and writes the extracted plain text into `books.original_text`
5. Status flips to `pending` — from here on, the flow is identical to `.txt`: the user picks "Read original" or "Create retelling" on `/account`

`officeparser` auto-detects the format from the file's own content (both epub and PDF are identifiable this way) — `/api/extract` has no format-specific branching at all, it's the same code path for both. The only format-specific logic lives client-side: the `accept` attribute on the file input, the Storage content-type (`application/epub+zip` vs `application/pdf`), and the file extension used to build `source_path`.

### Why `/api/extract` is synchronous (unlike `/api/retell` and `/api/format`)
The fire-and-forget background pattern used for retell/format (Section 16a) exists specifically to dodge Railway's 60-second idle connection timeout during *long* Claude processing loops. Extraction doesn't call Claude at all — it's a local parsing operation, comfortably fast even for large files — so `/api/extract` just does the work directly within the request/response cycle and returns the final result. No `jobsInProgress` tracking, no background task, no polling needed for the extraction step itself (though the *existing* 10-second polling on `/account` still covers the brief `extracting` status window in case it takes a moment).

### `officeparser` API gotcha
`officeparser` v7.x's promise-based API is `parseOffice(buffer)`, which resolves to an AST object with a `.toText()` method — **not** `parseOfficeAsync(buffer)` (which existed in older major versions and was removed). Calling the wrong function name throws a `TypeError` inside the parsing step, which surfaces to the user as a generic "Failed to extract text from file" error. Worth double-checking against the installed version's actual README if `officeparser` is ever upgraded, since this API has changed across major versions before.

### Character limit checks happen server-side, after extraction
For `.txt`, the client already has the full text in memory (via `FileReader`) before any upload happens, so the 2,000,000-character cap, monthly quota, and grace-pass logic (Section 16) all run client-side in `page.tsx` *before* the book is even inserted. For epub/PDF, the real character count is only known *after* `officeparser` has run — so the same limit logic is duplicated server-side inside `/api/extract` (see `checkAndApplyQuota()` in `server.js`), running immediately after extraction succeeds and before `original_text` is saved. This is a known, accepted piece of duplication rather than a shared library, since unifying it properly would mean a larger refactor of how `.txt` uploads work too — not worth doing until there's a second or third reason to.

### Limits specific to epub/PDF
- **Raw file size cap: 20MB.** This is separate from and in addition to the 2,000,000-character cap on the *extracted* text — a source file can be large purely from embedded cover art, illustrations, or (for PDF especially) page rendering overhead, even if the actual text content is modest. Raw file weight has **no effect on Claude token cost or the character quota** — only the extracted plain text is ever sent to Claude or counted against the monthly limit, never the raw file bytes.
- If extraction succeeds but pushes the user over their monthly character quota for the first time this period, the same "grace pass" behavior from Section 16 applies (the extraction — and the book — still complete for free; the person just sees the same limit-reached message).

### Error states & retry
A new `extracting` status (distinct from `processing`, which is reserved for the format/retell Claude loop) is shown on `/account` as "Extracting text..." with no percentage — extraction isn't chunked, so a progress bar wouldn't mean anything. On failure, the book's `source_path` (present only for epub/PDF-sourced books) is used to decide which retry button to show: "Retry extraction" re-calls `/api/extract` on the already-uploaded file (no need to re-upload), versus the pre-existing "Retry formatting" / "Retry" buttons for `.txt`-sourced books.

### PDF-specific caveats
PDF text extraction quality depends entirely on the source document. A scanned PDF with no actual text layer (just page images) extracts nothing — `/api/extract` catches this and returns a clear "Could not extract any text from this file" error rather than silently producing an empty book. Complex layouts (multi-column text, footnotes, headers/footers interleaved with body text) can produce rougher, less cleanly-ordered text than a typical epub. Both formats have been tested end-to-end in production (extraction, Read original, Create retelling) and confirmed working, but PDF quality is inherently more variable and worth spot-checking on real files as they come in.

### `npm audit` reports a high-severity `pdfjs-dist` vulnerability — investigated, not currently actionable
`npm install` in `balaka-processing` reports a high-severity advisory (CVE-2026-16633, "PDF.js: Arbitrary JavaScript execution upon opening a malicious PDF") via `officeparser`'s `pdfjs-dist` dependency. Investigated in detail rather than blindly running `npm audit fix --force`:

- **No fix currently exists via npm.** Every published `officeparser` version (including the latest, checked directly against the npm registry) pins `pdfjs-dist` to an exact version inside the vulnerable range (`>=5.6.83 <6.2.108`; the patched version is `6.2.108`). `npm audit fix --force` would downgrade `officeparser` to an older major version, but the same vulnerable `pdfjs-dist` pin is still present there too — it doesn't actually resolve anything, it just changes which vulnerable version gets installed.
- **The vulnerability's real mechanism doesn't apply to how we use it.** Per the official GitHub Security Advisory, this is a CWE-79 (cross-site scripting) issue: it requires PDF.js to be rendering a PDF inside a browser page with `enableScripting: true`, so that attacker-controlled JavaScript executes "in the context of the hosting domain." We run `officeparser` server-side in plain Node.js — there is no browser, no DOM, no "hosting domain" for the described attack to execute in. We only call it to extract plain text (`ast.toText()`), never to render or display the PDF.
- **`officeparser`'s own source confirms the relevant protection is already in place.** Its `PdfParser.js` calls `pdfjs.getDocument()` with `isEvalSupported: false` and an explicit comment: *"Harden against untrusted PDFs: don't let pdf.js JIT font/CMap fast-paths compile via `new Function`."* It never sets `enableScripting: true` either. Both of these are exactly the settings the advisory's own workaround section recommends.

**Conclusion:** the audit warning is accurate in general but not exploitable in this specific server-side, text-extraction-only usage. No action taken. Worth periodically checking whether a future `officeparser` release bumps its `pdfjs-dist` pin past `6.2.108`, purely to clear the audit noise — not because of an active security gap.


