# BluePeak Studio Website

Monorepo for the public marketing site, CRM admin panel, and Node.js API.

## Structure

| Directory | Purpose |
|-----------|---------|
| `frontend/` | Vite + React public site and admin panel (`/admin-panel`) |
| `backend/` | Express API, MongoDB, Cloudinary uploads |

See [ADMIN_README.md](./ADMIN_README.md) for admin setup, API overview, and deployment steps.

## Environment variables

Copy the example files and fill in real values locally — never commit `.env` files.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Backend (`backend/.env`)

| Variable | Required | Client-safe? | Notes |
|----------|----------|--------------|-------|
| `MONGO_URL` | Yes | No | MongoDB connection string |
| `JWT_SECRET` | Yes | No | JWT signing secret — server only |
| `JWT_EXPIRES_IN` | No | No | Token TTL (default `24h`) |
| `CLOUDINARY_CLOUD_NAME` | Yes* | No | Required for file uploads |
| `CLOUDINARY_API_KEY` | Yes* | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes* | No | Cloudinary API secret — server only |
| `ADMIN_SEED_EMAIL` | Yes** | No | Bootstrap admin email |
| `ADMIN_SEED_PASSWORD` | Yes** | No | Bootstrap admin password — server only |
| `ADMIN_SEED_NAME` | No | No | Display name for bootstrap admin |
| `ADMIN_SEED_RESET` | No | No | Set `true` once to sync admin password on deploy |
| `BILLING_JOB_SECRET` | Yes*** | No | Protects `POST /api/admin/jobs/billing-cycle` |
| `SITE_URL` | No | Yes | Public site URL for sitemap/RSS |
| `CORS_EXTRA_ORIGINS` | No | Yes | Comma-separated extra CORS origins |
| `PORT` | No | Yes | Server port (default `10000`) |
| `NODE_ENV` | No | No | Set `production` in prod — enables Secure httpOnly auth cookies |

\* Required for admin file uploads (documents, receipts, blog images).  
\** Required on first deploy to create the admin user.  
\*** Required in production so the billing cron endpoint cannot be called without auth.

### Auth cookies

Admin sessions use an **httpOnly cookie** (`bps_admin_token`), not localStorage. The frontend axios client sends `withCredentials: true`. In production, set `NODE_ENV=production` on the backend so cookies use `Secure` + `SameSite=None` (required for CRM at `crm.bluepeakstudio.in` calling a separate API host).

### Cloudinary security

CRM uploads (clients, leads, receipts, project documents) are stored as **authenticated** Cloudinary assets — not publicly accessible via direct URL. Delivery is proxied through authenticated admin API routes. Blog images remain public under `bluepeak/blog/`.

**Cloudinary dashboard checklist:**
- Restrict API key permissions to upload/delivery only
- Limit console access to trusted team members
- Enable “Strict Transformations” if not already on
- Do not expose API secret client-side

### Frontend (`frontend/.env`)

These use the `VITE_` prefix and are **embedded in the browser bundle** at build time. Only public-safe values belong here.

| Variable | Required | Client-safe? | Notes |
|----------|----------|--------------|-------|
| `VITE_BACKEND_URL` | Yes (prod) | Yes | Backend origin only — no `/api` suffix |
| `VITE_SITE_URL` | No | Yes | Canonical URL for SEO metadata |

**Not used in this project:** Supabase, Stripe, OpenAI, SendGrid, Twilio, Firebase, or AWS SDK credentials. If you add them later, keep secret keys server-side only — never prefix them with `VITE_` or `NEXT_PUBLIC_`.

## Security — rotate secrets in git history

This repository previously committed placeholder credentials in `backend/.env.example` (e.g. `ADMIN_SEED_PASSWORD=admin123`). Even after removal, **old values remain in git history**.

**Before deploying to production, rotate every secret that was ever hardcoded or committed:**

1. **MongoDB Atlas** — change the database user password and update `MONGO_URL`.
2. **JWT** — generate a new `JWT_SECRET` (invalidates all existing admin sessions).
3. **Cloudinary** — rotate API key/secret in the Cloudinary dashboard.
4. **Admin account** — set a strong `ADMIN_SEED_PASSWORD`, run with `ADMIN_SEED_RESET=true` once, then set it back to `false`.
5. **Billing job** — set a strong random `BILLING_JOB_SECRET` and configure your cron to send it as `x-billing-job-secret`.

If real production credentials were ever committed (not just placeholders), treat them as compromised: rotate immediately and consider using [GitHub secret scanning](https://docs.github.com/en/code-security/secret-scanning) or `git filter-repo` to purge history.

## Quick start

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Admin login: [http://localhost:5173/admin-panel/login](http://localhost:5173/admin-panel/login)
