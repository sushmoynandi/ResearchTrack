# 🏛️ ResearchTrack — Academic Research Lab & Paper Management Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)

**ResearchTrack** is an academic research laboratory and literature management platform designed for university labs, faculty advisors, and student researchers. It centralizes literature reviews, isolated student paper syntheses, multi-scope paper assignments (individual, lab-wide, and sub-group-wise), onboarding starter packs, journal clubs, and sync meetings into a unified, privacy-aware workspace.

---

## 🌟 Key Features

### 🏢 1. Academic Research Labs & Sub-Group Management
* **Lab Workspaces**: Create or join research laboratories with secure join codes and member approval workflows.
* **Sub-Group Clusters**: Organize lab members into specialized project teams (e.g. *Foundations*, *Mechanistic Interpretability*, *Agentic Systems*).
* **Lab Broadcasts & Noticeboard**: Pinned deadlines, priority announcements, and lab-wide updates.
* **Starter Packs**: Curated foundational reading lists for onboarding new lab members with automated progress tracking.
* **Journal Club Seminars**: Schedule paper presentations with slide decks, designated discussants, and structured agendas.
* **Lab Meetings & Syncs**: Schedule video meetings with countdown badges and Google Meet / Zoom links.

### 📋 2. Multi-Scope Paper Assignments & Mentorship
* **Multi-Target Assignment Engine**:
  * 🎓 **Individual Student**: Assign targeted papers to specific advisees.
  * 🏛️ **Whole Research Lab**: Bulk-assign landmark papers to all student researchers in a laboratory in 1 click.
  * 👥 **Sub-Group Cluster**: Bulk-assign domain-specific papers to specialized project teams in 1 click.
* **Real-Time Student Notifications**: Automatically notifies assigned researchers with direct links to their reading queue.
* **Context-Aware Attribution Badges**:
  * **Supervisors** see: `"Assigned to [Student Name]"` with individual status badges (`COMPLETED`, `IN_PROGRESS`, `PENDING`).
  * **Students** see: `"Assigned by [Faculty Advisor Name]"` with 1-click status changers (`[To Read]`, `[Reading]`, `[Completed]`).

### ✍️ 3. Isolated Multi-Student Synthesis & Comparative Review
* **Strict Student Workspace Isolation**: When multiple students are assigned the same paper, each student writes and submits their own independent Q1–Q9 literature review questionnaire without data leakage or master paper overwrites.
* **Supervisor Comparative Tabs**: Supervisors can toggle between student tabs with 1 click to review and compare individual student notes, insights, and answers side-by-side.
* **Deep-Link Navigation**: Clicking any student's assigned paper from the **My Students** hub (`/students`) automatically deep-links directly into that student's review tab (`/papers/[id]?studentId=<id>`).

### 📚 4. Paper Library, Survey Matrix & In-App Reader
* **Interactive Literature Review Matrix**: Compare problem formulation, methodology, datasets, benchmarks, and limitations side-by-side.
* **In-App PDF Reader**: Read papers directly inside the browser with distraction-free layout.
* **Citation Graph & Connected Literature**: Visual citation network mapping foundational works, derivative papers, and research lineage.
* **AI Research Assistant**: Context-aware paper chat answering queries based on title, abstract, and annotations.
* **Faculty Evaluation Rubric**: Standardized multi-criteria evaluation scorecards (Novelty, Rigor, Reproducibility, Significance).
* **Export Center**: 1-click LaTeX Survey Matrix tables, BibTeX citation records, and CSV exports.

### 👥 5. My Students Hub (Faculty Supervision)
* **Student Activity Stream**: Live feed showing recent student paper reviews (`Q1–Q9 ✓`), questions, feedback, and deliverables.
* **Reading Progress & Completion Rates**: Visual progress indicators tracking total assigned papers vs. completed reading reviews.
* **1-on-1 Mentorship Scheduler**: Schedule advisory sessions with shared collaborative agendas and action items.

### 🛡️ 6. Role-Based Access Control (RBAC) & Governance
* **3 Native System Roles**: `STUDENT`, `SUPERVISOR`, and `ADMIN`.
* **Administrative Console**: Manage user roles, affiliations, account status, and inspect immutable audit logs.
* **Clean Navigation**: Each role receives a tailored sidebar without extraneous or restricted tools.

---

## 🏗️ Tech Stack

* **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
* **UI & Core**: [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
* **ORM & Database**: [Prisma ORM](https://www.prisma.io/) with [PostgreSQL](https://www.postgresql.org/) (Compatible with [Neon](https://neon.tech/), [Supabase](https://supabase.com/), [Railway](https://railway.app/))
* **Authentication**: Stateless encrypted JWT sessions with `jose` and `bcryptjs` password hashing.
* **Data Visualizations**: Custom canvas-based citation graph and reading velocity heatmaps.

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (or copy from `.env.example`):
```env
# PostgreSQL connection string (Local or Cloud e.g., Neon / Supabase)
DATABASE_URL="postgresql://user:password@hostname:5432/researchtrack?sslmode=require"

# JWT Secret Key (Used for secure session token signing)
JWT_SECRET="your-secure-jwt-secret-at-least-32-characters"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Initialize Database Tables
Push the Prisma schema to your PostgreSQL database:
```bash
npx prisma db push
```

### 4. Seed Pre-Configured Demo Accounts & AI Papers
```bash
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Pre-Seeded Demo Accounts

All demo accounts use password: `password123`

| Role | Email | Name | Access Level |
|---|---|---|---|
| 🎓 **Student** | `student@researchtrack.edu` | Sophia Chen | Assigned to Stanford Scalable AI sub-cluster; personal paper library, assignments & tracks |
| 🔬 **Supervisor** | `supervisor@researchtrack.edu` | Dr. Elena Rostova | Lab Principal Investigator; assigns papers, schedules meetings, manages groups |
| 🛡️ **Admin** | `admin@researchtrack.edu` | Dean Admin | Institutional user management, role provisioning, and audit trail |

*(1-Click quick login buttons for Student and Supervisor are available on the Login page).*

---

## 📁 Project Directory Structure

```
├── app/
│   ├── (auth)/login & register/   # Authentication views
│   ├── admin/                     # Admin User Management & Audit Trail
│   ├── api/                       # REST API routes (auth, labs, papers, assignments)
│   ├── assignments/               # Supervisory assignment board
│   ├── collections/               # Curated paper collections
│   ├── labs/                      # Research Labs & Sub-Group Workspaces
│   ├── meetings/                  # 1-on-1 Mentorship meeting board
│   ├── papers/                    # Paper library, reader, matrix, presenter
│   ├── profile/                   # Researcher settings & profile
│   ├── students/                  # Supervisor student overview & velocity
│   └── tracks/                    # Structured reading pathways
├── components/
│   ├── analytics/                 # Velocity and activity widgets
│   ├── auth/                      # AuthProvider, UserMenu, login modals
│   ├── citations/                 # Citation export & modal
│   ├── collections/               # Collection cards and survey matrices
│   ├── labs/                      # Lab modals, meeting boards, starter packs
│   ├── layout/                    # Responsive sidebar, header, spotlight search
│   ├── notes/                     # Markdown notes and synthesis editor
│   ├── papers/                    # Paper cards, PDF viewer, AI assistant, graph
│   └── ui/                        # Button, Badge, Modal, Input, Toast primitives
├── lib/
│   ├── auth.ts                    # JWT tokens & bcrypt utilities
│   ├── prisma.ts                  # Database client singleton
│   ├── session.ts                 # Server-side user session resolver
│   └── types.ts                   # TypeScript interfaces & domain models
└── prisma/
    ├── schema.prisma              # Complete database schema
    └── seed.js                    # Database seeder with benchmark AI papers
```

---

## ☁️ Deployment (Vercel + Neon Cloud Database)

1. Push your repository to **GitHub** or **GitLab**.
2. Import the project into **[Vercel](https://vercel.com/new)**.
3. In **Project Settings $\rightarrow$ Environment Variables**, configure:
   * `DATABASE_URL` — Your Neon/Supabase PostgreSQL connection string.
   * `JWT_SECRET` — A secure random string for JWT signing.
4. Click **Deploy**. Vercel will automatically run `prisma generate` and build the production bundle.
5. Seed initial data if needed by running:
   ```bash
   node prisma/seed.js
   ```

---

## 📄 License
This project is licensed under the MIT License.
