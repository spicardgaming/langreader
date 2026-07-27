# Balaka — Developer & Operations Guide

---

## 1. Local development

### Requirements
- Node.js 18+
- npm
- VSCode + Cline extension

### First time setup
```bash
git clone https://github.com/spicardgaming/langreader
cd langreader
npm install
```

Create `.env.local` in project root:
```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_DONATE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...  # from stripe CLI, see section 5
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PRO_REQUIRED=false
NEXT_PUBLIC_ADMIN_EMAIL=your@email.com
```

### Start dev server
```bash
npm run dev
```
App runs at `http://localhost:3000`

---

## 2. Deploy to production

Vercel auto-deploys on every push to GitHub `master` branch.

```bash
git add .
git commit -m "description"
git push
```

Vercel builds in 1-2 minutes. Check at vercel.com dashboard.

### Environment variables in Vercel
All variables from `.env.local` must also be added in:
**Vercel → Project → Settings → Environment Variables**

Note: `STRIPE_WEBHOOK_SECRET` in Vercel must be the **production** webhook secret from Stripe Dashboard, not the local CLI secret.

---

## 3. Adding a book to the public library

### Where to upload
**Always use `langreader.vercel.app/admin`** — not localhost. Books are stored in Supabase (not in code), so local and production share the same database. Uploading locally still writes to the production database, so it's simpler to use the live admin page directly.

Use localhost only when testing a new feature before deploying.

### Upload steps
1. Log in with admin email account
2. Go to `langreader.vercel.app/admin`
3. Fill in the form:
   - **Book title** — display name
   - **Language** — language of the text
   - **Type:** `Original` (formatted for readability, no content changes) or `Retelling` (Claude simplifies)
   - **Cover image** — optional, JPG/PNG/WebP, recommended 400×600px (2:3 ratio)
4. Upload `.txt` file → click **Upload**
5. Wait for processing to complete (progress shown in admin account)
6. Go to **Supabase → Table Editor → books**
7. Find the book → set `is_public = true` → save
8. Book appears on the main page

**Important:** Only books with `is_public = true` AND `status = done` appear on the main page.

**Source for copyright-free books:** [Project Gutenberg](https://www.gutenberg.org)

### What happens during upload
- **Original:** text is processed through Claude for readability formatting (breaks long paragraphs, fixes whitespace) without changing content
- **Retelling:** Claude simplifies the text to 70-80% length with simpler vocabulary

---

## 4. Managing users and subscriptions

### View users
Supabase → Table Editor → `profiles`

| Column | Meaning |
|--------|---------|
| plan | `free` or `pro` |
| chars_used | characters used this month |
| period_start | start of current billing period |
| native_language | language user knows (translation target) |
| learning_language | language user is learning (library filter) |

### Manually upgrade a user to Pro
Supabase → `profiles` → find user by `id` → set `plan = pro`

### Find user ID
Supabase → Authentication → Users → find by email → copy UUID

---

## 5. Admin account management

### Change admin password
Go to the site → Sign in → Forgot password → enter admin email → follow the link in email → set new password. Works like any regular user account.

### Switching to a new admin account
1. Register a new account with the new admin email
2. Update `NEXT_PUBLIC_ADMIN_EMAIL` in Vercel → Environment Variables
3. Update `NEXT_PUBLIC_ADMIN_EMAIL` in `.env.local`
4. Redeploy: Vercel → Deployments → latest → Redeploy
5. Books uploaded by the old admin remain in Supabase and stay public — they are not affected

### Deleting the admin account
Not recommended. Books in Supabase are linked to the admin's `user_id`. If the account is deleted:
- Public books (`is_public=true`) will still appear on the main page
- But the `user_id` will point to a non-existent user — potential RLS issues in the future

If you must delete it, first transfer ownership of books by updating `user_id` in the `books` table to the new admin's user ID.

---

## 6. Testing Stripe payments locally

Requires Stripe CLI (`stripe.exe` in project root).

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
.\stripe.exe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_...` secret → put in `.env.local` as `STRIPE_WEBHOOK_SECRET` → restart dev server.

**Test card:** `4242 4242 4242 4242`, any future date, any CVC.

### Stripe CLI re-authentication (expires after 90 days)
```bash
.\stripe.exe login
```

---

## 7. Toggling the Pro paywall

**Vercel → Environment Variables:**
- `NEXT_PUBLIC_PRO_REQUIRED=false` — everyone can upload (soft launch)
- `NEXT_PUBLIC_PRO_REQUIRED=true` — only Pro users can upload

After changing → manual redeploy:
**Vercel → Deployments → latest → three dots → Redeploy**

---

## 8. Updating the retelling prompt

Edit `lib/prompts/retell.md` directly — no code changes needed.

```bash
git add .
git commit -m "update retelling prompt"
git push
```

## 9. Updating the formatting prompt

Edit `lib/prompts/format.md` directly — no code changes needed.

```bash
git add .
git commit -m "update format prompt"
git push
```

---

## 10. Managing available languages

Languages are defined in `app/components/Header.tsx`:

```ts
// Languages users can learn (must have books in library)
const LEARNING_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  // Add more when books are available:
  // { code: 'fr', label: 'French' },
];

// Languages users can know (translation target)
const NATIVE_LANGUAGES = [
  { code: 'ru', label: 'Russian' },
  { code: 'en', label: 'English' },
  // Add more as needed
];
```

To add a language: uncomment the line (or add a new one) → commit → push → Vercel deploys in 1-2 min.

**Before adding a learning language**, make sure there are books in that language in the library — otherwise users will see an empty library.

---

## 11. Key Supabase tables

| Table | Purpose |
|-------|---------|
| `books` | All books (user + admin library) |
| `cards` | Saved vocabulary cards |
| `profiles` | User plan, usage stats, language preferences |

### Making a book public
`books` table → find row → set `is_public = true`

### Resetting a stuck retelling or formatting
`books` table → find row → set `status = pending`, `progress = 0`
User can then click "Create retelling" again, or re-upload for formatting.

---

## 12. Supabase Storage

Bucket `covers` — public bucket for book cover images.
- Admin uploads via `/admin` form
- Public URL stored in `books.cover_url`
- Policy: authenticated users can upload

---

## 13. Reading progress

Reading progress is saved to `localStorage` per book:
- Key: `reading_progress_${bookId}`
- Value: page number (string)
- Works for both public books (`/reader/[id]`) and user books (`/account/reader/[id]`)
- Device-specific (not synced across devices — see Possible Improvements in SNAPSHOT.md)


---

## 14. Uploading large books (important)

### Problem
Vercel has a maximum execution time limit for serverless functions. For large books (>200KB), the formatting or retelling process may timeout on Vercel, leaving the book stuck at a partial progress percentage.

### Solution for public library books
**Always upload public books locally**, not through `langreader.vercel.app/admin`.

Steps:
1. Run local dev server: `npm run dev`
2. Go to `http://localhost:3000/admin`
3. Upload the book — formatting runs without time limits
4. After status shows `done` in your account, go to Supabase → `books`
5. Set `is_public = true` for the book
6. Book appears on the main page

Books are stored in Supabase (cloud), not on your local PC. After uploading locally, you can shut down your computer — the book stays in Supabase permanently.

### Solution for user-uploaded books
User books are smaller (personal texts) — Vercel limits are less likely to be an issue. If a book gets stuck:
1. Supabase → `books` → find the book → set `status = error`
2. User sees "Retry formatting" button in their account
3. User clicks retry — formatting restarts from scratch

### Future solution (when scaling)
For production at scale, consider migrating heavy processing (retelling, formatting) to Railway or Render — full servers without time limits (~$5-20/month). Vercel stays for the frontend.

