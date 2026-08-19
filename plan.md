You are auditing and fixing a Next.js research paper tracker called "ResearchTrack" at the project root. The app has 3 roles: STUDENT, SUPERVISOR, ADMIN. The core problem is that many features only work from the Supervisor's perspective but are broken or invisible from the Student's view. Every feature must be bidirectionally synced.

## CODEBASE CONTEXT

Tech: Next.js 16 (App Router), Prisma + PostgreSQL, JWT auth (lib/session.ts → getCurrentUser()), Tailwind CSS.
Roles: SystemRole enum = STUDENT | SUPERVISOR | ADMIN.
Relationship: User.supervisorId → User (supervisor). A supervisor's students have supervisorId = supervisor.id.
Assignments: Assignment model links Paper ↔ Student with status PENDING/IN_PROGRESS/COMPLETED/OVERDUE, assigned by a Supervisor.

Key files:
- Prisma schema: prisma/schema.prisma
- Session: lib/session.ts (getCurrentUser returns { id, name, email, systemRole })
- Notifications helper: lib/notifications.ts (createNotification)
- Sidebar: components/layout/Sidebar.tsx

## CRITICAL BUGS TO FIX (audit each one, fix only if broken)

### 1. NOTES: Student & Supervisor Notes Are Isolated
**File**: app/api/papers/[id]/notes/route.ts
**Bug**: GET handler filters `where: { paperId: id, userId: user.id }` — each user only sees their own notes. Supervisor cannot see student highlights/notes, student cannot see supervisor "Faculty Guidance" notes.
**Fix**: When fetching notes for a paper, include notes from ALL users who have access to this paper (the owner, the assigned student, and the supervisor). Include the `user` relation (id, name, systemRole) in each note so the UI knows who wrote it. Keep write access as-is (each user creates notes under their own userId).

### 2. COLLECTIONS: Students Cannot Use Collections
**File**: app/api/collections/route.ts, app/api/collections/[id]/route.ts, app/api/collections/[id]/papers/route.ts
**Bug**: Collections are scoped to `userId: user.id` only. If a supervisor assigns a paper, the student cannot organize assigned papers into their own collections. Also, the student should be able to create their own collections.
**Fix**: Ensure students can create, read, update, and delete their own collections. When adding a paper to a collection, verify the student has access to the paper (owns it OR is assigned to it). No cross-user collection sharing needed — just let each role manage their own collections independently.

### 3. TAGS: Students Cannot Tag Assigned Papers  
**File**: app/api/tags/route.ts, app/api/tags/[id]/route.ts, app/papers/[id]/page.tsx (or edit page)
**Bug**: When a student tries to add tags to an assigned paper, the tag is created under the student's userId, but the paper update route (PUT /api/papers/[id]) uses `userId: existing.userId` for tag connectOrCreate — meaning tags are created under the paper OWNER's namespace, not the student's.
**Fix**: In the paper PUT handler, when an assigned student updates tags, use their own userId for tag creation, not the paper owner's userId. Both the student's and supervisor's tags should appear on the paper.

### 4. DASHBOARD: Student Dashboard Shows No Supervisor Context
**File**: app/page.tsx (dashboard)
**Bug**: The student dashboard likely shows only their own papers/stats. It should also show:
  - Pending assignments from supervisor (with due dates)
  - Recent supervisor feedback/notifications  
  - Their supervisor's name and contact
**Fix**: Read the dashboard page, check what data it fetches. For STUDENT users, also fetch pending assignments (GET /api/assignments), recent notifications, and supervisor info. Display an "Assigned by [Supervisor Name]" section with pending tasks and due dates.

### 5. ASSIGNMENTS PAGE: Student View Missing Status Update Buttons
**File**: app/assignments/page.tsx
**Bug**: Students should be able to update their assignment status (PENDING → IN_PROGRESS → COMPLETED) directly from the assignments page with 1-click buttons. Currently this page may only show assignments without action buttons for students.
**Fix**: For STUDENT role, add status transition buttons on each assignment card:
  - PENDING → "Start Reading" button (sets IN_PROGRESS)
  - IN_PROGRESS → "Mark Complete" button (sets COMPLETED)  
  Each click calls PUT /api/assignments with { id, status }. On COMPLETED, the supervisor gets a notification automatically (already implemented in the PUT handler).

### 6. PAPER DETAIL PAGE: Student Cannot See Supervisor Feedback
**File**: app/papers/[id]/page.tsx
**Bug**: The paper detail page fetches feedback but may not display it prominently for students. The Feedback model exists and the API works, but the student-facing UI may not show the supervisor's COMMENT/SUGGESTION/APPROVAL/REVISION_REQUEST feedback cards.
**Fix**: Ensure the paper detail page renders a "Supervisor Feedback" section visible to students showing all Feedback entries for this paper, with the author name, type badge, timestamp, and content. Also show the assignment status and due date if this paper has an assignment for the current student.

### 7. MEETINGS: Student Cannot See or Respond to Meetings
**File**: app/api/meetings/route.ts, app/meetings/page.tsx
**Bug**: The meetings route may filter to only `supervisorId: user.id`. Students should see meetings where `studentId: user.id`.
**Fix**: In the GET handler, for STUDENT role, filter meetings by `studentId: user.id`. For SUPERVISOR, filter by `supervisorId: user.id`. For ADMIN, show all. On the meetings page, students should be able to add their own `studentNotes` to a meeting via PUT.

### 8. MILESTONES: Student Cannot See or Update Milestones
**File**: app/api/milestones/route.ts, app/milestones/page.tsx
**Bug**: Milestones may only be visible/editable by supervisors. Students should see milestones where `studentId: user.id` and be able to:
  - View their milestones with status and due dates
  - Update status to SUBMITTED
  - Add deliverableUrl and deliverableNotes
**Fix**: In GET, for STUDENT filter by `studentId: user.id`. In PUT, allow students to update their own milestones (status to SUBMITTED, deliverableUrl, deliverableNotes) but NOT change dueDate or approve. When student submits, notify the supervisor.

### 9. PDF UPLOAD: Verify Student Can Upload PDFs to Assigned Papers
**File**: app/api/papers/[id]/pdf/route.ts
**Bug**: If this endpoint exists, verify it allows assigned students to upload PDFs (not just the paper owner). If it doesn't exist, create it.
**Fix**: The POST handler should accept a multipart form upload, save the file to /public/uploads/ with a unique name, update the paper's pdfPath field, and return the new path. Access: paper owner, assigned student, supervisor of owner, or admin.

### 10. READING TRACK: Student Progress Visible to Supervisor
**File**: components/reader/PdfReaderWorkspace.tsx, app/api/papers/[id]/route.ts
**Bug**: When a student updates reading progress (status: TO_READ → READING → COMPLETED) in the reader, verify the corresponding Assignment status syncs automatically AND the supervisor is notified.
**Fix**: This is already partially implemented in PUT /api/papers/[id] (lines ~199-231). Verify it works correctly — when status changes to READING, assignment goes to IN_PROGRESS; when COMPLETED, assignment goes to COMPLETED and supervisor gets notified.

### 11. SIDEBAR NAVIGATION: Student Should See All Relevant Pages  
**File**: components/layout/Sidebar.tsx
**Bug**: Currently "My Students" only shows for supervisors. Verify that students see: Dashboard, Research Labs, Paper Library, Collections, Reading Tracks, Tags, Assignments, Meetings, Milestones. All these should be in the sidebar for students.
**Fix**: Add "Milestones" nav item (href: '/milestones', icon: Milestone) to the non-admin nav items array if not already present. It should be visible to ALL roles, not just supervisors.

### 12. NOTIFICATIONS: Bidirectional Notification Flow
**File**: lib/notifications.ts, app/api/notifications/route.ts
**Bug**: Verify notifications fire in BOTH directions:
  - Supervisor assigns paper → Student gets ASSIGNMENT notification ✓
  - Student completes assignment → Supervisor gets STATUS_UPDATE notification ✓  
  - Supervisor posts feedback → Student gets FEEDBACK notification ✓
  - Student submits milestone → Supervisor gets notification (may be missing)
  - Student adds note/highlight → Supervisor gets notification (may be missing — this is low priority, skip if complex)
**Fix**: Add missing notification calls where needed. The createNotification helper already exists.

## EXECUTION INSTRUCTIONS

1. Read each file mentioned above BEFORE making changes.
2. For each bug, determine if it's actually broken or already fixed. Skip if already working.
3. Make minimal, targeted fixes. Don't refactor working code.
4. After all fixes, run: npx tsc --noEmit
5. Fix any TypeScript errors.
6. Commit: git add -A && git commit -m "fix: complete student↔supervisor bidirectional sync across all features" && git push origin master
7. Report what you fixed and what was already working.
