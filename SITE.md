# PaperTrack — AI & Machine Learning Research Paper Tracker

> Track reading workflows, extract ArXiv metadata in 1-click, organize benchmarks, model weights, structured literature reviews, and user accounts.

## Brand Identity
- **Personality**: Modern, high-precision, academic research-lab aesthetic
- **Colors**: Deep slate background (`#0d1117`), cyan/teal accents (`#06b6d4`), semantic status badges (emerald green, amber, sky blue)
- **Fonts**: Inter (display & body), JetBrains Mono (monospace identifiers, DOIs, parameters)

## Authentication & User Accounts
- **Login Options** (both available on `/login` and `/register`):
  - **Email & Password**: Salted bcrypt hashing, registration validation, real-time password strength meter, admin 2-step verification
  - **Continue with Google**: Secure Google OAuth 2.0 sign-in / sign-up, with a clear split between the two buttons:
    - **"Sign up with Google" on the Register page** creates the account.
    - **"Continue with Google" on the Login page only signs you in.** If no account uses that Google address yet, nothing is created — you're sent back to the Login page with a notice explaining you need to register first (with a link straight to the Register page).
    - **Registered manually first?** If you created your account with an email and password, signing in with Google using that same address links the two and logs you in. From then on either method works — your password keeps working too.
  - **Required profile step after sign-up** (`/welcome`): Both sign-up paths behave identically — finish the Register form or tap "Continue with Google" and you land on a one-time screen asking three things: *I am a…* (Student or Supervisor), *Institution / University*, and *Department*. All three are required and there is no way to skip. Until they are saved, every other page bounces back to this screen, so nobody can use the app with a half-empty profile. Once saved, the person goes to the page they were originally headed for. Details can be edited later on the Profile page.
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
- **Forgot password** (`/forgot-password`) — Emails a 6-digit code, then lets you set a new password
- **Complete your profile** (`/welcome`) — The required one-time step after sign-up: role, institution, and department
- **Role Requests** (`/admin/role-requests`) — Admin-only queue for approving or declining role change requests
- **Profile & Settings** (`/profile`) — Manage researcher name, institution, role, profile photo, and your password ("Add Password" for Google accounts that don't have one yet, "Change Password" once they do), plus a **Danger Zone** at the bottom for deleting the account
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
- Powered by Prisma ORM with models: `User`, `Paper`, `Tag`, `Collection`, `Note`, `RoleChangeRequest`, `PasswordResetOtp`, plus lab/collaboration models (29 tables total).
- **Local development database**: a local PostgreSQL 16 database named `researchtrack` (set via `DATABASE_URL` in `.env`). All tables are created straight from `prisma/schema.prisma` using `npx prisma db push`, so the database always matches the project exactly — login/User and every other table stay in sync.
- **To rebuild/refresh the tables** after any schema change: `npx prisma db push`.
- **Demo accounts** (created by `npm run seed`, password `password123` for all of them):
  - `student@researchtrack.edu` — Sophia Chen, a student researcher (starts with one sample paper)
  - `supervisor@researchtrack.edu` — Dr. Elena Rostova, a supervisor (Sophia's advisor)
  - `admin@researchtrack.edu` — Dean Administrator, an admin
  - The same three also exist on `@papertrack.edu` addresses.
- **Note**: `.env` is read once when the dev server starts. If you change `DATABASE_URL`, stop and restart the dev server, otherwise the site keeps using the old one.
- **Going live later**: for a deployed site you'll swap `DATABASE_URL` for a hosted PostgreSQL (e.g. Neon) and run `npx prisma db push` once against it.

## How to Send Real Emails (reset codes & admin 2-step codes)

Right now no email is actually sent, so the Forgot Password page **doesn't hand out
a code**. It says so plainly and offers **Continue with Google** instead — a reset
code is only worth anything if it lands in the account holder's inbox and nowhere
else, so it is never shown on screen or written to a log.

To send real emails, both the password reset code and the admin 2-step code go
through one Google Apps Script:

1. Go to https://script.google.com and start a **New project**.
2. Paste in a script that reads `e.postData.contents` (JSON with `email`, `name`,
   `code`, `subject`, `purpose`) and calls `MailApp.sendEmail(...)`.
3. **Deploy → New deployment → Web app**, set *Execute as* **Me** and
   *Who has access* **Anyone**, then copy the web app URL.
4. Put it in `.env`:
   ```
   APPSCRIPT_2FA_URL="https://script.google.com/macros/s/..../exec"
   ```
5. Restart the app. The "sign in with Google instead" message disappears on its
   own and codes start going to the inbox.

The `purpose` field is `"PASSWORD_RESET"` for reset codes and absent for 2-step
codes, so one script can style both differently.

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
- 2026-08-21: Cleared the 8 Tailwind warnings the editor showed on the Login/Register layout. Tailwind v4 renamed `bg-gradient-to-*` to `bg-linear-to-*`, and its spacing scale now covers sizes that used to need hand-written pixel values (`w-[420px]` → `w-105`). Same look, current names — the four other `bg-gradient-to-*` spots elsewhere in the app were renamed too.
- 2026-08-21: Fixed three style classes that were used all over the site but never actually defined, so they silently did nothing: `shadow-glow` (the glow around the logo and avatars — used in 7 files), `animate-spin-slow` (the slowly turning atom logo — 6 files), and `font-display` (the heading font — 41 files, its variable pointed at itself). The logo now really glows and turns; headings keep the same look they had, but the font can now be swapped for a proper display typeface in one line if you want one.
- 2026-08-21: Forgot Password never shows a reset code on screen, and never writes one to a log. When email can't be sent, no code is created at all — the page explains why and offers **Continue with Google**, then points you to Profile → Add Password so you can set one you'll remember. Showing the code would have handed a password reset to whoever was looking at the screen, which is exactly what the code exists to prevent.
- 2026-08-21: Added **Forgot password**. There's a "Forgot password?" link next to the password box on the Login page; it asks for your email, sends a 6-digit code, and lets you set a new password — then signs you straight in. The code lasts 15 minutes, dies after 5 wrong guesses, and only one can be sent per minute per address. The page never says whether an email has an account, so it can't be used to find out who's registered. It works for Google accounts too: it simply gives you a password you didn't have, so afterwards either way of signing in works.
- 2026-08-21: Reset codes go out through the same Google Apps Script mailer the admin 2-step codes use (`APPSCRIPT_2FA_URL` in `.env`). While that isn't set, the code is printed in the dev-server terminal instead, so the whole flow still works locally.
- 2026-08-21: The profile picture in the top bar now glows in your role's colour — **blue** for a Student Researcher, **green** for a Supervisor, **amber** for an Administrator — so you can tell at a glance who you're signed in as. Hovering brightens it, and the same coloured ring is used on the avatars in the admin Role Requests queue.
- 2026-08-21: You now set your own frame when adding a profile photo. Picking a picture opens a window with a square frame over it — drag the picture to move it, use the slider to zoom in, and whatever fills the frame is what gets saved. A reset button puts it back to the middle. Before this it just took a blind centre crop.
- 2026-08-21: Tightened the Account Role card on the Profile page. Since there are only two roles, the dropdown is gone — it now simply says "Request to become **Supervisor**" with the role highlighted. Saying **why** is now required (an admin needs something to go on), the whole card is more compact, and the Withdraw request button has a visible background instead of blending into the panel.
- 2026-08-21: Added **role change requests**. On the Profile page there's now an "Account Role" card where someone can ask to switch between Student Researcher and Supervisor, with an optional reason. Nobody changes their own role — the request goes to a new admin-only page (**Role Requests** in the admin sidebar) where every administrator gets a notification and can approve or decline it with a note. Approving switches the role immediately, tells the person, and records it in the Audit Trail. The change takes effect on their very next page load — no signing out and back in.
- 2026-08-21: You can now set a profile photo. Hover the picture at the top of the Profile page and click it to pick one; the small × in the corner removes it. The photo is saved as a 256px square straight from your browser, so even a big phone photo stays small.
- 2026-08-21: The badge next to your name on the Profile page now says what you are — **Student Researcher**, **Supervisor** or **Administrator** — instead of how you signed up ("CREDENTIALS" / "GOOGLE"), which meant nothing to anyone reading it.
- 2026-08-21: Gave the password boxes on the Profile page the same treatment as the sign-up form — an eye button inside each box to reveal what you typed, a weak → strong strength bar under the new password, and a live "Passwords don't match" check that keeps the button switched off until they agree. The strength bar is now one shared piece used by both the Profile page and the Register form, so it looks and scores identically in both places.
- 2026-08-21: The Profile page now says **Add Password** instead of Change Password when you signed up with Google and have no password yet. It skips the "Current Password" box (there's nothing to confirm) and explains that adding one lets you sign in either way — with Google, or with your email and password. Once saved it flips back to the normal Change Password form, which asks for the current one.
- 2026-08-21: Split what the two Google buttons do. "Continue with Google" on the Login page no longer creates accounts — an unknown Google address now gets a clear notice on the Login page pointing to Register instead of quietly making an account. "Sign up with Google" on the Register page still creates one. And if you registered manually with an email and password, signing in with Google on that same address links the two, so both ways of signing in work from then on. Google errors now also send you back to whichever page you started from, instead of always the Login page.
- 2026-08-21: Added **Delete Account** at the bottom of the Profile page, in a red "Danger Zone" box. Clicking it opens a confirmation window that lists what will be removed and asks you to type **DELETE** before the button turns on — so it can't happen by accident. Deleting clears your papers, notes, tags, collections, assignments and lab memberships, then signs you out. If you're the lead of a lab, it stops and asks you to hand the lab over first, so nobody else's work disappears with you.
- 2026-08-21: Fixed the profile step showing the app's sidebar and header around it — `/welcome` now renders on its own like the Login and Register pages, so there's nothing to click away to before it's filled in.
- 2026-08-21: Added `suppressHydrationWarning` to the page `<body>`. Browser extensions (password managers, grammar checkers, dark-mode tools) add their own attributes to the page before it loads, which made the dev server report a false error in `app/layout.tsx`.
- 2026-08-21: Made the profile step required again. After signing up — with Google or with email/password — everyone now has to pick their role, institution, and department on `/welcome` before they can open any other page; a new `proxy.ts` gate redirects them back there until it's filled in. The Register form itself stays short (name, email, password, confirm password).
- 2026-08-21: Renamed `middleware.ts` to `proxy.ts` (Next.js 16 renamed this file), which also clears the deprecation warning that showed on every dev-server start.
- 2026-08-21: Set up the local PostgreSQL database (`researchtrack`) to match the project schema and filled it with the demo student / supervisor / admin accounts plus a sample paper, so sign-in works locally out of the box.
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
