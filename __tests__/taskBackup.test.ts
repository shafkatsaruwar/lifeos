import { coerceFirebaseList, parseTasksFromCloud } from '@/lib/validation';
import { readTaskBackup, writeTaskBackup, clearTaskBackup } from '@/lib/taskBackup';
import { STORAGE_KEYS } from '@/lib/constants';

describe('parseTasksFromCloud', () => {
  const valid = {
    id: 1,
    title: 'Ship it',
    project: 'Inbox',
    color: '#625af6',
    due: '2026-08-26',
    priority: 'High',
    focusMinutes: 45,
    energy: 'High',
  };

  it('coerces object maps to arrays', () => {
    expect(coerceFirebaseList({ 0: valid, 2: { ...valid, id: 2, title: 'Two' } })).toHaveLength(2);
  });

  it('repairs out-of-range focusMinutes instead of dropping the task', () => {
    const parsed = parseTasksFromCloud([{ ...valid, focusMinutes: 1 }]);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].focusMinutes).toBeGreaterThanOrEqual(5);
  });
});

describe('taskBackup', () => {
  const userId = 'user-abc';

  beforeEach(() => {
    clearTaskBackup(userId);
    window.localStorage.removeItem(STORAGE_KEYS.TASKS);
  });

  it('round-trips a keyed backup', () => {
    writeTaskBackup(userId, [{ id: 1, title: 'Backed up' }]);
    expect(readTaskBackup(userId)).toEqual([{ id: 1, title: 'Backed up' }]);
  });

  it('falls back to the legacy localStorage key', () => {
    window.localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([{ id: 9, title: 'Legacy' }]));
    expect(readTaskBackup(userId)?.[0]).toMatchObject({ title: 'Legacy' });
  });
});
