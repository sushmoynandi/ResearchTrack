# Agent Rules & Guidelines — ResearchTrack

## 🚨 MANDATORY WORKFLOW RULES

### 1. Git Commit & Push Permission Policy
- **ALWAYS ask for the USER'S EXPLICIT PERMISSION before executing any `git commit` or `git push` command.**
- **NEVER commit or push code automatically or without prior user confirmation.**
- When work is ready to be committed, present a clear summary of all modified/created files and the proposed commit message, and explicitly ask the user: *"Would you like me to commit and push these changes now?"*

---

## 🛠️ Project Technical Architecture

### Platform Stack
- **Framework**: Next.js 14+ (App Router) + TypeScript + React 18
- **Styling**: Tailwind CSS v4
- **ORM & Database**: Prisma ORM with Neon PostgreSQL Cloud Database
- **Auth**: JWT session tokens via `jose` + `httpOnly` secure cookies + client Bearer token fallback for webviews/Ship Studio.

### Multi-Tenant Data Scoping Rules
1. **Student Role**:
   - Sees own papers + papers assigned to them via supervisor assignments.
   - Sees only their own 1-on-1 meetings, milestones, and assigned tasks.
2. **Supervisor Role**:
   - Sees own papers + papers belonging to their assigned students.
   - Sees ONLY students explicitly assigned to them by an Administrator in `/admin/users` (`where: { supervisorId: user.id }`).
   - Can schedule meetings and assign reading tasks only to their assigned students.
3. **Administrator Role**:
   - Full system-wide visibility of all users, papers, rosters, and audit logs.

### Cross-Platform & Ship Studio Compatibility
- The client-side `AuthProvider` automatically injects `Authorization: Bearer <token>` on all `/api/` fetch requests to ensure 100% data sync in partitioned webviews, local preview iframes, and production environments.
