import { validateTasks, validateProjects, validateCalendarEvents, TaskSchema } from '@/lib/validation';

describe('Data Validation', () => {
  describe('TaskSchema', () => {
    const validTask = {
      id: 1,
      title: 'Test Task',
      project: 'Test',
      color: '#625af6',
      due: '2026-07-10',
      priority: 'High',
      focusMinutes: 45,
      energy: 'High',
    };

    it('validates correct task', () => {
      const result = TaskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it('rejects missing required fields', () => {
      const { title, ...incomplete } = validTask;
      const result = TaskSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it('rejects invalid priority', () => {
      const result = TaskSchema.safeParse({
        ...validTask,
        priority: 'Urgent',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid energy level', () => {
      const result = TaskSchema.safeParse({
        ...validTask,
        energy: 'Extreme',
      });
      expect(result.success).toBe(false);
    });

    it('rejects focus minutes out of range', () => {
      expect(TaskSchema.safeParse({ ...validTask, focusMinutes: 1 }).success).toBe(false);
      expect(TaskSchema.safeParse({ ...validTask, focusMinutes: 500 }).success).toBe(false);
    });

    it('allows optional fields', () => {
      const result = TaskSchema.safeParse({
        ...validTask,
        checklist: ['item1', 'item2'],
        checklistProgress: [true, false],
        done: false,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('validateTasks', () => {
    it('validates array of tasks', () => {
      const tasks = [
        {
          id: 1,
          title: 'Task 1',
          project: 'Project',
          color: '#625af6',
          due: '2026-07-10',
          priority: 'High',
          focusMinutes: 45,
          energy: 'High',
        },
      ];
      const result = validateTasks(tasks);
      expect(result.success).toBe(true);
    });

    it('rejects invalid tasks array', () => {
      const result = validateTasks('not an array');
      expect(result.success).toBe(false);
    });

    it('rejects array with invalid task', () => {
      const tasks = [
        {
          id: 1,
          title: 'Valid Task',
          project: 'Project',
          color: '#625af6',
          due: '2026-07-10',
          priority: 'High',
          focusMinutes: 45,
          energy: 'High',
        },
        {
          id: 2,
          // Missing required fields
          title: 'Invalid Task',
        },
      ];
      const result = validateTasks(tasks);
      expect(result.success).toBe(false);
    });
  });

  describe('validateProjects', () => {
    it('validates correct project', () => {
      const projects = [
        {
          name: 'Test Project',
          kind: 'finishable',
          icon: 'Zap',
          color: '#625af6',
        },
      ];
      const result = validateProjects(projects);
      expect(result.success).toBe(true);
    });

    it('rejects invalid project kind', () => {
      const projects = [
        {
          name: 'Test',
          kind: 'invalid',
          icon: 'Zap',
          color: '#625af6',
        },
      ];
      const result = validateProjects(projects);
      expect(result.success).toBe(false);
    });
  });

  describe('validateCalendarEvents', () => {
    it('validates correct event', () => {
      const events = [
        {
          id: '1',
          title: 'Test Event',
          start: '2026-07-10T09:00:00',
          source: 'LifeOS',
          color: '#625af6',
        },
      ];
      const result = validateCalendarEvents(events);
      expect(result.success).toBe(true);
    });

    it('rejects invalid source', () => {
      const events = [
        {
          id: '1',
          title: 'Test Event',
          start: '2026-07-10T09:00:00',
          source: 'Unknown',
          color: '#625af6',
        },
      ];
      const result = validateCalendarEvents(events);
      expect(result.success).toBe(false);
    });

    it('accepts Synapse source', () => {
      const events = [
        {
          id: 'synapse-med-1-2026-07-10-0',
          title: 'Hydrocortisone',
          start: '2026-07-10T08:00',
          source: 'Synapse',
          color: '#4b8bdc',
        },
      ];
      const result = validateCalendarEvents(events);
      expect(result.success).toBe(true);
    });
  });
});
