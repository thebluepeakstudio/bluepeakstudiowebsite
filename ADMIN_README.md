# BluePeak Studio — Admin Panel

Production-ready admin dashboard for managing projects, expenses, freelancers, documents, P&L analytics, and public form submissions.

## URLs

| Page | URL |
|------|-----|
| Login | `/admin-panel/login` |
| Dashboard | `/admin-panel/dashboard` |
| Leads | `/admin-panel/leads` |
| Clients | `/admin-panel/clients` |
| Projects | `/admin-panel/projects` |
| Expenses | `/admin-panel/expenses` |
| Freelancers | `/admin-panel/freelancers` |
| P&L | `/admin-panel/pl` |
| Contacts | `/admin-panel/contacts` |
| Search | `/admin-panel/search` |

The admin panel is **not linked** from the public website navigation. Access it via direct URL only.

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- [Cloudinary](https://cloudinary.com) account (free tier works)

## Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env with your values
npm install
npm run seed:admin
npm run dev
```

### Environment variables (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `10000`) |
| `MONGO_URL` | MongoDB connection string |
| `JWT_SECRET` | Strong secret for JWT signing |
| `JWT_EXPIRES_IN` | Token expiry (default `24h`; e.g. `12h`, `1d`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `ADMIN_SEED_EMAIL` | First admin email |
| `ADMIN_SEED_PASSWORD` | First admin password (min 6 chars) |

## Frontend setup

```bash
cd frontend
# Create .env with:
# VITE_BACKEND_URL=http://localhost:10000
npm install
npm run dev
```

Open [http://localhost:5173/admin-panel/login](http://localhost:5173/admin-panel/login) and sign in with your seeded admin credentials.

## API overview

All admin endpoints are under `/api/admin` and require `Authorization: Bearer <token>` except login.

| Module | Base path |
|--------|-----------|
| Auth | `/api/admin/auth` |
| Projects | `/api/admin/projects` |
| Documents | `/api/admin/projects/:id/documents` |
| Expenses | `/api/admin/expenses` |
| Freelancers | `/api/admin/freelancers` |
| Analytics | `/api/admin/analytics` |
| Contacts | `/api/admin/contacts` (website form inbox — not CRM) |
| Clients | `/api/admin/clients` |
| Leads | `/api/admin/leads` |

Public site APIs (`POST /api/contact`, `POST /api/testimonial`) are unchanged.

### Clients vs Leads vs Contacts

- **Leads** — pre-sale pipeline (table + Kanban, activities, follow-ups, conversion).
- **Clients** — post-conversion system of record; projects link via `clientId`.
- **Contacts** — inbound messages from the public website contact form only.

After deploying the Clients module, run once: `npm run migrate:clients` (from `backend/`) to attach existing projects to client records.

## Production deployment

1. Set all backend env vars on your host (Render, Railway, etc.).
2. Run `npm run seed:admin` once to create the admin user.
3. Set `VITE_BACKEND_URL` to your deployed API URL before `npm run build`.
4. CORS already allows `https://bluepeakstudio.in` and your Render frontend URL.
5. Ensure MongoDB and Cloudinary credentials are set in production.

## Security

Before deploying, read the [Security — rotate secrets in git history](./README.md#security--rotate-secrets-in-git-history) section in the root README. Rotate any credentials that were ever committed to git, even as placeholders.

## Notes

- **Homepage testimonials** use hardcoded content on the public site. The public `/testimonial` form still saves to MongoDB but is not managed in the admin panel.
- **File storage** uses Cloudinary; uploaded files are not stored on the server disk.
- **Revenue in analytics** uses `advanceReceived` (cash-basis) from projects.

## Project structure

```
backend/
  models/          Admin, Project, Client, Lead, Expense, Freelancer, Document
  controllers/admin/
  routes/admin/
  middleware/

frontend/src/admin/
  api/             Axios client + API modules
  components/      Layout, UI, Charts
  pages/           All admin screens
  context/         AuthContext
```
