# LifeOS Architecture Guide

## Overview

LifeOS is a personal operating system built on modularity and reuse. Instead of duplicating functionality across contexts, LifeOS provides shared systems that each context consumes.

**Core Philosophy**: No system should exist in duplicate. Everything is a module that can be reused.

---

## Existing Systems (DO NOT DUPLICATE)

### 1. **Now** (Ambient Activity Tracking)
**Location**: Persistent presence across all views  
**Purpose**: Track what you're actively doing without friction

**What it does:**
- Records current activity with optional note
- Lives at the top of the app (always accessible)
- Integrates with Focus Sessions
- Generates Momentum automatically

**How to use it**:
```tsx
// In AmbientActivity component
setAmbientActivity({
  title: "Job application",
  startedAt: new Date().toISOString(),
  note: "Applying to Acme Corp",
  spaceName: "Career"
})
```

**How WorkOS uses it**:
- When user starts a job application, set ambient activity
- When working on interview prep, capture it
- This feeds into momentum automatically

---

### 2. **Today** (Calendar & Timeline)
**Location**: Dedicated "Today" view  
**Purpose**: See what's scheduled and its relative importance

**What it contains:**
- Calendar events (iCal, Google Calendar, LifeOS-created)
- Time-bound tasks (from Tasks module)
- Interview times, deadlines, meetings
- Energy level at different times

**Data structure**:
```typescript
type CalendarEvent = {
  id: string;
  title: string;
  start: string; // ISO 8601
  end?: string;
  source: "LifeOS" | "iCal" | "Google" | "Outlook";
  color: string;
  notes?: string;
};
```

**How WorkOS uses it**:
- Interviews appear automatically when scheduled
- Application deadlines appear as events
- Networking events pull from calendar
- Certification exam dates come from Calendar

---

### 3. **Calendar** (Full Calendar View)
**Location**: Main calendar interface  
**Purpose**: Full month/week/day view of all time-bound activities

**Features:**
- Multi-source event display (iCal, Google, local)
- Drag-to-reschedule
- Event creation
- Timezone support

**How WorkOS uses it**:
- Same event types as Today
- Provides month-level career visibility
- Shows interview pipeline visually
- Displays when application deadlines cluster

---

### 4. **Tasks** (Priority & Action System)
**Location**: Shared task engine  
**Purpose**: Track what needs to be done, by when, with what priority

**Data structure**:
```typescript
type Task = {
  id: number;
  title: string;
  project: string; // Project it belongs to
  color: string; // Inherited from project
  due: string; // YYYY-MM-DD
  priority: "High" | "Medium" | "Low";
  status?: "Not started" | "In progress" | "Blocked" | "Done" | "Canceled";
  notes?: string;
  classId?: string; // If school task
  done?: boolean;
  canceled?: boolean;
};
```

**Key features:**
- Priority-based sorting
- Due date management
- Project association
- Status tracking

**How WorkOS uses it**:
- Applications generate tasks (e.g., "Polish resume for Adobe")
- Interviews generate tasks (e.g., "Research Acme Corp")
- Certifications generate tasks (e.g., "Complete CompTIA A+ practice exam")
- Goals generate tasks (e.g., "Build Resume Tailor project")
- Don't create WorkOS-specific task types; use Projects to organize

---

### 5. **Projects** (Container & Organization)
**Location**: Spaces → Projects  
**Purpose**: Organize work into named containers

**Data structure**:
```typescript
type Project = {
  name: string;
  desc: string; // Short description
  progress: number; // 0-100
  color: string; // Visual identity
  icon: ProjectIcon; // Visual type
  tasks: number; // Count of tasks in project
  kind: "maintenance" | "finishable";
  scope: "life" | "school" | "work";
};
```

**Features:**
- Tasks automatically belong to a project
- Progress calculated from task completion
- Visual identity (color + icon)
- Kanban view for visualization
- Tagging system

**How WorkOS uses it**:
- Each portfolio project is a Project
- Each goal might be a Project
- Job applications could be Projects (one per company)
- Career goal projects (e.g., "Build Synapse", "Get CompTIA A+")
- Reuse existing Projects; don't create WorkOS-specific ones

---

### 6. **Spaces** (Project & Class Navigator)
**Location**: Main navigation item  
**Purpose**: Browse and select Projects and Classes

**What it shows:**
- All projects with color/progress/icon
- All classes (school)
- Kanban boards
- Project details

**How WorkOS uses it**:
- Show career-related projects
- Portfolio projects visible here
- Not a separate WorkOS space; just filters to Work scope projects

---

### 7. **Focus Sessions** (Deep Work Timer)
**Location**: Can be started from anywhere  
**Purpose**: Dedicated, uninterrupted work blocks with AI support

**Data structure** (from contextArchitecture.ts):
```typescript
type FocusSession = {
  id: string;
  name: string; // "Job application research"
  goal: string;
  context: OperatingContext; // "Work"
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  linkedTasks: number[]; // Task IDs
  interruptionPolicy: "minimal" | "moderate" | "flexible";
  aiMode: "work-assistant" | "study-partner" | "creative-director" | "general";
  status: "scheduled" | "active" | "paused" | "completed" | "cancelled";
  completionPercentage: number;
  energyBefore?: "low" | "medium" | "high";
  energyAfter?: "low" | "medium" | "high";
};
```

**How WorkOS uses it**:
- Start a focus session when interviewing prep or job applications
- Link tasks to the session
- Use "work-assistant" AI mode for career work
- Track energy before/after to understand what drains/energizes

---

### 8. **Momentum** (Activity Tracking)
**Location**: Status indicators throughout the app  
**Purpose**: Visualize what's actively progressing vs. stalled

**Feeds into Momentum:**
- Focus sessions (work time)
- Task completion ("done")
- Ambient activity capture (explicit logging)

**Momentum categories**:
- **High Momentum**: Recently active, regularly updated
- **Medium Momentum**: Some activity this week
- **Dormant**: No activity for 2+ weeks
- **Blocked**: Waiting on external action

**How WorkOS uses it**:
- Applications show as High/Medium/Dormant based on last update
- Job searches show momentum
- Portfolio projects show momentum
- Career goals show momentum
- Don't create a separate momentum system; use existing one

---

### 9. **Brain/Inbox** (Quick Capture)
**Location**: Quick access via keyboard (B) or floating button  
**Purpose**: Capture thoughts without context switching

**Data structure**:
```typescript
type BrainItem = {
  id: string;
  title: string;
  body: string;
  attachments?: string[];
  tags?: string[];
  createdAt: string;
  isProcessed?: boolean;
};
```

**Key feature**: Can be processed later into tasks, notes, or projects

**How WorkOS uses it**:
- Capture recruiting conversations ("Connected with Jane Smith from Google")
- Quick ideas about portfolio projects
- Interview follow-up thoughts
- Not a separate WorkOS capture; use the same brain inbox

---

### 10. **Notes** (Knowledge Capture)
**Location**: Brain → Notes, or project-attached notes  
**Purpose**: Store context and knowledge

**Data structure**:
```typescript
type Note = {
  id: string;
  title: string;
  body: string;
  classId?: string; // School context
  projectName?: string; // Project context
  template?: "blank" | "lined" | "dotted" | "cornell" | "meeting";
  updatedAt: string;
};
```

**Attached to**: Projects or Classes, not floating globally

**How WorkOS uses it**:
- Interview prep notes (attached to portfolio project)
- Company research notes (attached to "Research" project)
- Job description notes
- Certification study notes
- Don't create WorkOS-specific notes; attach to existing projects

---

### 11. **Resources** (File & Link Management)
**Location**: Brain → Resources  
**Purpose**: Store PDFs, documents, links by project or context

**Data structure**:
```typescript
type Resource = {
  id: string;
  name: string;
  type: string; // "pdf", "link", "image", etc.
  size: number;
  url: string;
  uploadedAt: string;
  projectName?: string;
  storage?: "cloud" | "local";
};
```

**Scoped to**: Projects or global

**How WorkOS uses it**:
- Portfolio project links (GitHub, websites, screenshots)
- Job description PDFs attached to applications
- Interview preparation materials
- Certification study guides
- Don't duplicate; use existing Resources system

---

### 12. **Keyboard Shortcuts** (Universal Access)
**Existing shortcuts**:
- `/` — Find anything
- `⌘K` — Command palette
- `B` — Quick capture to Brain
- `F` — Start focus session
- `N` — New task
- `J/K` — Switch focus task

**Philosophy**: Power users can access everything via keyboard

**How WorkOS uses it**:
- Extend command palette to include career actions
- Quick capture shortcuts for common career logs
- No new keyboard-driven UI; reuse existing patterns

---

### 13. **Firebase Sync** (Cross-Device Persistence)
**Location**: Background sync  
**Purpose**: Keep data in sync across devices and time

**Supports**:
- Real-time sync of tasks, projects, events
- Cloud backup
- Multi-device access
- Offline-first architecture (local-first, cloud-synced)

**How WorkOS uses it**:
- All WorkOS data syncs automatically
- No separate storage; use existing Firebase structure

---

## High-Level Architecture

```
┌─ LifeOS (Personal Operating System)
│
├─ Shared Systems (Used by all contexts)
│  ├─ Tasks (Priorities, deadlines, status)
│  ├─ Projects (Containers, progress, organization)
│  ├─ Calendar/Today (Time-bound activities)
│  ├─ Focus Sessions (Deep work blocks)
│  ├─ Brain/Inbox (Capture)
│  ├─ Notes (Knowledge)
│  ├─ Resources (Files & links)
│  ├─ Momentum (Activity tracking)
│  └─ Firebase Sync (Persistence)
│
├─ Operating Contexts
│  ├─ Life
│  │  └─ LifeDashboard (habits, wellness, goals, etc.)
│  ├─ School
│  │  └─ SchoolDashboard (classes, assignments, exams, etc.)
│  ├─ Study Abroad
│  │  └─ StudyAbroadDashboard (applications, programs, etc.)
│  └─ Work
│     └─ WorkDashboard ← YOU ARE HERE
│
└─ UI/UX Layer
   ├─ Sidebar (context-aware navigation)
   ├─ Main content area
   └─ Modals & overlays
```

---

## Design Principles

### 1. **Reuse > Build**
Before creating new UI or data structure, check if something already exists.

Example:
- ❌ "Create a WorkOS task system" → ✅ Use existing Tasks module
- ❌ "Create WorkOS calendar" → ✅ Use existing Calendar module
- ✅ "Show upcoming interviews on Today" → Yes, add as Calendar events

### 2. **Surfaces, Not Databases**
Show beautiful surfaces that query existing data. Don't create new databases.

Example:
- ❌ "Create an applications database" → ✅ Create Projects for each application
- ❌ "Build a jobs list" → ✅ Use Brain/Inbox for job prospects, convert to Projects
- ✅ "Surface portfolio projects nicely" → Yes, query existing Projects

### 3. **Connect Instead of Duplicate**
If something exists in another context, link to it instead of copying.

Example:
- Skills used in Projects → Link to Project, don't duplicate
- Certifications as Goals → Link to Goal Tasks, don't separate
- Interviews as Calendar events → Link to Calendar, not separate timeline

### 4. **Mobile-First, Desktop-Enhanced**
All data structures and UIs must work on mobile.

---

## The Pattern: Context + Systems = Surfaces

```
Work Context + Tasks System = Work Task List
Work Context + Projects System = Active Projects
Work Context + Calendar System = Interview Schedule + Deadlines
Work Context + Brain System = Quick Capture for work thoughts
Work Context + Focus Sessions = Deep work on career items
Work Context + Momentum = Career activity tracking
Work Context + Resources = Portfolio & supporting materials
```

WorkOS doesn't need its own systems. It needs beautiful surfaces that expose existing systems in context.

---

## What WorkOS Should Have

### Tier 1: Core (Must Have)
1. **Dashboard** answering "What should I work on today?" using existing systems
2. **Career pillar** (Job applications, Interviews, Recruiters, Offers, Follow-ups)
3. **Beautiful project display** (not database tables)
4. **Skill management** (living objects, not database)
5. **Goal connection** (links to tasks, projects, applications)

### Tier 2: Enhancement (Should Have)
1. **Portfolio showcase** (beautiful display of portfolio projects)
2. **Interview pipeline** (visual workflow of applications)
3. **Opportunity tracking** (companies, events, contacts)
4. **Professional network** (relationships, follow-up)

### Tier 3: Polish (Nice to Have)
1. **Momentum dashboard** (showing high/stalled/blocked)
2. **Activity timeline** (what you did this week)
3. **Skill growth tracking** (certifications, experience)

---

## What NOT to Build

❌ Another task manager → Use existing Tasks  
❌ Another calendar → Use existing Calendar  
❌ Another file manager → Use existing Resources  
❌ Another note system → Use existing Notes  
❌ Another project manager → Reuse Projects, improve display  
❌ Another focus session system → Use Focus Sessions  
❌ Another capture UI → Use Brain Inbox  

---

## Next: WorkOS Design

The WorkOS redesign focuses on beautiful surfaces, not new systems. Six pillars using existing infrastructure:

1. **Career** → Job applications (Projects), Interviews (Calendar), Recruiters (Brain/Contacts)
2. **Projects** → Reuse existing Projects system, improve display
3. **Portfolio** → Portfolio Projects surfaced beautifully
4. **Skills** → Objects with metadata (projects, certs, experience)
5. **Professional Goals** → Connect to Tasks, Projects, Certificates, Applications
6. **Opportunities** → Companies, Events, Contacts (from Brain)

Each pillar answers "What should I work on today?" using existing systems.
