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
  - **Straight to the dashboard after sign-up**: Both sign-up paths behave identically — finish the Register form or tap "Continue with Google" and you land on the main dashboard (`/`) right away. No extra profile step. Everyone starts as a Student Researcher; role, institution, and department are optional and can be filled in any time on the Profile page.
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
- **Register** (`/register`) — Account creation with name, email, password + confirm password, and a live password strength indicator
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
- 2026-08-21: Rebalanced the Login and Register layout for a cleaner, more professional look — the branding panel is wider (62% / 38% split) with a bigger headline and wider text column, and the form column is narrower and tighter so the two sides sit level with each other and leave about the same margin on both edges of the screen.
- 2026-08-21: Tightened the left branding panel on Login and Register. The logo, headline and feature list used to be pushed to the very top and bottom of the screen with big empty gaps in between — now they sit together as one vertically centred block, and the text column is wider (it gets wider still on large monitors) so lines don't wrap so early.
- 2026-08-21: Moved the show/hide password eye **inside** the password box on both Login and Register (it used to be a small "Show" link above the box). On Register the Password and Confirm Password boxes each have their own eye, so you can reveal one without revealing the other.
- 2026-08-21: Removed the extra "Complete your profile" step (`/welcome`) entirely. Signing up with email/password or with Google now goes straight to the main dashboard, exactly the same way. The "I am a…", "Institution / University" and "Department" questions are gone from sign-up — people fill those in later on the Profile page if they want to.
- 2026-08-21: Simplified the Register form to name + email + password + confirm password, and added a live "passwords don't match" check. Role, institution, and department were removed from the form — after sign-up everyone (Google and email/password alike) now lands on the shared `/welcome` step to choose them, so both paths feel identical. Widened the left branding panel to 58% and removed the divider line down the middle of the auth pages.
- 2026-08-21: Redesigned Login and Register with a two-column split layout — a branded panel on the left and the form on the right (like Facebook and other pro sites). On phones/tablets the left panel hides and only the form shows. Shared `components/auth/AuthSplitLayout.tsx` powers both pages; drop an image in `/public` and pass `imageSrc="/your-image.jpg"` to use a photo instead of the branded panel.
- 2026-08-21: Connected a real database. Created a local PostgreSQL `researchtrack` database and synced all 27 tables from the schema with `prisma db push`, fixing the "Something went wrong creating your account" error that was blocking both Google and email/password signup (the old `DATABASE_URL` was a placeholder).
- 2026-08-21: Added a "Complete your profile" step (`/welcome`) shown once to first-time Google users, so they can choose their role, institution, and department — matching the manual sign-up options.
- 2026-08-21: Added "Continue with Google" sign-in and sign-up on the Login and Register pages, alongside the existing email/password option. Built a secure Google OAuth 2.0 flow (`/api/auth/google` + callback) with server-side ID-token verification.
- 2026-08-19: Fixed the Vercel connection flow so team-owned projects link correctly during deployment.
- 2026-08-19: Fixed the existing-project list so connected Vercel projects appear correctly.
