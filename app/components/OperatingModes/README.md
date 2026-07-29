# Operating Modes Components

## Overview

The Operating Modes system is the core UI orchestration layer for LifeOS 3.0. It provides a context-aware, immersive experience where the entire interface adapts based on the user's current operating mode (Work, School, Life, Photography, Travel, Health, Study Abroad).

## Architecture

### Core Components (Tier 1 - Atomic)

#### `ModeHero.tsx`
Displays personalized greeting, current focus session status, or next event with action buttons.

**Props:**
- `context: OperatingContext` - Current operating mode
- `greeting: string` - Personalized greeting message
- `focusSession?: FocusSession | null` - Active focus session
- `ambientActivity?: AmbientActivity | null` - Current activity
- `nextEvent?: { time: string; title: string } | null` - Next calendar event
- `onStartFocus: () => void` - Focus session callback

**Features:**
- Shows date (day, month, date)
- Displays active focus session with timer and pause button
- Shows next event with focus button
- Falls back to "Start Focus Session" button
- Fully responsive with mobile layout support

---

#### `QuickActionsBar.tsx`
Context-specific quick capture buttons that change based on operating mode.

**Props:**
- `actions: QuickCaptureOption[]` - Array of available actions
- `onAction: (action: string) => void` - Action callback

**Features:**
- Horizontally scrollable (hidden scrollbar)
- Smooth animations on mount
- Staggered appearance of buttons
- Hover states with visual feedback
- Fully responsive design

---

#### `StatusSection.tsx`
Groups alerts/tasks by urgency level (urgent, upcoming, active).

**Props:**
- `alerts: StatusAlert[]` - Array of status alerts
- `onAlert: (alert: StatusAlert) => void` - Alert click callback

**Type:**
```typescript
type StatusAlert = {
  id: string;
  level: 'urgent' | 'upcoming' | 'active';
  title: string;
  meta?: string;
  icon?: string;
  color?: string;
  action?: string;
};
```

**Features:**
- Three categories: 🔴 URGENT (Today), 🟡 THIS WEEK, 🟢 IN PROGRESS
- Animated entry with staggered motion
- Clickable alerts with hover states
- Empty state when no alerts present

---

#### `AssistantPanel.tsx`
Right sidebar showing timeline, focus status, quick actions, and AI suggestions.

**Props:**
- `timeline: CalendarEvent[]` - Calendar events for today
- `focusSession?: FocusSession | null` - Active focus session
- `suggestions: string[]` - AI suggestions
- `onAction: (action: string, context?: any) => void` - Action callback

**Features:**
- Today's Timeline (next 3 events)
- Current Focus status display
- Quick Actions (+ Task, + Project, + Capture)
- AI Tips suggestions
- Desktop-only (hidden on <1024px)
- Fixed width 280px sidebar

---

#### `ProjectCard.tsx`
Displays a project/course with status, momentum indicator, and metadata.

**Props:**
```typescript
type ProjectCardProps = {
  project: Project;
  momentum?: 'High' | 'Medium' | 'Dormant' | 'Blocked';
  linkedTaskCount?: number;
  nextMilestone?: { title: string; dueDate: string } | null;
  lastUpdated?: string;
  onClick?: () => void;
  onTitleClick?: () => void;
};
```

**Features:**
- Momentum indicator with color coding
- Linked task count display
- Next milestone information
- Last updated timestamp
- Hover animation (translateY)
- Fully responsive

---

### Composite Components (Tier 2)

#### `OperatingModeLayout.tsx`
Wrapper providing consistent structure for all operating modes.

**Props:**
- `context: OperatingContext`
- `greeting: string`
- `focusSession?: FocusSession | null`
- `timeline: CalendarEvent[]`
- `alerts: StatusAlert[]`
- `suggestions: string[]`
- `children: React.ReactNode` - Mode-specific content
- Callback handlers for actions

**Structure:**
```
┌─────────────────────────────────────────┐
│  Mode Navigation Tabs                   │
├──────────┬────────────────┬──────────────┤
│          │                │              │
│ Sidebar  │  Main Content  │  Assistant   │
│          │    (Hero       │   Panel      │
│          │   Quick Actions│  (Timeline,  │
│          │   Alerts       │   Focus,     │
│          │   Mode Content │   Suggestions)
│          │   ModeHero →   │              │
│          │   QuickActions │              │
│          │   Status       │              │
│          │   Children)    │              │
│          │                │              │
└──────────┴────────────────┴──────────────┘
```

**Features:**
- Context-aware navigation tabs
- Left sidebar with focus and event widgets
- Central content area with hero, actions, alerts
- Right assistant panel
- Responsive grid layout
- Desktop/tablet/mobile breakpoints

---

### Mode-Specific Components (Tier 3)

#### `WorkMode.tsx`
Dashboard for Work operating context.

**Features:**
- Active Projects grid
- Completed This Month section
- On Hold projects count
- Empty state with call-to-action
- Project count badges

---

#### `SchoolMode.tsx`
Dashboard for School operating context.

**Features:**
- Due Soon assignments list
- Active Courses grid
- Completed Courses section
- Assignment metadata (course name, due date)
- Course count tracking

---

#### `LifeMode.tsx`
Dashboard for Life operating context.

**Features:**
- Personal Projects grid
- Achievements section
- Decorative empty state with heart icon
- Personal goal focus

---

#### `StudyAbroadMode.tsx`
Dashboard for Study Abroad operating context.

**Features:**
- Application Pipeline Overview (status counts)
- Universities Grid sorted by application status
- Status badges (Accepted, Submitted, Rejected, Waitlisted)
- Application deadline tracking
- Visual status indicators

---

### Orchestration Component

#### `OperatingModeView.tsx`
Main orchestrator that renders the appropriate mode based on operating context.

**Props:** `OperatingModeViewProps` (comprehensive)

**Features:**
- Routes to correct mode component based on context
- Passes all props through to OperatingModeLayout
- Renders mode-specific content dynamically
- Fallback to Work mode

---

### Full-Screen Focus

#### `FocusMode.tsx`
Immersive full-screen focus interface replacing the entire UI during focus sessions.

**Features:**
- Animated gradient background
- Circular progress ring (SVG-based)
- Large timer display (HH:MM:SS format)
- Play/Pause/End controls
- Close button (X)
- AI mode indicator
- Glassmorphism UI with backdrop blur
- Fully responsive

---

## Custom Hooks

### `useOperatingContext.ts`
Orchestrates operating mode context, workspace memory, and focus sessions.

**Returns:**
```typescript
{
  // State
  currentContext: OperatingContext;
  focusSession: FocusSession | null;
  ambientActivity: AmbientActivity | null;
  timeline: CalendarEvent[];
  workspace: WorkspaceMemory;

  // Context switching
  switchContext: (context: OperatingContext) => void;

  // Focus session management
  startFocus: (session: FocusSession) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  endFocus: () => void;

  // Activity logging
  logAmbientActivity: (activity: AmbientActivity) => void;

  // Data updates
  updateTimeline: (events: CalendarEvent[]) => void;
  selectItem: (itemId: string) => void;
  handleScroll: (position: number) => void;

  // UI helpers
  getGreeting: () => string;
  getNextEvent: () => { time: string; title: string } | null;
}
```

---

## Configuration

### `contextAwarUI.ts` (`lib/contextAwarUI.ts`)
Maps each Operating Context to its own UI configuration:

**Quick Capture Options:**
- **Work:** Task, Meeting, Bug, Idea, Note
- **School:** Assignment, Lecture, Research, Question, Note
- **Life:** Task, Workout, Meal, Mood, Note
- **Photography:** Shoot, Location, Editing, Gear, Inspiration
- **Travel:** Task, Place, Restaurant, Experience, Note
- **Health:** Workout, Meal, Sleep, Mood, Medication
- **Study Abroad:** Program, Application, Scholarship, Document, Note

**Per-Context Configuration:**
- Hero greeting message
- Status section label
- Projects/courses label
- Empty state message
- AI personality ("work-assistant", "study-partner", "life-coach", etc.)
- Default focus goal

---

### Workspace Memory (`lib/useWorkspaceMemory.ts`)
Persists per-context UI state to localStorage:

**Tracked State:**
- Current operating context
- Last visited timestamp
- Active section/item
- Selected item ID
- Scroll position
- Expanded/collapsed sections
- Filter state

**Usage:**
```typescript
const { workspace, updateMemory, saveActiveSection, saveScrollPosition } = 
  useWorkspaceMemory(context);
```

---

## Styling Strategy

All components use **inline CSS-in-JS** (`<style jsx>`) following these principles:

1. **Design System Variables:**
   - `--bg-primary`, `--bg-secondary`
   - `--text-primary`, `--text-secondary`
   - Brand purple: `#625af6`

2. **Animations:**
   - Framer Motion for interactive elements
   - CSS @keyframes for continuous animations (gradient, pulse)
   - Smooth transitions (0.2s-0.3s)

3. **Spacing:**
   - 8px base unit
   - Gap: 8px, 12px, 16px, 20px, 24px, 32px
   - Padding: consistent with gap

4. **Responsive Design:**
   - Desktop: full layout with sidebar and assistant panel
   - Tablet (≤1024px): hide sidebar
   - Mobile (≤768px): stack vertically, adjust padding

5. **Visual Hierarchy:**
   - Large whitespace
   - Subtle borders (rgba opacity)
   - Rounded corners (4px-12px)
   - Soft shadows
   - Color-coded momentum/status

---

## Integration Guide

### Basic Setup

```typescript
import { OperatingModeView } from '@/app/components/OperatingModes';
import { useOperatingContext } from '@/app/hooks';

export default function Dashboard() {
  const {
    currentContext,
    focusSession,
    timeline,
    workspace,
    getGreeting,
    getNextEvent,
    switchContext,
    startFocus,
  } = useOperatingContext('Work');

  return (
    <OperatingModeView
      context={currentContext}
      greeting={getGreeting()}
      focusSession={focusSession}
      nextEvent={getNextEvent()}
      timeline={timeline}
      alerts={[/* ... */]}
      suggestions={[/* ... */]}
      projects={[/* ... */]}
      momentumMap={{ /* ... */ }}
      onStartFocus={() => startFocus(/* ... */)}
      onAlert={() => {}}
      onAction={() => {}}
      onContextSwitch={switchContext}
      onProjectClick={() => {}}
      onNewProject={() => {}}
    />
  );
}
```

---

## Data Flow

```
LifeOS App
    ↓
useOperatingContext Hook
    ├→ currentContext (Work, School, Life, etc.)
    ├→ focusSession (active/paused/null)
    ├→ workspace (saved UI state)
    └→ timeline (calendar events)
    ↓
OperatingModeView
    ↓
OperatingModeLayout
    ├→ ModeHero
    ├→ QuickActionsBar (contextAwarUI config)
    ├→ StatusSection
    └→ Mode Content
        ├→ WorkMode
        ├→ SchoolMode
        ├→ LifeMode
        ├→ StudyAbroadMode
        └→ [ProjectCard, AssignmentItem, etc.]
    └→ AssistantPanel
        ├→ Timeline
        ├→ Focus Status
        └→ Suggestions

When Focus Active:
    FocusMode (full-screen overlay)
        ├→ Timer Circle (SVG progress)
        ├→ Controls
        └→ AI Indicator
```

---

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid, Flexbox, CSS Custom Properties
- SVG for progress ring
- CSS filter: blur (backdrop)
- Motion via CSS and JavaScript (Framer Motion)

---

## Performance Considerations

1. **Memoization:** Components use Framer Motion's built-in optimizations
2. **Lazy Loading:** Mode content renders only for active context
3. **Scroll Performance:** Passive scroll listeners with debounced workspace memory saves
4. **Animation Performance:** Hardware-accelerated transforms (translate, scale, opacity)
5. **Bundle Size:** Inline styles reduce CSS bundle; Framer Motion used as peer dependency

---

## Future Enhancements

1. **Drag-and-drop:** Reorder projects, drag tasks between modes
2. **Collaboration:** Real-time sync when multiple users in same mode
3. **Analytics:** Track context switches, focus session metrics
4. **Custom Themes:** Per-context color schemes
5. **Keyboard Navigation:** Tab through sections, keyboard shortcuts
6. **A11y:** Screen reader support, focus indicators, ARIA labels
7. **PWA Support:** Offline mode, app install prompts
8. **Mobile App:** React Native adaptation

---

## Troubleshooting

### Components Not Rendering
- Verify imports use correct paths
- Check TypeScript types match data structures
- Ensure Framer Motion is installed

### Animations Janky
- Check for unnecessary re-renders
- Use React DevTools Profiler
- Ensure CSS transforms used (not layout properties)

### Workspace Memory Not Persisting
- Verify localStorage is accessible
- Check browser dev tools → Application → Local Storage
- Ensure `useWorkspaceMemory` hook is called at top level

### Quick Actions Not Changing
- Verify `contextAwarUI.ts` has config for current context
- Check context value passed to `getContextAwareConfig()`
- Ensure `onAction` callback is wired correctly
