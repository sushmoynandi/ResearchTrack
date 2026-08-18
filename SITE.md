# PaperTrack — AI & Machine Learning Research Paper Tracker

> Track reading workflows, extract ArXiv metadata in 1-click, organize benchmarks, model weights, structured literature reviews, and user accounts.

## Brand Identity
- **Personality**: Modern, high-precision, academic research-lab aesthetic
- **Colors**: Deep slate background (`#0d1117`), cyan/teal accents (`#06b6d4`), semantic status badges (emerald green, amber, sky blue)
- **Fonts**: Inter (display & body), JetBrains Mono (monospace identifiers, DOIs, parameters)

## Authentication & User Accounts
- **Multiple Login Options**:
  - **Email & Password**: Salted bcrypt hashing, registration validation, real-time password strength meter
  - **Developer & AI OAuth (GitHub)**: Instant login for AI/ML engineers
  - **Academic & Social (Google & ORCID)**: Academic researcher sign-in
  - **1-Click Guest / Demo Sandbox**: Instant demo access pre-seeded with landmark AI papers (Attention Is All You Need, Llama 3 405B, Mamba SSM)
- **Security**:
  - Encrypted JWT session cookies managed via `jose` and `httpOnly` secure cookies
  - Next.js Edge Middleware route guarding for all protected pages
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
- Powered by Prisma ORM with models: `User`, `Paper`, `Tag`, `Collection`, `Note`.
