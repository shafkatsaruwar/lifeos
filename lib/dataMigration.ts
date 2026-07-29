import { LocalTask, FocusSession, OperatingContext, OperatingContextState } from './contextArchitecture';

/**
 * Data Migration Utilities for LifeOS 3.0
 * Handles migration from legacy task systems to the new context-aware architecture
 */

export interface LegacyTask {
  id: number;
  title: string;
  project: string;
  due: string;
  priority: 'High' | 'Medium' | 'Low';
  focusMinutes: number;
  status?: string;
  notes?: string;
}

export interface MigrationReport {
  totalTasksMigrated: number;
  totalSessionsCreated: number;
  tasksByContext: Record<OperatingContext, number>;
  errors: string[];
  warnings: string[];
  timestamp: Date;
}

/**
 * Migrate legacy tasks to new LocalTask format
 */
export function migrateLegacyTasks(legacyTasks: LegacyTask[]): LocalTask[] {
  const migrated: LocalTask[] = [];
  const contextMap: Record<string, OperatingContext> = {
    'work': 'Work',
    'school': 'School',
    'life': 'Life',
    'photography': 'Photography',
    'study-abroad': 'Study Abroad',
    'travel': 'Travel',
    'health': 'Health',
  };

  legacyTasks.forEach((task, idx) => {
    try {
      // Infer context from project name
      const projectLower = task.project.toLowerCase();
      let context: OperatingContext = 'Life';

      for (const [key, value] of Object.entries(contextMap)) {
        if (projectLower.includes(key)) {
          context = value;
          break;
        }
      }

      // Convert priority
      const priorityMap = {
        'High': 'high' as const,
        'Medium': 'medium' as const,
        'Low': 'low' as const,
      };

      // Convert status
      const statusMap: Record<string, LocalTask['status']> = {
        'not started': 'todo',
        'in progress': 'in-progress',
        'done': 'done',
        'blocked': 'blocked',
        'cancelled': 'cancelled',
      };

      const migratedTask: LocalTask = {
        id: idx + 1,
        title: task.title,
        description: task.notes,
        parentType: 'project', // Default to project - can be updated manually
        parentId: task.project,
        status: statusMap[task.status?.toLowerCase() || 'not started'] || 'todo',
        priority: priorityMap[task.priority],
        dueDate: task.due,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      migrated.push(migratedTask);
    } catch (error) {
      console.error(`Failed to migrate task ${task.id}:`, error);
    }
  });

  return migrated;
}

/**
 * Create focus sessions from historical data patterns
 */
export function createFocusSessionsFromHistory(
  tasks: LocalTask[],
  context: OperatingContext
): FocusSession[] {
  const sessions: FocusSession[] = [];

  // Group tasks by context
  const contextTasks = tasks.filter(t => {
    // In a real scenario, we'd check if the task's parent context is this context
    return true;
  }).slice(0, 5); // Create sessions for top 5 tasks

  contextTasks.forEach((task, idx) => {
    const now = new Date();
    const duration = Math.min(task.priority === 'critical' ? 120 : 60, 480);

    const session: FocusSession = {
      id: `migrated-${idx}`,
      name: `Session for: ${task.title.substring(0, 40)}`,
      goal: task.description || `Complete: ${task.title}`,
      context,
      startTime: now,
      endTime: new Date(now.getTime() + duration * 60 * 1000),
      duration,
      projects: [task.parentId],
      linkedTasks: [task.id],
      interruptionPolicy: 'moderate',
      aiMode: 'general',
      status: 'scheduled',
      completionPercentage: 0,
      createdAt: now,
      updatedAt: now,
    };

    sessions.push(session);
  });

  return sessions;
}

/**
 * Validate migrated data for consistency
 */
export function validateMigratedData(
  tasks: LocalTask[],
  sessions: FocusSession[]
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for missing parent references
  for (const task of tasks) {
    if (!task.parentId) {
      warnings.push(`Task "${task.title}" has no parent reference`);
    }
  }

  // Check for orphaned session task links
  const taskIds = new Set(tasks.map(t => t.id));
  for (const session of sessions) {
    for (const taskId of session.linkedTasks) {
      if (!taskIds.has(taskId)) {
        warnings.push(`Session "${session.name}" links to non-existent task ${taskId}`);
      }
    }
  }

  // Check for duplicate task IDs
  const idCounts = new Map<number, number>();
  for (const task of tasks) {
    idCounts.set(task.id, (idCounts.get(task.id) || 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      errors.push(`Found ${count} tasks with ID ${id}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate migration report
 */
export function generateMigrationReport(
  legacyTasks: LegacyTask[],
  migratedTasks: LocalTask[],
  createdSessions: FocusSession[]
): MigrationReport {
  const tasksByContext: Record<OperatingContext, number> = {
    'Work': 0,
    'School': 0,
    'Life': 0,
    'Photography': 0,
    'Study Abroad': 0,
    'Travel': 0,
    'Health': 0,
  };

  // Count tasks by context (simplified - in real scenario, would check parent)
  for (const task of migratedTasks) {
    if (task.parentId.toLowerCase().includes('work')) tasksByContext['Work']++;
    else if (task.parentId.toLowerCase().includes('school')) tasksByContext['School']++;
    else if (task.parentId.toLowerCase().includes('photo')) tasksByContext['Photography']++;
    else if (task.parentId.toLowerCase().includes('study-abroad')) tasksByContext['Study Abroad']++;
    else if (task.parentId.toLowerCase().includes('travel')) tasksByContext['Travel']++;
    else if (task.parentId.toLowerCase().includes('health')) tasksByContext['Health']++;
    else tasksByContext['Life']++;
  }

  const validation = validateMigratedData(migratedTasks, createdSessions);

  return {
    totalTasksMigrated: migratedTasks.length,
    totalSessionsCreated: createdSessions.length,
    tasksByContext,
    errors: validation.errors,
    warnings: validation.warnings,
    timestamp: new Date(),
  };
}

/**
 * Export data for backup
 */
export function exportDataForBackup(
  tasks: LocalTask[],
  sessions: FocusSession[],
  contextState: OperatingContextState
): string {
  const backup = {
    version: '3.0',
    timestamp: new Date().toISOString(),
    contextState,
    tasks,
    sessions,
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Import data from backup
 */
export function importDataFromBackup(
  backupJson: string
): { tasks: LocalTask[]; sessions: FocusSession[]; contextState: OperatingContextState } | null {
  try {
    const backup = JSON.parse(backupJson);

    // Validate backup format
    if (!backup.version || backup.version !== '3.0') {
      console.warn('Backup version mismatch');
    }

    // Restore dates
    const tasks = backup.tasks.map((t: any) => ({
      ...t,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    }));

    const sessions = backup.sessions.map((s: any) => ({
      ...s,
      startTime: new Date(s.startTime),
      endTime: new Date(s.endTime),
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
    }));

    return {
      tasks,
      sessions,
      contextState: {
        ...backup.contextState,
        switchedAt: new Date(backup.contextState.switchedAt),
      },
    };
  } catch (error) {
    console.error('Failed to import backup:', error);
    return null;
  }
}
