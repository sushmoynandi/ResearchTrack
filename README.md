# 🏛️ ResearchTrack — Academic Research Lab & Paper Management Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)

**ResearchTrack** is an enterprise-grade academic research management platform designed for university labs, faculty advisors, and student researchers. It centralizes literature reviews, paper annotations, sub-group isolation, starter packs, journal clubs, supervisory assignments, and sync meetings into a unified, privacy-aware workspace.

---

## 🌟 Key Features

### 🏢 1. Academic Research Labs & Sub-Group Isolation
* **Lab Workspaces**: Create or join research laboratories with secure join codes.
* **Sub-Group Privacy**: Students only see activity, meetings, journal clubs, and starter packs for their assigned project clusters.
* **Lab Noticeboards & Broadcasts**: Pinned deadlines and lab-wide priority announcements.
* **Starter Packs**: Curated essential reading lists for onboarding new lab members with enrollment tracking.
* **Journal Club Seminars**: Schedule and present paper seminars with slides, designated presenters, and agenda notes.
* **Lab-Wide & Sub-Group Sync Meetings**: Schedule video syncs with countdown badges and Google Meet / Zoom links.

### 📚 2. Paper Library, Matrix & In-App Reader
* **Interactive Literature Review Matrix**: Compare methodology, datasets, benchmarks, limitations, and key findings side-by-side.
* **In-App PDF Reader**: Read papers directly inside the browser with distraction-free layout.
* **Citation Graph & Connected Literature**: Visual citation network mapping foundation papers, derivative works, and related lineage.
* **AI Research Assistant**: Context-aware paper chat answering queries based on title, abstract, and annotations.
* **Faculty Evaluation Rubric**: Standardized multi-criteria evaluation scorecards (Novelty, Rigor, Reproducibility, Significance).
* **Export Center**: 1-click LaTeX Survey Matrix tables, BibTeX citation records, and CSV exports.

### 🧭 3. Reading Tracks & Lineage
* **Structured Curriculums**: Multi-week reading pathways (e.g. *Foundations of LLMs*, *State Space Models & Mamba*, *Diffusion Models*).
* **Linear Paper Progression**: Track status across foundational, intermediate, and advanced literature.

### 📋 4. Supervisory Mentorship & Assignments
* **Direct Paper Assignments**: Supervisors can assign specific papers to individual students or entire sub-groups with deadlines.
* **Reading Velocity Monitoring**: Real-time progress metrics tracking reading pace, notes volume, and completion rates.
* **1-on-1 Meetings Scheduler**: Schedule advisory sessions with shared collaborative agendas and action items.

### 🛡️ 5. Role-Based Access Control (RBAC) & Governance
* **3 Native System Roles**: `STUDENT`, `SUPERVISOR`, and `ADMIN`.
* **Administrative Console**: Manage user roles, affiliations, account status, and inspect immutable audit logs.
* **Admin-Specific Clean Navigation**: Admins see dedicated governance tools without researcher library clutter.

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
