# WorkOS Redesign: Professional Operating System

## Vision

Transform WorkOS from a database explorer into a **professional operating system** that helps you advance your career using existing LifeOS systems.

Current Problem: WorkOS feels empty because it only exposes databases (Portfolio, Clients, Skills, Goals).

Solution: Build beautiful surfaces around six pillars that answer **"What should I work on today?"**

---

## Design Strategy: Reuse Everything

### What Exists (DON'T DUPLICATE)
1. **Tasks** → Use for application tasks, interview prep, certification study
2. **Projects** → Container for each application, portfolio project, or goal
3. **Calendar** → Interviews, deadlines, networking events, exams
4. **Brain/Inbox** → Capture job leads, recruiter messages, networking notes
5. **Focus Sessions** → Deep work on applications, interview prep, portfolio
6. **Momentum** → Track application progress, portfolio project activity
7. **Notes** → Interview prep, company research, follow-up notes
8. **Resources** → Job descriptions, portfolio assets, study materials

### What to Design
Beautiful dashboards and flows that connect these systems specifically for career work.

---

## Six Pillars of WorkOS

### 1. **Career (The Heart)**

**Entities to manage:**
- Job Applications (Projects + Tasks)
- Interviews (Calendar events + Tasks)
- Recruiters (Brain contacts + Notes)
- Networking (Calendar events + Brain)
- Offers (Projects + Calendar)
- Rejections (Brain + archived Projects)
- Follow-ups (Tasks with due dates)
- Certifications (Projects + Tasks)

**How it works:**

#### Job Application Pipeline
Instead of a separate database:

```
Create Project: "Software Engineer @ Acme Corp"
├─ Tasks:
│  ├─ "Customize resume" (due: tomorrow)
│  ├─ "Prepare cover letter"
│  ├─ "Research company culture"
│  └─ "Technical interview prep"
├─ Notes:
│  ├─ "Company overview" (research notes)
│  ├─ "Interview tips from Jane"
├─ Calendar:
│  ├─ "Phone screen with HR" (Jan 15)
│  ├─ "Technical interview" (Jan 22)
├─ Resources:
│  ├─ "job_description.pdf"
│  ├─ "interview_questions.md"
```

The project automatically has:
- Progress (based on task completion)
- Momentum (shows High/Medium/Dormant based on last update)
- Status (shows in Work Projects section)

#### Interview Pipeline
Visualized as a timeline or kanban:
- **Prospect** (Research phase)
- **Phone Screen** (Scheduled on Calendar)
- **Technical Interview** (Scheduled on Calendar)
- **Final Round** (Scheduled on Calendar)
- **Offer/Rejection** (Calendar event + Brain note)
- **Negotiation** (Tasks)

No separate status tracking needed. Use:
- **Upcoming Calendar events** = Scheduled interviews
- **Tasks with dates** = Preparation deadlines
- **Momentum** = Interview process activity level
- **Project status** = Which stage of pipeline

#### Recruiter Management
Instead of a Recruiter database:

```
Brain Item: "Jane Smith - Google"
├─ Tags: #recruiter #google
├─ Details:
│  - Email: jane@google.com
│  - Phone: (415) 555-1234
│  - Met: LinkedIn 2024
│  - Follow-up: Email weekly

Tasks:
├─ "Follow up with Jane" (due: Feb 1)
├─ "Send Jane my new portfolio" (due: Feb 15)
```

Or create a "Recruiters" project with notes for each person.

#### Certifications
```
Project: "CompTIA A+ Certification"
├─ Tasks:
│  ├─ "Watch Section 1 videos"
│  ├─ "Complete Section 1 practice exam"
│  ├─ "Schedule exam" (due: March 1)
│  ├─ "Take exam" (on Calendar)
├─ Focus Sessions:
│  └─ "A+ Study Session" (90 min)
├─ Resources:
│  └─ "exam_study_guide.pdf"
```

Certification progress = Task completion percentage

---

### 2. **Projects (Enhanced Display)**

Current: Table view of projects  
Desired: Beautiful cards showing what each project needs

**Project Card Shows:**
- Progress bar (from task completion)
- Current milestone (next uncompleted task)
- Last activity (when last updated)
- Linked tasks count
- Momentum status (🔥 active, 😴 dormant, ⏸ blocked)
- Next action button
- Recent notes

**Project Types (using existing icon system):**
- Job Applications (BriefcaseBusiness)
- Portfolio Projects (Code2, Aperture, Sparkles)
- Professional Goals (Target, Zap)
- Learning Projects (BookOpen)

**Layout:**
- Grid view (3-column)
- Sort by: Momentum, Due Date, Progress
- Filter by: Application status, portfolio, goals

---

### 3. **Portfolio (Showcase)**

Current: Database table  
Desired: Beautiful showcase of your work

**Portfolio Item (Project + metadata):**
```
Project: "Synapse"
├─ Status: "In Progress" or "Shipped" or "Featured"
├─ Description: "Platform for caregivers..."
├─ Tech Stack: ["React", "TypeScript", "Firebase"]
├─ Links:
│  ├─ GitHub: "github.com/me/synapse"
│  ├─ Website: "synapse.app"
├─ Resources:
│  ├─ screenshot_1.png
│  ├─ screenshot_2.png
│  ├─ demo_video.mp4
├─ Featured: true
```

**Display:**
- Hero section (featured projects first)
- Tech stack badges
- Links to GitHub/Website
- Screenshot gallery
- Project description
- "View project tasks" link (goes to Spaces → Project)

**Implementation:**
1. Add optional metadata to Projects (description, techStack, links, screenshots, featured)
2. Query projects with scope="work" and featured=true for portfolio
3. Beautiful card UI with screenshots
4. No new database; just enhanced Projects with portfolio metadata

---

### 4. **Skills (Living Objects)**

Current: Database table  
Desired: Objects that know their context

**Skill Object:**
```
"React"
├─ Proficiency: "Advanced"
├─ Years: 5
├─ Used In:
│  ├─ Synapse
│  ├─ Resume Tailor
│  ├─ LifeOS
├─ Certifications:
│  ├─ "React Expert Certification"
├─ Experience:
│  ├─ "Acme Corp" (2023-2024)
│  ├─ "Startup Inc" (2021-2022)
├─ Learning Resources:
│  ├─ "React Advanced Patterns" (course)
│  ├─ "performance-optimization-guide.pdf"
├─ Next Step: "Learn React Native"
```

**How to implement (without new system):**
1. Skill = Brain Item with structure
2. Projects tagged with skills (React, TypeScript, etc.)
3. Portfolio projects link skills
4. Brain items for learning resources
5. Tasks for "Next Step" learning
6. Render in beautiful card UI

**Skill Card Shows:**
- Proficiency level
- All projects using it
- Certifications
- Learning resources (as links)
- Next suggested step (as task)
- Last used (from project momentum)

---

### 5. **Professional Goals (Connected)**

Instead of floating goals, connect them to:
- **Projects** (e.g., "Build Resume Tailor" project)
- **Tasks** (e.g., "Complete CompTIA A+" has tasks)
- **Certificates** (e.g., "Get AWS Certified" links to cert project)
- **Applications** (e.g., "Find full-time role" shows application projects)

**Goal Structure:**
```
Goal: "Launch Resume Tailor"
├─ Status: In Progress
├─ Progress: 65% (from project)
├─ Connected To:
│  ├─ Project: "Resume Tailor" (70% done)
│  ├─ Tasks: 4 remaining
│  ├─ Focus Sessions: 15 hours logged
│  └─ Momentum: High (updated 2 hours ago)
├─ Milestone: "Ship MVP" (next)
└─ By: "June 30, 2026"
```

**Display:**
- Goal card with connected projects/tasks
- Progress bar (from project + tasks)
- Time remaining
- Recent activity feed
- "Get to work" quick action

---

### 6. **Opportunities (Companies, Recruiters, Events)**

**What to track:**
- Companies (from Brain + Projects)
- Recruiters (from Brain + Tasks)
- Networking events (from Calendar)
- Conferences (from Calendar)
- Career fairs (from Calendar)

**Implementation:**
- Use existing Brain inbox for leads
- Calendar events for conferences/events
- Projects for companies (when pursuing actively)
- Tags: #opportunity, #company-name, #event

**Opportunities Display:**
1. **Upcoming Interviews** (from Calendar + Projects)
2. **Active Applications** (from Projects with application status)
3. **Recruiter Follow-ups** (from Tasks with #recruiter tag)
4. **Upcoming Events** (from Calendar)
5. **New Opportunities** (from Brain inbox)

---

## WorkOS Dashboard

Replace current empty sections with intelligent cards that answer "What should I work on?"

```
┌─ WorkOS Dashboard
│
├─ HERO SECTION
│  └─ "Today is [Day]. Make career progress."
│
├─ QUICK ACTIONS
│  ├─ New Application
│  ├─ Log Interview
│  ├─ Capture Job Lead
│  └─ Start Interview Prep
│
├─ URGENT
│  ├─ 🔴 Interviews scheduled today (from Calendar)
│  ├─ 🟡 Application deadlines this week (from Projects)
│  └─ 🟢 Follow-up calls due (from Tasks)
│
├─ HIGH MOMENTUM
│  ├─ "Resume Tailor" 65% done (from Project progress)
│  ├─ "Interview prep" 90 min focus today (from Focus Sessions)
│  └─ "Google application" updated 2 hours ago (from momentum)
│
├─ INTERVIEW PIPELINE
│  ├─ Prospect (2)
│  ├─ Phone Screen (1)
│  ├─ Technical (1)
│  └─ Offer (0)
│
├─ GOALS
│  ├─ "Launch Resume Tailor" 65% (Project progress)
│  ├─ "Get AWS Certified" 40% (Task progress)
│  └─ "Find full-time role" (Application count)
│
├─ PORTFOLIO
│  └─ Featured projects (3 total)
│
└─ SKILLS SHOWCASE
   └─ Top 5 skills with project count
```

All data comes from existing systems (Projects, Tasks, Calendar, Momentum, Focus Sessions).

---

## Implementation Plan

### Phase 1: Data Modeling (No new databases)
- Extend Projects with optional portfolio metadata (description, techStack, links, featured)
- Extend Skills as structured Brain items
- Extend Goals as Projects with connections

### Phase 2: Dashboard Cards
- Urgent section (pulling from Calendar + Projects)
- High Momentum section (pulling from Projects + Focus Sessions)
- Interview Pipeline (visualizing projects by status tag)
- Goals progress (from linked projects/tasks)

### Phase 3: Beautiful Components
1. ProjectCard (replaces table row)
   - Progress bar
   - Last activity
   - Momentum indicator
   - Quick actions

2. PortfolioCard (showcase display)
   - Hero image
   - Tech stack badges
   - Links
   - Description

3. SkillCard (living object)
   - Proficiency level
   - Projects using it
   - Learning resources
   - Next step

4. InterviewPipeline (status tracking)
   - Kanban-style workflow
   - Drag to update status
   - Calendar integration

### Phase 4: Flows & Actions
- "New Application" wizard (creates Project + Tasks)
- "Log Interview" (creates Calendar event + Task follow-up)
- "Capture Job Lead" (creates Brain item + Task)
- "Start Interview Prep" (creates Focus Session + links tasks)

### Phase 5: Polish
- Beautiful empty states
- Activity feeds
- Momentum tracking
- Skill growth visualization

---

## What Changes in UI

### Current WorkOS Layout:
```
┌─ Hero "WorkOS"
├─ Quick Actions (3 buttons)
├─ Databases Section
│  ├─ Portfolio (table)
│  ├─ Clients (table)
│  ├─ Skills (table)
│  └─ Goals (table)
```

### New WorkOS Layout:
```
┌─ Hero "What moves work forward?"
├─ Quick Actions (5 contextual buttons)
├─ URGENT (red alert cards)
├─ HIGH MOMENTUM (projects actively progressing)
├─ INTERVIEW PIPELINE (kanban view)
├─ GOALS (connected projects)
├─ PORTFOLIO SHOWCASE (beautiful cards, not table)
└─ SKILLS SHOWCASE (cards with context)
```

---

## What Stays the Same

✅ Navigation  
✅ Sidebar  
✅ Task system  
✅ Project system  
✅ Calendar  
✅ Focus sessions  
✅ All other contexts (Life, School, Study Abroad)  
✅ Settings  

---

## New Components to Build

1. `ProjectCard` → Beautiful project display with progress, momentum
2. `PortfolioCard` → Showcase display with images and links
3. `SkillCard` → Skill object with projects and resources
4. `InterviewPipeline` → Kanban-style application workflow
5. `GoalCard` → Goal with connected project/task progress
6. `OpportunitiesList` → Upcoming interviews, events, follow-ups
7. `DashboardSection` → Reusable dashboard section component

All components query existing systems (Projects, Tasks, Calendar, Focus Sessions, Brain).

---

## No New Databases

✗ Applications table  
✗ Interview table  
✗ Recruiter table  
✗ Skills table  
✗ Opportunities table  
✗ Portfolio table  

All data lives in existing systems, surfaced beautifully.

---

## Next Steps

1. ✅ Create LIFEOS_GUIDE.md (existing systems)
2. ✅ Create WORKOS_REDESIGN.md (this document)
3. → Build new components (ProjectCard, etc.)
4. → Update WorkDashboard with new layout
5. → Add dashboard cards
6. → Test with real data
7. → Deploy

---

## Design Inspiration

Think:
- **Apple**: Clean, intentional, beautiful surfaces
- **Linear**: Clear workflow, momentum visible
- **Arc**: Thoughtful information design
- **Notion**: Connected data, not silos

Don't copy them. Think like them.
