// Centralized logging utility
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  error?: Error;
}

class Logger {
  private logs: LogEntry[] = [];
  private isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  private createEntry(level: LogLevel, message: string, data?: unknown, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      error,
    };
  }

  private output(entry: LogEntry) {
    const prefix = `[${entry.level.toUpperCase()}]`;
    const style = this.getStyle(entry.level);

    if (this.isDev) {
      const args = [`%c${prefix} ${entry.message}`, style, entry.data || entry.error || ''];
      switch (entry.level) {
        case 'debug':
          console.debug(...args);
          break;
        case 'info':
          console.info(...args);
          break;
        case 'warn':
          console.warn(...args);
          break;
        case 'error':
          console.error(...args);
          break;
      }
    }

    // Store for debugging
    this.logs.push(entry);

    // Limit stored logs to 100 entries
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  private getStyle(level: LogLevel): string {
    const styles = {
      debug: 'color: #999;',
      info: 'color: #0066cc; font-weight: bold;',
      warn: 'color: #ff9900; font-weight: bold;',
      error: 'color: #ff0000; font-weight: bold;',
    };
    return styles[level];
  }

  debug(message: string, data?: unknown) {
    this.output(this.createEntry('debug', message, data));
  }

  info(message: string, data?: unknown) {
    this.output(this.createEntry('info', message, data));
  }

  warn(message: string, data?: unknown) {
    this.output(this.createEntry('warn', message, data));
  }

  error(message: string, error?: Error | unknown, data?: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.output(this.createEntry('error', message, data, err));
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
  }

  export() {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
