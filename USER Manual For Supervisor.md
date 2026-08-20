# 👨‍🏫 ResearchTrack — Supervisor & Faculty User Manual

> **Welcome, Supervisors & Principal Investigators!**  
> This manual provides instructions for managing your academic research lab, supervising student researchers, assigning reading lists, evaluating literature reviews with faculty rubrics, tracking thesis milestones, and hosting 1-on-1 mentorship meetings.

---

## 📑 Table of Contents
1. [Account Setup & Supervisor Role](#1-account-setup--supervisor-role)
2. [Creating & Configuring Your Research Lab](#2-creating--configuring-your-research-lab)
3. [Student Management & Lab Join Requests](#3-student-management--lab-join-requests)
4. [Assigning Papers & Curating Reading Starter Packs](#4-assigning-papers--curating-reading-starter-packs)
5. [Faculty Review Rubrics & Grading Submissions](#5-faculty-review-rubrics--grading-submissions)
6. [Thesis Milestones & Deliverable Approvals](#6-thesis-milestones--deliverable-approvals)
7. [Scheduling & Managing 1-on-1 Meetings](#7-scheduling--managing-1-on-1-meetings)
8. [Lab Notices, Conference Countdowns & Tasks](#8-lab-notices-conference-countdowns--tasks)
9. [Exporting Matrices & LaTeX Survey Tables](#9-exporting-matrices--latex-survey-tables)
10. [Supervisor Best Practices](#10-supervisor-best-practices)

---

## 1. Account Setup & Supervisor Role

### Registration & Login
1. Navigate to the registration page (`/register`).
2. Fill in your **Name**, **Academic Email**, and **Password**.
3. Set your **Role** to **Supervisor / Faculty / Principal Investigator**.
4. Enter your **Institution** and **Department**.
5. Once logged in, your account is granted supervisor privileges across the platform (access to `/students`, `/assignments`, `/meetings`, `/milestones`, and `/labs`).

---

## 2. Creating & Configuring Your Research Lab

To build a collaborative hub for all your students and projects:

1. Navigate to **"Research Labs"** (`/labs`) in the sidebar.
2. Click **"+ Create New Lab"**.
3. Enter your lab details:
   - **Lab Name**: e.g., *AI & Intelligent Systems Research Lab*
   - **Institution & Department**: e.g., *Computer Science & Engineering*
   - **Description**: Summary of your lab’s research directions.
4. Click **"Create Lab"**.
5. **Get Your Lab Join Code**:
   - Inside your Lab Dashboard, copy the generated **6-character Join Code** (e.g. `RT-8492`).
   - Share this code with your students in WhatsApp / Email so they can request to join.

### Creating Sub-Groups / Project Clusters
Under your main lab, create sub-groups for specific research themes (e.g. *NLP / LLM Alignment*, *Computer Vision*, *Graph Neural Networks*):
1. Inside your lab page, click **"+ Add Sub-Group"**.
2. Give the group a name, description, and accent color.
3. Assign students to specific sub-groups.

---

## 3. Student Management & Lab Join Requests

### Approving Student Join Requests
1. Navigate to **"Research Labs"** (`/labs/[slug]`) and open the **"Join Requests"** tab.
2. Review pending requests from students.
3. Click **"Approve"** to grant access or **"Decline"** if unrecognized.

### Supervising Students Hub (`/students`)
1. Click **"My Students"** (`/students`) in the sidebar.
2. View a real-time matrix of all supervised students:
   - Total papers read & reviews completed.
   - Pending milestone deliverables and upcoming deadlines.
   - Date of last 1-on-1 mentorship meeting.
   - Direct shortcuts to assign papers or schedule a check-in.

---

## 4. Assigning Papers & Curating Reading Starter Packs

### Assigning a Paper to Students
1. Navigate to **"Supervisory Assignments"** (`/assignments`).
2. Click **"+ Assign Paper"**.
3. Select the paper from your library (or import a new paper via ArXiv DOI).
4. Choose the target **Student(s)** or an entire **Sub-Group**.
5. Set a **Due Date** and **Priority** (`Medium`, `High`, `Critical`).
6. Add **Supervisor Instructions & Reading Focus** (e.g., *"Focus on Section 4: Training Stability and compare with our baseline dataset"*).
7. Click **"Assign"**. The student will receive a notification immediately.

### Curating Sub-Group Starter Packs (Onboarding Syllabi)
1. Go to your Sub-Group page and click **"Starter Pack"**.
2. Add landmark papers that every new student must read when joining that project cluster.
3. Organize the reading order (e.g., Week 1: Foundational Theory, Week 2: Modern Architectures).

---

## 5. Faculty Review Rubrics & Grading Submissions

When a student finishes reading an assigned paper and submits their review:

1. Open the student's submission from **"Assignments"** or the **Paper Workspace**.
2. Review their **3-Minute Digest** and **Literature Review Synthesis**.
3. Click **"Evaluate with Faculty Rubric"**.
4. Score the student across 4 key academic criteria (1 to 5 Stars):
   - **Problem Formulation**: Understanding of research motivation and scope.
   - **Methodological Rigor**: Grasp of algorithms, architecture, and mathematical foundation.
   - **Empirical Evaluation**: Analysis of datasets, baselines, and ablation studies.
   - **Synthesis & Novelty**: Ability to connect findings to current lab projects.
5. Select a **Verdict**:
   - ✅ **Approved**: Review meets publication-grade standards.
   - ⚠️ **Minor Revision**: Small clarifications needed.
   - 🔄 **Major Revision**: Needs deeper re-reading and re-synthesis.
6. Add feedback notes and click **"Submit Evaluation"**.

---

## 6. Thesis Milestones & Deliverable Approvals

Track Master’s, Ph.D., and Undergraduate thesis progression:

1. Go to **"Thesis Milestones"** (`/milestones`).
2. Click **"+ Create Milestone"**:
   - Set the title (e.g., *Chapter 2: Related Work Draft*, *Experimental Benchmark Replications*, *Final Camera-Ready Manuscript*).
   - Assign to a student with a firm deadline.
3. **Reviewing Submissions**:
   - When a student submits their deliverable link (PDF, GitHub repo, Overleaf link), click **"Review Submission"**.
   - Provide structured feedback and set the status to **Approved** or **Revision Requested**.

---

## 7. Scheduling & Managing 1-on-1 Meetings

Maintain continuous mentorship records:

1. Go to **"1-on-1 Meetings"** (`/meetings`).
2. Click **"+ Schedule Meeting"**:
   - Select the student, date, time, and meeting link (Google Meet / Zoom).
3. **During the Meeting**:
   - Review the student's pre-filled agenda notes.
   - Log **Supervisor Notes** and define concrete **Action Items** for the upcoming week.
4. Mark the meeting as **Completed**. The action items will remain visible on both your and the student's dashboard.

---

## 8. Lab Notices, Conference Countdowns & Tasks

### Pinning Lab Notices & Deadlines
1. Inside your Lab page, click **"+ Post Notice"**.
2. Select category:
   - 📢 **General Notice / Announcement**
   - ⏰ **Conference Submission Deadline** (with live countdown clock)
   - 💻 **Compute & GPU Cluster Notice**
   - 🏆 **Paper Acceptance / Achievement**
3. Choose whether to **Pin to Lab Banner** for maximum visibility.

### Delegating Lab Research Tasks
1. Open the Lab **Task Board**.
2. Create tasks (e.g., *Prepare ArXiv Pre-print*, *Benchmark Multi-GPU Scripts*), assign to specific lab researchers with due dates, and track their progress.

---

## 9. Exporting Matrices & LaTeX Survey Tables

Generate literature review tables ready for LaTeX and Overleaf:
1. Go to any **Collection** or your **Paper Library**.
2. Click **"Export Matrix"**.
3. Choose format:
   - **LaTeX Table (`.tex`)**: Formatted `\begin{table}` matrix with citations, benchmarks, and key contributions.
   - **BibTeX (`.bib`)**: Formatted bibliography file.
   - **CSV / JSON**: Raw structured data for archiving.

---

## 10. Supervisor Best Practices

- 📌 **Weekly Syncs**: Have students fill in their meeting agenda at least 24 hours prior to 1-on-1 sessions.
- 🎯 **Targeted Reading**: Use the *Priority* flag when assigning papers so students know which publications require immediate deep analysis.
- ⭐ **Rubric Feedback**: Provide specific comments in rubric evaluations to develop students' critical academic reviewing skills.

---

*For technical assistance, system audits, or role adjustments, please contact the platform administrator.*
