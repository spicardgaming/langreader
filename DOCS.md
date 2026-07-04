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

1. Log in with admin email account
2. Go to `/admin`
3. Fill in the form:
   - **Book title** — display name
   - **Language** — language of the text
   - **Type:** `Original` (no Claude call) or `Retelling` (Claude simplifies)
   - **Cover image** — optional, JPG/PNG/WebP, recommended 400×600px (2:3 ratio)
4. Upload `.txt` file → click **Upload**
5. Go to **Supabase → Table Editor → books**
6. Find the book → set `is_public = true` → save
7. Book appears on the main page

**Important:** Only books with `is_public = true` AND `status = done` appear on the main page.

**Source for copyright-free books:** [Project Gutenberg](https://www.gutenberg.org)

---

## 4. Managing users and subscriptions

### View users
Supabase → Table Editor → `profiles`

| Column | Meaning |
|--------|---------|
| plan | `free` or `pro` |
| chars_used | characters used this month |
| period_start | start of current billing period |

### Manually upgrade a user to Pro
Supabase → `profiles` → find user by `id` → set `plan = pro`

### Find user ID
Supabase → Authentication → Users → find by email → copy UUID

---

## 5. Testing Stripe payments locally

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

## 6. Toggling the Pro paywall

**Vercel → Environment Variables:**
- `NEXT_PUBLIC_PRO_REQUIRED=false` — everyone can upload (soft launch)
- `NEXT_PUBLIC_PRO_REQUIRED=true` — only Pro users can upload

After changing → manual redeploy:
**Vercel → Deployments → latest → three dots → Redeploy**

---

## 7. Updating the retelling prompt

Edit `lib/prompts/retell.md` directly — no code changes needed.

```bash
git add .
git commit -m "update retelling prompt"
git push
```

---

## 8. Key Supabase tables

| Table | Purpose |
|-------|---------|
| `books` | All books (user + admin library) |
| `cards` | Saved vocabulary cards |
| `profiles` | User plan, usage stats |

### Making a book public
`books` table → find row → set `is_public = true`

### Resetting a stuck retelling
`books` table → find row → set `status = pending`, `progress = 0`
User can then click "Create retelling" again.

---

## 9. Supabase Storage

Bucket `covers` — public bucket for book cover images.
- Admin uploads via `/admin` form
- Public URL stored in `books.cover_url`
- Policy: authenticated users can upload

---

## 10. Reading progress

Reading progress is saved to `localStorage` per book:
- Key: `reading_progress_${bookId}`
- Value: page number (string)
- Works for both public books (`/reader/[id]`) and user books (`/account/reader/[id]`)
- Device-specific (not synced across devices — see Possible Improvements)

