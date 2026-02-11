## Visitor kiosk webapp

This is a minimalist visitor check-in kiosk inspired by WeWork guest entry flows. It is built with Next.js (App Router), Prisma, and Railway Postgres, with Railway Buckets for photo storage and a simple admin dashboard.

### Key routes

- **Kiosk flow**: `/kiosk` – full-screen, multi-step visitor check-in.
- **Admin dashboard**: `/admin` – password-protected management of visit reasons and a list of recent visits.
- **Landing**: `/` – small entry page linking to the kiosk and admin.

### Data & backend

- **Database**: Railway Postgres (via Prisma).
- **Core tables**: `Visit`, `VisitReason`, `CrmSyncEvent`, `LumaEvent`.
- **Photo Storage**: Railway Buckets (S3-compatible) with presigned URLs.
- **APIs**:
  - `POST /api/visits` – create a new visit (called from the kiosk).
  - `GET /api/visit-reasons` – public list of active visit reasons.
  - `GET/POST/PATCH /api/admin/visit-reasons` – admin management of reasons.
  - `GET /api/admin/visits` – recent visits for the dashboard.
  - `POST /api/admin/login` – simple password-based admin login.

### Environment variables

Copy `.env.example` to `.env` and set values:

```bash
# Railway Postgres (get from Railway Postgres plugin)
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"

# Admin auth
ADMIN_PASSWORD="set-a-strong-admin-password"
ADMIN_SESSION_SECRET="set-a-long-random-session-secret"

# Railway Buckets (use Variable Reference from Bucket service Credentials tab)
# Use BUCKET for the S3 API (globally unique name), not the display name.
BUCKET="your-bucket-unique-name"
ENDPOINT="https://storage.railway.app"
REGION="auto"
ACCESS_KEY_ID="from-railway-bucket-credentials"
SECRET_ACCESS_KEY="from-railway-bucket-credentials"

# CRM integration (noop for now)
CRM_PROVIDER="NONE"
```

### Local development

```bash
npm install

# run Prisma migrations (after defining your DB)
npx prisma migrate dev --name init

# start dev server
npm run dev
```

Open `http://localhost:3000/kiosk` for the kiosk and `http://localhost:3000/admin` for the dashboard.

### Deploying to Railway

1. **Create Railway project** and add:
   - A **Postgres** service for the database.
   - A **Bucket** service for photo storage.
   - A **Web** service pointing at this repository.

2. **Configure the web service**:
   - Set the **root directory** to `door-entry-webapp` so Railway uses this app's `package.json`.
   - **Build command**: `npm run build`
   - **Start command**: `npm run start`
   - **Node version**: 20.x (or latest LTS)

3. **Set environment variables** on the web service:
   - `DATABASE_URL` – use the value provided by the Railway Postgres plugin.
   - `ADMIN_PASSWORD` – a strong shared admin password.
   - `ADMIN_SESSION_SECRET` – a long random string for signing admin session tokens.
   - `BUCKET` – use the value from Railway Bucket **Credentials** tab (S3 API bucket name, e.g. `my-bucket-abc123`). Do not use the display name.
   - `ENDPOINT` – `https://storage.railway.app` (or from Credentials).
   - `REGION` – `auto` (or from Credentials).
   - `ACCESS_KEY_ID` and `SECRET_ACCESS_KEY` – from Railway Bucket Credentials tab.
   - `CRM_PROVIDER` – keep as `NONE` for now.

4. **Run migrations** on deploy:
   - Railway will automatically run `npx prisma migrate deploy` if you have it configured, or run it manually in a deploy hook.

5. **Deploy and test**:
   - Railway will build and deploy your application.
   - Open `https://your-railway-domain/kiosk` on the device acting as the kiosk.
   - Open `https://your-railway-domain/admin` for the admin dashboard.

For a better kiosk experience, add the `/kiosk` URL to the home screen and enable full-screen or guided-access mode on the device.
