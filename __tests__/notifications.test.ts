import { createSampleWorkHub, emptyWorkHub, isSampleWorkHub } from '@/app/components/OSDashboards';
import { generateLifeOSNotifications } from '@/lib/notifications';

describe('notifications tied to real workspace data', () => {
  const now = new Date(2026, 7, 2, 12);

  it('detects the auto-seeded sample WorkOS hub', () => {
    expect(isSampleWorkHub(createSampleWorkHub(now))).toBe(true);
    expect(isSampleWorkHub(emptyWorkHub)).toBe(false);
    expect(isSampleWorkHub({
      ...createSampleWorkHub(now),
      projects: [{ id: 'proj-mine', name: 'My Project', color: '#625af6', status: 'active', createdAt: now.toISOString() }],
      tasks: [{ id: 'task-mine', deliverableId: 'del-marketing-brief', title: 'Real task', status: 'open', priority: 'medium', dueDate: '2026-08-02', createdAt: now.toISOString() }],
    })).toBe(false);
  });

  it('emits no notifications for an empty workspace', () => {
    const notifications = generateLifeOSNotifications({
      now,
      workHub: emptyWorkHub,
      tasks: [],
      projects: [],
      classes: [],
      events: [],
    });
    expect(notifications).toEqual([]);
  });

  it('only notifies life tasks linked to an existing space (or Inbox)', () => {
    const notifications = generateLifeOSNotifications({
      now,
      workHub: emptyWorkHub,
      tasks: [
        { id: 1, title: 'Ship portfolio', project: 'Portfolio', due: '2026-08-02', done: false },
        { id: 2, title: 'Ghost demo task', project: 'Synapse', due: '2026-08-02', done: false },
        { id: 3, title: 'Unassigned chore', project: '', due: '2026-08-02', done: false },
      ],
      projects: [{ name: 'Portfolio', kind: 'finishable' }],
      classes: [],
      events: [],
      settings: { enableWorkOS: false, enableSchoolOS: false, enableLifeOS: true, calendarAlerts: false },
    });

    const taskNotes = notifications.filter(item => item.kind === 'task');
    expect(taskNotes.map(item => item.title).sort()).toEqual(['Ship portfolio', 'Unassigned chore']);
    expect(taskNotes.find(item => item.title === 'Ship portfolio')?.subtitle).toBe('Portfolio');
    expect(taskNotes.find(item => item.title === 'Unassigned chore')?.subtitle).toBe('Inbox');
    expect(notifications.find(item => item.title === 'Ghost demo task')).toBeUndefined();
    expect(notifications.some(item => item.kind === 'project' && item.title === 'Portfolio')).toBe(true);
  });

  it('creates a project rollup only when tasks belong to that real project', () => {
    const notifications = generateLifeOSNotifications({
      now,
      workHub: emptyWorkHub,
      tasks: [
        { id: 1, title: 'Draft case study', project: 'Portfolio', due: '2026-08-03', done: false },
        { id: 2, title: 'Pick photos', project: 'Portfolio', due: '2026-08-04', done: false },
      ],
      projects: [{ name: 'Portfolio', kind: 'finishable' }],
      classes: [],
      events: [],
      settings: { enableWorkOS: false, enableSchoolOS: false, enableLifeOS: true, calendarAlerts: false },
    });

    const projectNote = notifications.find(item => item.kind === 'project');
    expect(projectNote?.title).toBe('Portfolio');
    expect(projectNote?.subtitle).toBe('2 tasks due');
    expect(projectNote?.action).toEqual({ type: 'life-project', projectName: 'Portfolio' });
    expect(notifications.filter(item => item.kind === 'task')).toHaveLength(2);
  });

  it('skips orphaned work tasks that do not resolve to a project', () => {
    const notifications = generateLifeOSNotifications({
      now,
      workHub: {
        projects: [],
        deliverables: [],
        tasks: [
          { id: 'orphan', deliverableId: 'missing', title: 'Orphan work task', status: 'open', priority: 'high', dueDate: '2026-08-02', createdAt: now.toISOString() },
        ],
        meetings: [],
      },
      tasks: [],
      projects: [],
      classes: [],
      events: [],
      settings: { enableWorkOS: true, enableSchoolOS: false, enableLifeOS: false, calendarAlerts: false },
    });

    expect(notifications).toEqual([]);
  });

  it('notifies work tasks with the owning project name and a task action', () => {
    const hub = createSampleWorkHub(now);
    const notifications = generateLifeOSNotifications({
      now,
      workHub: hub,
      tasks: [],
      projects: [],
      classes: [],
      events: [],
      settings: { enableWorkOS: true, enableSchoolOS: false, enableLifeOS: false, calendarAlerts: false },
    });

    const taskNote = notifications.find(item => item.id === 'work-task-task-1');
    expect(taskNote?.title).toBe('Design landing page');
    expect(taskNote?.subtitle).toBe('WorkOS Redesign');
    expect(taskNote?.action).toEqual({ type: 'work', view: 'tasks', itemId: 'task-1' });
  });

  it('only notifies school tasks for non-archived classes that exist', () => {
    const notifications = generateLifeOSNotifications({
      now,
      workHub: emptyWorkHub,
      tasks: [
        { id: 10, title: 'Lab report', project: 'BIO 101', classId: 'class-bio', academicType: 'Lab', due: '2026-08-02' },
        { id: 11, title: 'Ghost homework', project: 'CHEM', classId: 'missing', academicType: 'Assignment', due: '2026-08-02' },
      ],
      projects: [],
      classes: [{ id: 'class-bio', code: 'BIO 101' }],
      events: [],
      settings: { enableWorkOS: false, enableSchoolOS: true, enableLifeOS: false, calendarAlerts: false },
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Lab report');
    expect(notifications[0].subtitle).toBe('BIO 101 · Lab');
    expect(notifications[0].action).toEqual({ type: 'school-task', taskId: 10 });
  });
});
