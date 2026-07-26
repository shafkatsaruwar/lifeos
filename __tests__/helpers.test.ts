import { checkDoubleBooking, formatDueDate, toDateKey } from '@/lib/helpers';
import { Task } from '@/lib/validation';

describe('Task Helpers', () => {
  const today = new Date(2026, 6, 10, 12);

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(today);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const mockTask = (overrides?: Partial<Task>): Task => ({
    id: 1,
    title: 'Test Task',
    project: 'Test',
    color: '#625af6',
    due: '2026-07-10',
    priority: 'High',
    focusMinutes: 45,
    energy: 'High',
    ...overrides,
  });

  describe('checkDoubleBooking', () => {
    it('detects time overlap on same date', () => {
      const tasks = [
        mockTask({ startTime: '14:00', focusMinutes: 60 }),
      ];
      const conflicts = checkDoubleBooking(tasks, 3, '2026-07-10', '14:30', 45);
      expect(conflicts).toHaveLength(1);
    });

    it('allows non-overlapping times on same date', () => {
      const tasks = [
        mockTask({ startTime: '14:00', focusMinutes: 45 }),
        mockTask({ id: 2, startTime: '15:00', focusMinutes: 60 }),
      ];
      const conflicts = checkDoubleBooking(tasks, 3, '2026-07-10', '16:00', 45);
      expect(conflicts).toHaveLength(0);
    });

    it('ignores tasks without start time', () => {
      const tasks = [
        mockTask({ startTime: undefined }),
        mockTask({ id: 2, startTime: '14:00', focusMinutes: 60 }),
      ];
      const conflicts = checkDoubleBooking(tasks, 3, '2026-07-10', '14:30', 45);
      expect(conflicts).toHaveLength(1);
    });

    it('ignores completed tasks', () => {
      const tasks = [
        mockTask({ done: true, startTime: '14:00', focusMinutes: 60 }),
        mockTask({ id: 2, startTime: '14:30', focusMinutes: 45 }),
      ];
      const conflicts = checkDoubleBooking(tasks, 3, '2026-07-10', '14:30', 45);
      expect(conflicts).toHaveLength(1);
    });

    it('ignores canceled tasks', () => {
      const tasks = [
        mockTask({ canceled: true, startTime: '14:00', focusMinutes: 60 }),
        mockTask({ id: 2, startTime: '14:30', focusMinutes: 45 }),
      ];
      const conflicts = checkDoubleBooking(tasks, 3, '2026-07-10', '14:30', 45);
      expect(conflicts).toHaveLength(1);
    });

    it('ignores different dates even if times overlap', () => {
      const tasks = [
        mockTask({ id: 2, due: '2026-07-11', startTime: '14:30', focusMinutes: 45 }),
      ];
      const conflicts = checkDoubleBooking(tasks, 3, '2026-07-10', '14:30', 45);
      expect(conflicts).toHaveLength(0);
    });

    it('ignores same task ID', () => {
      const tasks = [mockTask({ startTime: '14:00', focusMinutes: 60 })];
      const conflicts = checkDoubleBooking(tasks, 1, '2026-07-10', '14:00', 60);
      expect(conflicts).toHaveLength(0);
    });

    it('returns empty array if no start time provided', () => {
      const tasks = [mockTask({ startTime: '14:00', focusMinutes: 60 })];
      const conflicts = checkDoubleBooking(tasks, 3, '2026-07-10');
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('formatDueDate', () => {
    it('formats today as "Today"', () => {
      expect(formatDueDate('2026-07-10')).toBe('Today');
    });

    it('formats tomorrow as "Tomorrow"', () => {
      expect(formatDueDate('2026-07-11')).toBe('Tomorrow');
    });

    it('formats other dates as "Mon DD"', () => {
      expect(formatDueDate('2026-07-17')).toMatch(/Jul \d+/);
    });
  });

  describe('toDateKey', () => {
    it('formats date as YYYY-MM-DD', () => {
      const result = toDateKey(today);
      expect(result).toBe('2026-07-10');
    });

    it('pads month and day with zeros', () => {
      const earlyDate = new Date(2026, 0, 5, 12);
      expect(toDateKey(earlyDate)).toBe('2026-01-05');
    });
  });
});
