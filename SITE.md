# PaperTrack — AI & Machine Learning Research Paper Tracker

> Track reading workflows, extract ArXiv metadata in 1-click, organize benchmarks, model weights, structured literature reviews, and user accounts.

## Brand Identity
- **Personality**: Modern, high-precision, academic research-lab aesthetic
- **Colors**: Deep slate background (`#0d1117`), cyan/teal accents (`#06b6d4`), semantic status badges (emerald green, amber, sky blue)
- **Fonts**: Inter (display & body), JetBrains Mono (monospace identifiers, DOIs, parameters)

## Authentication & User Accounts
- **Login Options** (both available on `/login` and `/register`):
  - **Email & Password**: Salted bcrypt hashing, registration validation, real-time password strength meter, admin 2-step verification
  - **Continue with Google**: Secure Google OAuth 2.0 sign-in / sign-up. New Google users get an account created automatically; existing email accounts get Google linked to them so they can use either method.
  - **Complete-your-profile step** (`/welcome`): The first time someone signs up with Google, they're asked to pick their role (Student vs. Supervisor) plus institution and department — the same choices the manual form offers. Returning Google users skip this and go straight to the dashboard.
- **How Google Sign-In works** (for the curious):
  - `GET /api/auth/google` sends the user to Google's account chooser (with an anti-CSRF `state`)
  - `GET /api/auth/google/callback` exchanges the code server-side, **verifies Google's ID-token signature** with `jose`, then creates the session
  - Requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `.env` (see "How to Enable Google Sign-In" below)
- **Security**:
  - Encrypted JWT session cookies managed via `jose` and `httpOnly` secure cookies
  - Google ID tokens verified against Google's public keys; email must be verified
- **Multi-Tenant Data Isolation**:
  - Papers, collections, notes, and tags are strictly isolated per authenticated user in PostgreSQL via Prisma ORM

## Pages & Routes
- **Dashboard** (`/`) — Reading pipeline overview, live counters, recent papers, and collection shortcuts
- **Login** (`/login`) — Multi-type authentication hub with tabs for Email, OAuth, and 1-Click Guest Demo
- **Register** (`/register`) — Account creation with institution, role selection, and live password strength indicator
- **Profile & Settings** (`/profile`) — Manage researcher name, institution, role, avatar, and password changes
- **Research Library** (`/papers`) — Dual grid/list paper tracker with search, filters (status, priority, tags, starred), and sorting
- **Add New Paper** (`/papers/new`) — 1-click ArXiv/Semantic Scholar auto-importer, model architecture specs, benchmark matrix builder, and code/weight hub
- **Paper Detail** (`/papers/[id]`) — Full research overview, code/weights hub, benchmark scores, 3-minute digest, PDF viewer, citation generator, and notes timeline
- **Paper Edit** (`/papers/[id]/edit`) — Update metadata, specs, benchmarks, and tags
- **Collections** (`/collections`) — Group papers by project or research theme with custom color tags
- **Collection Detail** (`/collections/[id]`) — Filtered workspace for papers within a collection
- **Tags Management** (`/tags`) — Dynamic tag cloud and tag taxonomy manager
- **Import & Export** (`/import-export`) — Full JSON/CSV backup downloads, file upload parser, JSON direct paste, and 1-click AI sample paper seeder
- **Model Comparison** (`/compare`) — Side-by-side architecture & benchmark comparison with LaTeX table export
- **Research Radar** (`/radar`) — Real-time discovery feed from ArXiv and Hugging Face Daily Papers

## Database
- Powered by Prisma ORM with models: `User`, `Paper`, `Tag`, `Collection`, `Note`, plus lab/collaboration models (27 tables total).
- **Local development database**: a local PostgreSQL 16 database named `researchtrack` (set via `DATABASE_URL` in `.env`). All tables are created straight from `prisma/schema.prisma` using `npx prisma db push`, so the database always matches the project exactly — login/User and every other table stay in sync.
- **To rebuild/refresh the tables** after any schema change: `npx prisma db push`.
- **Going live later**: for a deployed site you'll swap `DATABASE_URL` for a hosted PostgreSQL (e.g. Neon) and run `npx prisma db push` once against it.

## How to Enable Google Sign-In
1. Go to https://console.cloud.google.com and create (or pick) a project.
2. Open **APIs & Services → OAuth consent screen**, set it up as **External**, and add your email as a test user.
3. Open **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**
   - **Authorized redirect URIs**: add `http://localhost:3000/api/auth/google/callback`
     (and later your live URL, e.g. `https://yoursite.com/api/auth/google/callback`)
4. Copy the **Client ID** and **Client secret** into `.env`:
   - `GOOGLE_CLIENT_ID="..."`
   - `GOOGLE_CLIENT_SECRET="..."`
5. Restart the app. The "Continue with Google" button will now work.

## Recent Changes
- 2026-08-21: Redesigned Login and Register with a two-column split layout — a branded panel on the left and the form on the right (like Facebook and other pro sites). On phones/tablets the left panel hides and only the form shows. Shared `components/auth/AuthSplitLayout.tsx` powers both pages; drop an image in `/public` and pass `imageSrc="/your-image.jpg"` to use a photo instead of the branded panel.
- 2026-08-21: Connected a real database. Created a local PostgreSQL `researchtrack` database and synced all 27 tables from the schema with `prisma db push`, fixing the "Something went wrong creating your account" error that was blocking both Google and email/password signup (the old `DATABASE_URL` was a placeholder).
- 2026-08-21: Added a "Complete your profile" step (`/welcome`) shown once to first-time Google users, so they can choose their role, institution, and department — matching the manual sign-up options.
- 2026-08-21: Added "Continue with Google" sign-in and sign-up on the Login and Register pages, alongside the existing email/password option. Built a secure Google OAuth 2.0 flow (`/api/auth/google` + callback) with server-side ID-token verification.
- 2026-08-19: Fixed the Vercel connection flow so team-owned projects link correctly during deployment.
- 2026-08-19: Fixed the existing-project list so connected Vercel projects appear correctly.
