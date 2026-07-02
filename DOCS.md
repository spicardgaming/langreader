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
git commit -m "description of changes"
git push
```

Vercel builds in 1-2 minutes. Check status at vercel.com dashboard.

### Environment variables in Vercel
All variables from `.env.local` must also be added in:
**Vercel → Project → Settings → Environment Variables**

Note: `STRIPE_WEBHOOK_SECRET` in Vercel must be the **production** webhook secret from Stripe Dashboard, not the local CLI secret.

---

## 3. Adding a book to the public library

1. Log in with admin email account
2. Go to `/admin`
3. Fill in the form:
   - **Book title** — display name shown to users
   - **Language** — language of the text (en, es, fr, etc.)
   - **Type:**
     - `Original` — book is saved and readable as-is (no Claude call)
     - `Retelling` — Claude simplifies the text (takes time for large files)
4. Upload `.txt` file → click **Upload**
5. Go to **Supabase → Table Editor → books**
6. Find the book row → click to edit → set `is_public = true` → save
7. Book now appears on the main page `/`

**Important:** Only books with both `is_public = true` AND `status = done` appear on the main page.

**Recommended sources for copyright-free books:** [Project Gutenberg](https://www.gutenberg.org)

---

## 4. Managing users and subscriptions

### View users
Supabase → Table Editor → `profiles`

Columns:
- `plan` — `free` or `pro`
- `chars_used` — characters used this month
- `period_start` — start of current billing period

### Manually upgrade a user to Pro
Supabase → Table Editor → `profiles` → find user by `id` → set `plan = pro`

### Find user ID
Supabase → Authentication → Users → find by email → copy UUID

---

## 5. Testing Stripe payments locally

Requires Stripe CLI (`stripe.exe` in project root).

**Terminal 1 — start dev server:**
```bash
npm run dev
```

**Terminal 2 — start webhook listener:**
```bash
.\stripe.exe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_...` secret shown and put it in `.env.local` as `STRIPE_WEBHOOK_SECRET`. Restart dev server.

**Test card numbers:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Use any future date for expiry, any 3 digits for CVC

---

## 6. Toggling the Pro paywall

The upload feature can be opened to all users or restricted to Pro only.

**In Vercel → Environment Variables:**
- `NEXT_PUBLIC_PRO_REQUIRED=false` — everyone can upload (soft launch mode)
- `NEXT_PUBLIC_PRO_REQUIRED=true` — only Pro users can upload

After changing, do a manual redeploy:
**Vercel → Deployments → latest deploy → three dots → Redeploy**

---

## 7. Updating the retelling prompt

The retelling prompt is stored in `lib/prompts/retell.md`. Edit it directly — no code changes needed.

After editing:
```bash
git add .
git commit -m "update retelling prompt"
git push
```

Changes take effect immediately on next retelling request.

---

## 8. Key Supabase tables

| Table | Purpose |
|-------|---------|
| `books` | All books (user uploads + admin library) |
| `cards` | Saved vocabulary cards |
| `profiles` | User plan, usage stats |

### Making a book public
`books` table → find row → set `is_public = true`

### Resetting a stuck retelling
If a book shows `processing` status forever:
`books` table → find row → set `status = pending`, `progress = 0`
Then user can click "Create retelling" again.

---

## 9. Stripe CLI re-authentication

The Stripe CLI token expires after 90 days. To re-authenticate:
```bash
.\stripe.exe login
```
Then restart the webhook listener and update `STRIPE_WEBHOOK_SECRET` in `.env.local`.

