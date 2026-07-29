# WorkOS Implementation: Technical Plan

## System Reuse Analysis

### What Reuse Maps
| WorkOS Need | Reuses | How |
|------------|--------|-----|
| Job Applications | Projects | Each app = Project with tasks |
| Interview Schedule | Calendar | Interview dates = Calendar events |
| Interview Prep | Tasks + Focus Sessions | Prep tasks + deep work blocks |
| Recruiters | Brain + Tasks | Brain items as contacts + follow-up tasks |
| Certifications | Projects + Tasks | Cert = Project, studying = tasks |
| Skills | Brain items (structured) | Brain item with skill metadata |
| Portfolio Projects | Projects (subset) | Mark projects as portfolio items |
| Opportunities | Brain + Calendar + Projects | Leads in inbox, events on calendar |
| Professional Goals | Projects | Goals as projects, progress from tasks |
| Momentum | Existing momentum engine | Automatically feeds from tasks/focus |

### No New Entities Required
- No "Application" table
- No "Interview" table
- No "Recruiter" table
- No "Skill" table
- No "Goal" table
- No "Opportunity" table

All map to existing entities with enhanced display.

---

## Component Architecture

### Current WorkDashboard Structure
```tsx
WorkDashboard
├─ Header (date, hero)
├─ QuickActions (buttons)
├─ Layout (main + sidebar)
│  ├─ Main column
│  │  ├─ Section: "This week's work" (tasks)
│  │  └─ Section: "Active projects" (project grid)
│  └─ Sidebar
│     └─ Section: "Work databases" (4 buttons to collections)
```

### New WorkDashboard Structure
```tsx
WorkDashboard
├─ Header (new hero message: "What moves work forward?")
├─ QuickActions (expanded to 5-6 relevant actions)
├─ Dashboard Cards
│  ├─ URGENT section
│  │  ├─ Interviews this week
│  │  ├─ Application deadlines
│  │  └─ Follow-up tasks due
│  ├─ HIGH MOMENTUM section
│  │  ├─ ProjectCards (active projects)
│  │  └─ Goal progress
│  ├─ INTERVIEW PIPELINE
│  │  └─ InterviewPipeline (kanban view)
│  ├─ PROFESSIONAL GOALS
│  │  └─ GoalCards (progress connected to projects)
│  ├─ PORTFOLIO
│  │  └─ PortfolioCards (featured projects)
│  └─ SKILLS
│     └─ SkillCards (top skills with context)
```

---

## New Components to Create

### 1. ProjectCard
**File:** `app/components/WorkOS/ProjectCard.tsx`

**Props:**
```typescript
interface ProjectCardProps {
  project: DashboardProject;
  momentum?: string; // "high" | "medium" | "dormant" | "blocked"
  lastActivity?: string; // ISO date
  linkedTasksCount?: number;
  recentNotes?: Note[];
  onOpen: () => void;
  onQuickAction: () => void;
}
```

**Displays:**
- Project name + color
- Progress bar
- Momentum indicator (🔥 active, 😴 dormant, ⏸ blocked)
- Last activity time
- Task count
- Next action button
- Optional: Recent notes preview

**Design:** Card with colored left border, progress bar at bottom

---

### 2. PortfolioCard
**File:** `app/components/WorkOS/PortfolioCard.tsx`

**Props:**
```typescript
interface PortfolioCardProps {
  project: DashboardProject;
  metadata?: {
    description?: string;
    techStack?: string[];
    featured?: boolean;
    image?: string;
    github?: string;
    website?: string;
  };
  onOpen: () => void;
}
```

**Displays:**
- Hero image (if available)
- Project name
- Short description
- Tech stack badges
- Links to GitHub/Website
- "View Project" button

**Design:** Card with image at top, clean typography

---

### 3. SkillCard
**File:** `app/components/WorkOS/SkillCard.tsx`

**Props:**
```typescript
interface SkillCardProps {
  skill: {
    name: string;
    proficiency: "Beginner" | "Intermediate" | "Advanced" | "Expert";
    projectCount: number;
    lastUsed?: string;
    certifications?: string[];
    learning?: string;
  };
  onOpen: () => void;
}
```

**Displays:**
- Skill name
- Proficiency level (visual bar)
- Number of projects using it
- Last used (from project momentum)
- Next learning step (if available)
- Certification badges

**Design:** Compact card, icon-based proficiency

---

### 4. InterviewPipeline
**File:** `app/components/WorkOS/InterviewPipeline.tsx`

**Props:**
```typescript
interface InterviewPipelineProps {
  applications: DashboardProject[]; // Projects tagged as applications
  stages?: string[]; // Custom pipeline stages
  onOpen: (projectName: string) => void;
}
```

**Displays:**
- Kanban-style columns: Prospect → Phone Screen → Technical → Offer/Rejection
- Application projects in columns
- Count in each stage
- Drag to update stage (future enhancement)

**Design:** Horizontal cards in columns, clean layout

---

### 5. GoalCard
**File:** `app/components/WorkOS/GoalCard.tsx`

**Props:**
```typescript
interface GoalCardProps {
  goal: {
    name: string;
    progress: number; // 0-100 from linked project
    linkedProject?: DashboardProject;
    linkedTasks?: DashboardTask[];
    targetDate?: string;
    status: "active" | "paused" | "achieved";
  };
  onOpen: () => void;
}
```

**Displays:**
- Goal name
- Progress bar (from project/tasks)
- Linked project name
- Task count
- Time remaining
- Status indicator

**Design:** Card with progress bar, milestone breakdown optional

---

### 6. UrgentAlerts
**File:** `app/components/WorkOS/UrgentAlerts.tsx`

**Props:**
```typescript
interface UrgentAlertsProps {
  upcomingInterviews: CalendarEvent[];
  applicationDeadlines: DashboardTask[];
  followUpsDue: DashboardTask[];
}
```

**Displays:**
- Red alert cards for each category
- Time until deadline (countdown)
- Quick action buttons
- Visual differentiation by severity

**Design:** Alert cards, red/orange color scheme

---

### 7. MomentumSection
**File:** `app/components/WorkOS/MomentumSection.tsx`

**Props:**
```typescript
interface MomentumSectionProps {
  projects: DashboardProject[];
  filter?: "high" | "medium" | "dormant" | "blocked";
}
```

**Displays:**
- ProjectCards filtered by momentum
- Grouped by momentum level
- Counts per group

**Design:** Section with multiple ProjectCard rows

---

## Component Updates

### WorkDashboard Changes
**File:** `app/components/OSDashboards.tsx` → WorkDashboard function

**Remove:**
- Database table links in sidebar

**Add:**
- URGENT section (UrgentAlerts)
- HIGH MOMENTUM section (MomentumSection)
- INTERVIEW PIPELINE (InterviewPipeline)
- PROFESSIONAL GOALS (multiple GoalCards)
- PORTFOLIO (multiple PortfolioCards)
- SKILLS (multiple SkillCards)

**Keep:**
- Header/hero
- Quick actions (enhance with more options)
- Same responsive layout

---

## Data Transformation

### Helper Functions to Create
**File:** `lib/workosHelpers.ts`

```typescript
// Extract portfolio projects from all projects
export function getPortfolioProjects(
  projects: Project[],
  portfolioMetadata?: Record<string, PortfolioMeta>
): Project[]

// Calculate application pipeline stages
export function getApplicationsByStage(
  projects: Project[]
): Record<string, Project[]>

// Get upcoming interviews from calendar and projects
export function getUpcomingInterviews(
  events: CalendarEvent[],
  projects: Project[]
): CalendarEvent[]

// Get application deadlines
export function getApplicationDeadlines(
  projects: Project[],
  tasks: Task[]
): Task[]

// Parse skills from brain items
export function getSkills(
  brainItems: BrainItem[]
): SkillObject[]

// Extract professional goals
export function getProfessionalGoals(
  projects: Project[]
): GoalObject[]

// Calculate momentum for projects
export function getProjectMomentum(
  project: Project,
  tasks: Task[],
  focusSessions: FocusSession[]
): "high" | "medium" | "dormant" | "blocked"

// Get last activity date for project
export function getProjectLastActivity(
  project: Project,
  tasks: Task[],
  notes: Note[]
): Date | null
```

---

## UI Changes Summary

### Before
- 4 database buttons in sidebar
- Empty tasks section
- Project grid
- No context, no momentum visible

### After
- 5-6 quick action buttons (context-aware)
- URGENT section (red alerts)
- HIGH MOMENTUM section (active projects)
- INTERVIEW PIPELINE (visual workflow)
- PROFESSIONAL GOALS (with progress)
- PORTFOLIO (beautiful cards)
- SKILLS (with context)
- Momentum indicators throughout
- Beautiful empty states
- Activity feeds

---

## File Structure

```
app/components/WorkOS/
├─ ProjectCard.tsx         ← Beautiful project display
├─ PortfolioCard.tsx       ← Showcase display
├─ SkillCard.tsx           ← Skill object with context
├─ GoalCard.tsx            ← Goal with connected progress
├─ InterviewPipeline.tsx   ← Kanban-style workflow
├─ UrgentAlerts.tsx        ← Red alert cards
├─ MomentumSection.tsx     ← Projects filtered by momentum
└─ types.ts                ← TypeScript definitions

lib/
└─ workosHelpers.ts        ← Data transformation helpers
```

---

## Implementation Order

1. **Create data helpers** (`workosHelpers.ts`)
   - Extract data from existing systems
   - Transform to component-friendly format

2. **Create card components** (ProjectCard, PortfolioCard, SkillCard, GoalCard)
   - Start with simpler cards (SkillCard)
   - Build up to complex ones (ProjectCard)
   - Focus on design, not data fetching

3. **Create section components** (UrgentAlerts, MomentumSection)
   - Use card components
   - Handle layout and grouping

4. **Create pipeline component** (InterviewPipeline)
   - Visual workflow representation
   - Kanban-style columns

5. **Update WorkDashboard**
   - Import new components
   - Replace old sections
   - Compose all together

6. **Test and polish**
   - Responsive design
   - Empty states
   - Edge cases

---

## No Breaking Changes

- Existing task system unchanged
- Existing project system unchanged
- Existing calendar unchanged
- All other contexts unaffected
- Firebase sync unaffected
- Navigation unchanged

This is purely a presentation layer redesign, no system changes.

---

## Success Criteria

✅ WorkOS no longer shows empty database tables  
✅ Dashboard answers "What should I work on today?"  
✅ All data comes from existing systems  
✅ Beautiful project cards with momentum  
✅ Interview pipeline visible  
✅ Portfolio projects showcased  
✅ Skills show their context  
✅ Goals show their progress  
✅ Responsive on mobile  
✅ No new databases or data structures  

---

## Next: Implementation

Start with component structure and helpers, then wire into WorkDashboard.
