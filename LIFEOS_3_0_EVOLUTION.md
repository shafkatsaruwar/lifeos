# LifeOS 3.0 — Evolution to Personal Operating System

## Phase 1: Audit Complete

### Current State ✅

**Architecture:**
- Three-layer context architecture implemented (OperatingContext, PersonalContextLayer, FocusSession)
- Operating Contexts: Work, School, Life, Study Abroad, Photography, Travel, Health
- Focus Sessions system exists with full data model
- Workspace memory partially implemented (spaceContext in settingsState)

**Components & Systems:**
- **Navigation**: Tab-based routing (Now, Life, School, Work, Study Abroad, Spaces, Library, Settings)
- **Dashboards**: LifeDashboard, SchoolDashboard, WorkDashboard implemented
- **Tasks**: Global task system with project association
- **Projects**: Project system with color, progress, icon, scope
- **Calendar**: Event system with multi-source support (iCal, Google, Outlook)
- **Focus Sessions**: Modal interface exists, can track work
- **Brain/Inbox**: Capture system exists
- **Demo Mode**: Fully enabled with comprehensive WorkOS data

**WorkOS Specific:**
- Components: ProjectCard, PortfolioCard, SkillCard, GoalCard, InterviewPipeline, UrgentAlerts, MomentumSection
- Demo data: 8 projects, 6 tasks, 5 calendar events, 20+ portfolio/skill/goal records
- Collections: Portfolio, Clients, Skills, Goals (via HubCollectionModal)

### Gaps → Opportunities (What Needs Evolution)

| Gap | Current State | Target State | Impact |
|-----|---------------|--------------|--------|
| **Focus Sessions** | Hidden in modal, not orchestration engine | Entire interface adapts when active (primary feature) | **HIGH** - Transforms UX |
| **Operating Modes** | Tab navigation, same interface per mode | Each mode is a distinct workspace with own rhythm | **HIGH** - Context immersion |
| **Workspace Memory** | spaceContext tracks tasks only | Full state restoration: sidebar, viewport, tasks, notes, projects | **MEDIUM** - Continuity |
| **Timeline** | Calendar is one of many views | Timeline orchestrates Focus Sessions, context switching, deadlines | **HIGH** - Central control |
| **Quick Capture** | Static button, same options always | Adapts per context: Work (Task/Meeting/Bug), Photography (Note/Location) | **MEDIUM** - Contextuality |
| **Right Sidebar** | Database links in collapsible section | Assistant Panel: Today's Timeline, Current Focus, Suggestions, Quick Actions | **MEDIUM** - Guidance |
| **Home** | LifeDashboard with all widgets | Personalized greeting with context-aware recommendations | **MEDIUM** - Onboarding |
| **Search** | Global command palette (⌘K) | Context-aware first, then global | **LOW** - Efficiency |
| **Project Cards** | Basic cards with progress bar | Living workspaces: milestone, next task, momentum, last worked | **MEDIUM** - Visibility |
| **AI Assistant** | Generic (work-assistant mode exists) | Context-aware personality per Operating Mode | **LOW** - Personality |

---

## Phase 2: Architectural Changes Required

### 2.1 Focus Sessions as First-Class Feature

**Current Reality:**
```tsx
// Focus Sessions exist as modal, not orchestration
<FocusMode task={activeTask} ... />
```

**Target Reality:**
```tsx
// When focus starts, entire UI changes
- Sidebar collapses/filters to focused project only
- Main content shows focus-mode UI (timer, goal, linked items)
- Right sidebar becomes Focus Assistant (progress, AI tips, energy tracker)
- Navigation changes (only show relevant contexts)
- Quick Capture shows focus-specific options
- Notifications muted to "interruption policy" setting
```

### 2.2 Operating Modes Structure

**Pattern (same rhythm, different data):**
```
Every Operating Mode:
├─ Hero Section (greeting + today's focus)
├─ Quick Actions (context-specific)
├─ Status Section (urgent/overdue/high-momentum)
├─ Work Section (active projects/assignments/applications)
├─ Knowledge Section (notes/resources for this context)
├─ Timeline Section (upcoming events/deadlines)
└─ Assistant Panel (right sidebar)
```

**Implementation:** Consistent component architecture, different data queries.

### 2.3 Workspace Memory (Full State Restoration)

**Current:**
```tsx
// Only tracks last task
lastTaskId?: number;
```

**Target:**
```tsx
type WorkspaceMemory = {
  context: OperatingContext;
  lastVisited: string; // ISO timestamp
  activeSection?: string; // "projects" | "notes" | "research"
  selectedItem?: {
    type: "project" | "class" | "note" | "task";
    id: string | number;
  };
  scrollPosition?: number;
  expandedSections?: Record<string, boolean>;
  filterState?: Record<string, string | boolean>;
};
```

**Behavior:** When returning to a context, scroll to last view, restore selections, expand sections.

### 2.4 Timeline as Orchestration Engine

**Current:** Calendar is one view among many.

**Target:**
- Timeline controls which Operating Mode should be active
- Focus Sessions are Timeline events with extended data
- Calendar events trigger context switches
- Deadlines pull from Projects + Calendar
- Notifications show Timeline-relative urgency

### 2.5 Context-Aware Quick Capture

**Current:** Three options (Task, Meeting, Bug) always

**Target:**
```tsx
Work Mode Quick Capture:
├─ Task (new task for career)
├─ Bug (technical issue)
├─ Meeting (event + follow-up task)
├─ Idea (job lead, project concept)
└─ Note (research, interview prep)

Photography Mode Quick Capture:
├─ Client Note
├─ Location Scout (geo tag, mood, lighting)
├─ Editing Note (preset, technique)
├─ Gear (new equipment, rental)
└─ Inspiration (visual reference)
```

### 2.6 Assistant Panel (Right Sidebar)

**Replaces:** Static database links

**Shows (context-aware):**
- **Today's Timeline**: Next 3 events
- **Current Focus**: Active session progress (if any)
- **Quick Actions**: Context-specific buttons
- **AI Suggestions**: Smart recommendations
- **Recent Activity**: Last 3 updates

---

## Phase 3: Redesign Every Operating Mode

### Work Mode → Professional Workspace

**Hero:**
```
Good morning. Today is Thursday.

Your focus
9:00–11:00 | Interview prep for Google
Goal: Research company culture & values

Before work
☑ Medication  ☑ Breakfast  ☐ Stretch
```

**Quick Actions:**
- New Application (wizard: create project + first tasks)
- Log Interview (event + follow-up tasks)
- Capture Job Lead (brain item + convert to project)
- Start Interview Prep (focus session)

**Status Section - "What Needs Your Attention":**
```
🔴 URGENT (Today)
- Phone screen with Acme Corp (3:00 PM)
- Cover letter due (tomorrow 9 AM)

🟡 THIS WEEK
- 3 applications pending review
- AWS certification exam (Friday)

🟢 IN PROGRESS
- Resume Tailor: 65% complete
- 2 portfolio projects with updates this week
```

**Work Section - "Active Projects":**
- Grid of ProjectCards (8 total)
- Sortable by: Momentum, Due Date, Relevance
- Each shows: milestone, momentum (🔥😴⏸), last updated, linked tasks

**Knowledge Section:**
- Interview prep notes (from Portfolio project notes)
- Company research (from Brain items tagged with companies)
- Study resources (from Resources attached to projects)

**Timeline Section:**
- "This Month's Interviews"
- Calendar grid showing application deadlines & interview dates
- Color-coded by urgency

**Assistant Panel:**
```
TODAY'S TIMELINE
9:00–11:00  Interview Prep (Focus)
1:00–2:00   Team standup
3:00 PM     Phone screen - Acme Corp (🔴 URGENT)

CURRENT FOCUS
None active
[Start Focus Session button]

QUICK ACTIONS
+ New Application
+ Log Interview  
+ Capture Lead
+ Start Focus

AI SUGGESTION
Your Google interview is in 6 days. 
Prepare: System design + behavioral. 
→ Create prep focus session?
```

### School Mode → Academic Workspace

**Structure:** Similar to Work, but:
- Quick Actions: New Assignment, New Exam, Schedule Study Session
- Status: Assignments Due, Exams Scheduled, GPA Progress
- Work Section: Classes grid (instead of projects)
- Knowledge: Lecture notes, study guides, research materials
- Timeline: Assignment deadlines, exam dates, office hours

### Life Mode → Personal Workspace

**Structure:** Wellness-focused
- Quick Actions: Log Activity, New Habit, Plan Meal, Log Mood
- Status: Today's Habits, Energy Level, Water/Medication, Exercise
- Work Section: Active personal projects (creative, fitness, learning)
- Knowledge: Recipes, workouts, wellness resources
- Timeline: Health appointments, wellness activities, life events

### Photography Mode → Creative Workspace

**Structure:** Portfolio-focused
- Quick Actions: Log Shoot, Scout Location, Create Portfolio, Pitch Client
- Status: Upcoming Shoots, Client Deadlines, Equipment Needed
- Work Section: Current Projects (client work, personal series)
- Knowledge: Presets, lighting setups, gear database, inspiration
- Timeline: Shoot dates, client deliverable dates, equipment maintenance

---

## Phase 4: Navigation Diagrams

### Main Navigation Flow

```
┌─ App Load
│
├─ Not Logged In → Demo Mode Dashboard (Work focus)
│
└─ Logged In
   ├─ Check Timeline
   │  ├─ Has Focus Session active? → Enter Focus Mode
   │  └─ No focus → Check Operating Mode preference
   │
   ├─ Operating Mode (primary navigation)
   │  ├─ Work
   │  ├─ School  
   │  ├─ Life
   │  ├─ Photography
   │  ├─ Travel
   │  └─ Health
   │
   ├─ Secondary Views
   │  ├─ Now (ambient activity picker)
   │  ├─ Timeline (full calendar)
   │  ├─ Spaces (projects/classes browser)
   │  ├─ Library (notes/resources)
   │  └─ Settings
   │
   └─ Context Switcher (mode change)
      ├─ Save workspace memory
      ├─ Transition animation
      ├─ Load new context state
      └─ Restore sidebar/viewport
```

### Focus Session Entry Point

```
Any View
  ↓
[Press F] or [Click Focus Button in Assistant Panel]
  ↓
Focus Session Selector
├─ Create New
│  ├─ Context
│  ├─ Task/Project
│  ├─ Duration
│  ├─ Interruption policy
│  └─ AI mode
└─ Resume Previous
  ↓
Focus Mode (full screen)
├─ Timer
├─ Goal display
├─ Linked items (tasks, notes)
├─ AI Assistant (context-aware)
├─ Energy tracker
└─ Exit or Extend
  ↓
Resume Previous Context
```

### Timeline Navigation

```
Main Timeline View
  ├─ Month view (see clustering)
  ├─ Week view (see day-by-day)
  ├─ Day view (see hourly)
  │
  ├─ Click Event
  │  ├─ If Calendar event → Show details, can edit
  │  └─ If Focus Session → Can resume
  │
  ├─ Click Gap (time without events)
  │  └─ Suggest focus session in that time
  │
  └─ Drag to create
     ├─ Multi-hour gaps → Suggest focus session
     └─ Confirm & start immediately
```

---

## Phase 5: Wireframes

### Work Mode Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ LifeOS | W S P T H L Settings                      ⌘K  👤  ☀️  ═══════  │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─ Sidebar ──────────────────────────────────────────┐                 │
│ │                                                    │                 │
│ │ Good morning, Shafkat.                            │                 │
│ │ Today is Thursday                                 │                 │
│ │                                                    │                 │
│ │ Work Context                                       │                 │
│ │                                                    │  ┌─ Assistant ─┐ │
│ │ 9:00–11:00                                        │  │             │ │
│ │ Interview prep                                    │  │ TODAY'S     │ │
│ │ Research Acme culture & values                    │  │ TIMELINE    │ │
│ │                                                    │  │             │ │
│ │ ┌─ Before work ──────────────────┐              │  │ 9:00–11:00  │ │
│ │ │ ☑ Medication                   │              │  │ Interview   │ │
│ │ │ ☑ Breakfast                    │              │  │ Prep        │ │
│ │ │ ☐ Stretch                      │              │  │             │ │
│ │ └─────────────────────────────────┘              │  │ 1:00–2:00   │ │
│ │                                                    │  │ Standup     │ │
│ │ [+ New Application] [+ Log Interview]             │  │             │ │
│ │ [+ Capture Lead]    [+ Start Focus]               │  │ 3:00 PM 🔴  │ │
│ │                                                    │  │ Phone       │ │
│ └────────────────────────────────────────────────────┘  │ Screen      │ │
│                                                         │             │ │
│ ┌──────────── MAIN CONTENT AREA ──────────────────────┐  │ CURRENT    │ │
│ │                                                      │  │ FOCUS      │ │
│ │ 🔴 URGENT (Today)                                   │  │            │ │
│ │ ┌──────────────────────────────────────────────┐   │  │ None       │ │
│ │ │ Phone screen with Acme Corp                  │   │  │ active     │ │
│ │ │ 3:00 PM – Wednesday (1 day away)             │   │  │            │ │
│ │ │ Prep: Research, behavioral questions         │   │  │ [START]    │ │
│ │ └──────────────────────────────────────────────┘   │  │            │ │
│ │                                                      │  │ QUICK      │ │
│ │ 🟡 THIS WEEK                                        │  │ ACTIONS    │ │
│ │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │  │            │ │
│ │ │Cover │ │Acme  │ │AWS   │ │Resume│              │  │ + New App  │ │
│ │ │due   │ │Tech  │ │Cert  │ │Tailor│              │  │ + Interview│ │
│ │ │tomorrow     │ │Friday   │ │65%   │              │  │ + Capture  │ │
│ │ └──────┘ └──────┘ └──────┘ └──────┘              │  │ + Focus    │ │
│ │                                                      │  │            │ │
│ │ 🟢 ACTIVE PROJECTS                                  │  │ AI TIPS    │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │  │            │ │
│ │ │LifeOS   │ │ Resume   │ │ AI Task  │ │Client  │ │  │ Google     │ │
│ │ │Platform  │ │ Tailor   │ │Breakdown │ │Project │ │  │ interview  │ │
│ │ │72% ─────│ │65% ─────│ │45% ─────│ │58% ───│ │  │ in 6 days  │ │
│ │ │🔥 Updated│ │🔥 Updated│ │😴 Quiet  │ │⏸Blocked│ │  │            │ │
│ │ │2h ago   │ │1d ago   │ │2w ago   │ │blocked │ │  │ Prep:      │ │
│ │ └──────────┘ └──────────┘ └──────────┘ └────────┘ │  │ System     │ │
│ │ [more...]                                           │  │ design +   │ │
│ │                                                      │  │ behavioral │ │
│ │ 📅 PORTFOLIO (4 total)                              │  │            │ │
│ │ ┌──────────────────────────────────────────────┐   │  │ → Create   │ │
│ │ │ LifeOS Platform                              │   │  │ Prep focus │ │
│ │ │ Personal operating system                    │   │  │ session?   │ │
│ │ │ React · TypeScript · Firebase                │   │  │            │ │
│ │ │ [GitHub] [Website] [15.2K users]             │   │  └────────────┘ │
│ │ └──────────────────────────────────────────────┘   │                 │
│ │ [more portfolio items...]                           │                 │
│ └──────────────────────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Focus Mode Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ FOCUS: Interview prep for Google                          ✕ ⊡ ↙           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│                          ⏱ 47:32                                          │
│                                                                           │
│  Goal: Research Acme company culture & values                           │
│                                                                           │
│  📌 Linked Tasks                                                         │
│  ✓ Acme Corp company profile                                            │
│  ○ Prepare behavioral questions                                         │
│  ○ Research recent news & projects                                      │
│  ○ Prepare for systems design question                                  │
│                                                                           │
│                                                                           │
│  💡 AI Suggestions (Work Assistant)                                      │
│  ┌──────────────────────────────────────────────────────┐               │
│  │ For system design prep, focus on:                    │               │
│  │                                                       │               │
│  │ 1. Database architecture                             │               │
│  │ 2. Scalability patterns                              │               │
│  │ 3. Trade-offs analysis                               │               │
│  │                                                       │               │
│  │ Resources in your library:                           │               │
│  │ • System Design Interview notes                      │               │
│  │ • Architecture patterns guide                        │               │
│  └──────────────────────────────────────────────────────┘               │
│                                                                           │
│  Energy Level: 🟢 High                                                    │
│                                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
│                                                                           │
│  [Minimize] [Pause Session] [Extend] [End & Review]                     │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌─────────────────────────┐
│ W S P T H L   ⌘K 👤 ☀️│
├─────────────────────────┤
│                         │
│ Good morning            │
│                         │
│ Work                    │
│                         │
│ 9:00–11:00 Interview    │
│ prep                    │
│                         │
│ [+ New App][+ Focus]    │
│                         │
│ 🔴 URGENT (Today)       │
│ Phone screen            │
│ 3:00 PM (1 day)         │
│                         │
│ 🟡 THIS WEEK            │
│ [Cover due][Acme Tech]  │
│ [AWS Cert] [Resume]     │
│                         │
│ 🟢 ACTIVE PROJECTS      │
│ [LifeOS 72%]            │
│ [Resume Tailor 65%]     │
│ [AI Breakdown 45%]      │
│                         │
│ 📅 PORTFOLIO            │
│ [LifeOS Platform]       │
│ [AI Task Breakdown]     │
│                         │
└─────────────────────────┘
```

---

## Phase 6: Reusable Components

### Component Architecture

**Tier 1: Atomic**
- `Hero` — Page header with greeting
- `QuickAction` — Contextual action button
- `AlertCard` — Urgent item display
- `ProjectCard` — Active project with momentum
- `PortfolioItem` — Portfolio project showcase
- `TimelineEvent` — Calendar event card
- `AssistantMessage` — AI suggestion card

**Tier 2: Composite**
- `StatusSection` — Groups urgent/this-week/in-progress alerts
- `ProjectGrid` — Grid of ProjectCards with sorting
- `TimelineView` — Month/week/day calendar
- `AssistantPanel` — Right sidebar with timeline + suggestions
- `ModeHero` — Hero section (greeting, focus session, context)

**Tier 3: Modes**
- `OperatingModeLayout` — Consistent structure per mode
- `FocusMode` — Full-screen focus interface
- `OperatingModeView` — Renders specific mode (Work/School/Life)

### Component Contracts

```tsx
// Every Operating Mode View
type OperatingModeViewProps = {
  // Data
  tasks: Task[];
  projects: Project[];
  calendar Events: CalendarEvent[];
  currentContext: OperatingContext;
  workspace Memory: WorkspaceMemory;

  // Actions
  onSelectProject: (name: string) => void;
  onCreateTask: () => void;
  onStartFocus: (projectName?: string) => void;
  onNavigate: (view: View) => void;
  onCaptureQuick: (type: QuickCaptureType) => void;
};

// Status Section (Urgent + This Week + In Progress)
type StatusSectionProps = {
  urgent: Alert[];
  upcoming: Alert[];
  active: Alert[];
  context: OperatingContext;
  onActionAlert: (alert: Alert) => void;
};

// Assistant Panel (Right Sidebar)
type AssistantPanelProps = {
  timeline: CalendarEvent[]; // Next 3 events
  focusSession?: FocusSession | null;
  suggestions: string[]; // AI-generated tips
  context: OperatingContext;
  onAction: (action: string) => void;
};
```

---

## Phase 7: Implementation Roadmap

### Delivery Timeline

**Week 1: Foundation**
1. ✅ Refactor navigation to context-aware tabs
2. ✅ Implement workspace memory (save/restore per context)
3. ✅ Create OperatingModeLayout (consistent structure)
4. ✅ Build Assistant Panel component

**Week 2: Operating Modes**
1. Redesign Work Mode (hero, quick actions, status, projects, timeline)
2. Redesign School Mode (same structure, school data)
3. Redesign Life Mode (wellness focus)
4. Create Photography Mode

**Week 3: Focus Sessions**
1. Make Focus Sessions orchestration engine
2. Hide sidebar during focus (full-screen mode)
3. Integrate AI assistant into focus mode
4. Add interruption policy enforcement

**Week 4: Context Features**
1. Context-aware Quick Capture
2. Context-aware Search (prioritize current context)
3. Context-aware AI (personality per mode)
4. Timeline as orchestration (context switcher)

**Week 5: Timeline**
1. Full Timeline view (month/week/day)
2. Focus Sessions as Timeline events
3. Click event → quick actions (resume focus, edit, etc.)
4. Drag to create focus sessions

**Week 6: Polish & Shipping**
1. Animations (context switches, focus entry/exit)
2. Mobile optimization
3. Empty states
4. Testing & refinement
5. Deploy

### Code Organization

```
app/
├─ components/
│  ├─ OperatingModes/
│  │  ├─ OperatingModeLayout.tsx (structure)
│  │  ├─ WorkMode.tsx (professional workspace)
│  │  ├─ SchoolMode.tsx (academic workspace)
│  │  ├─ LifeMode.tsx (personal workspace)
│  │  └─ PhotoMode.tsx (creative workspace)
│  │
│  ├─ Sections/
│  │  ├─ ModeHero.tsx (greeting + focus session display)
│  │  ├─ QuickActionsBar.tsx (context-specific buttons)
│  │  ├─ StatusSection.tsx (urgent + this week + active)
│  │  ├─ ProjectsGrid.tsx (active work display)
│  │  ├─ TimelineSection.tsx (upcoming events)
│  │  └─ AssistantPanel.tsx (right sidebar)
│  │
│  ├─ Cards/
│  │  ├─ AlertCard.tsx (urgent item)
│  │  ├─ ProjectCard.tsx (with momentum, milestone, last updated)
│  │  ├─ PortfolioCard.tsx (showcase item)
│  │  ├─ TimelineEventCard.tsx (calendar event)
│  │  └─ AssistantMessageCard.tsx (AI suggestion)
│  │
│  └─ Focus/
│     ├─ FocusMode.tsx (full-screen focus interface)
│     ├─ FocusTimer.tsx (countdown display)
│     └─ FocusAI.tsx (context-aware suggestions)
│
├─ hooks/
│  ├─ useWorkspaceMemory.ts (save/restore context state)
│  ├─ useOperatingContext.ts (manage current mode)
│  ├─ useFocusSession.ts (manage focus state)
│  └─ useContextAwareCapture.ts (quick capture by mode)
│
└─ lib/
   ├─ operatingModes.ts (mode definitions & logic)
   ├─ workspaceMemory.ts (storage & retrieval)
   └─ contextAwareUI.ts (UI switches per mode)
```

---

## Phase 8: Implementation Begins

**Starting Point:** Current working demo with all components

**Approach:** Evolve, not rebuild
- Keep all existing systems (Tasks, Projects, Calendar, Focus, Brain)
- Add new orchestration (Timeline controls, context awareness)
- Redesign surfaces (dashboards, navigation, quick capture)
- Preserve data structures (no schema changes)

**Success Criteria:**
- ✅ Focus Session active → entire UI transforms
- ✅ Switch contexts → workspace memory restores
- ✅ Quick Capture → options adapt to current mode
- ✅ Home → personalized greeting (no dashboard widgets)
- ✅ Each mode feels like distinct workspace
- ✅ Timeline visible from every view
- ✅ Assistant Panel present & context-aware
- ✅ Demo mode shows all features working

---

## Design Philosophy (Holdovers from Current)

**Preserve:**
- Clean, minimal aesthetic (Apple/Linear/Raycast inspiration)
- Large whitespace, rounded corners, subtle shadows
- Excellent typography
- Calm interface
- Smooth animations (Framer Motion)
- Mobile-first responsive design
- No information overload

**Enhance:**
- Focus on context immersion (not navigation)
- Workspace memory (continuity)
- Orchestration via Timeline (not fragmented)
- Assistant as sidekick (not replacement)

**Remove:**
- Database tables (replace with surfaces)
- Generic command palette (replace with context-aware search)
- Dashboard widgets (replace with mode-specific sections)
- Static Quick Capture (replace with adaptive)

---

## Next: Phase 8 Implementation

All code changes will be made in ONE continuous push. No branching, no intermediate commits. Complete redesign → full test → push to main.

**Architecture changes are surgical and backwards-compatible:**
- New components alongside existing ones
- New hooks complement existing logic
- Storage structures enhanced, not replaced
- Everything optional until switchover

Ready to begin implementation.
