import { logger } from './logger';

export type ShortcutHandler = (e: KeyboardEvent) => void;

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  cmd?: boolean;
  handler: ShortcutHandler;
  description: string;
}

export class KeyboardShortcuts {
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private isEnabled = true;
  private ignoredTargets = ['INPUT', 'TEXTAREA', 'SELECT'];

  register(config: ShortcutConfig) {
    const key = this.getShortcutKey(config);
    this.shortcuts.set(key, config);
    logger.debug('Shortcut registered', { key, description: config.description });
  }

  registerMultiple(configs: ShortcutConfig[]) {
    configs.forEach(config => this.register(config));
  }

  private getShortcutKey(config: ShortcutConfig): string {
    const parts = [];
    if (config.ctrl) parts.push('ctrl');
    if (config.shift) parts.push('shift');
    if (config.alt) parts.push('alt');
    if (config.cmd) parts.push('cmd');
    parts.push(config.key.toLowerCase());
    return parts.join('+');
  }

  private matchesShortcut(e: KeyboardEvent, config: ShortcutConfig): boolean {
    const key = e.key.toLowerCase();

    return (
      key === config.key.toLowerCase() &&
      e.ctrlKey === Boolean(config.ctrl) &&
      e.shiftKey === Boolean(config.shift) &&
      e.altKey === Boolean(config.alt) &&
      e.metaKey === Boolean(config.cmd)
    );
  }

  private shouldIgnoreShortcut(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    return this.ignoredTargets.includes(target.tagName);
  }

  handle(e: KeyboardEvent) {
    if (!this.isEnabled || this.shouldIgnoreShortcut(e.target)) {
      return;
    }

    for (const config of this.shortcuts.values()) {
      if (this.matchesShortcut(e, config)) {
        e.preventDefault();
        logger.debug('Shortcut triggered', { description: config.description });
        config.handler(e);
        break;
      }
    }
  }

  enable() {
    this.isEnabled = true;
    logger.debug('Keyboard shortcuts enabled');
  }

  disable() {
    this.isEnabled = false;
    logger.debug('Keyboard shortcuts disabled');
  }

  getAll(): ShortcutConfig[] {
    return Array.from(this.shortcuts.values());
  }

  remove(key: string) {
    this.shortcuts.delete(key);
    logger.debug('Shortcut removed', { key });
  }

  clear() {
    this.shortcuts.clear();
    logger.debug('All shortcuts cleared');
  }

  addIgnoredTarget(tagName: string) {
    if (!this.ignoredTargets.includes(tagName)) {
      this.ignoredTargets.push(tagName);
    }
  }
}

// Singleton instance
let shortcutsInstance: KeyboardShortcuts | null = null;

export const initializeKeyboardShortcuts = () => {
  if (!shortcutsInstance) {
    shortcutsInstance = new KeyboardShortcuts();
    logger.info('Keyboard shortcuts initialized');
  }
  return shortcutsInstance;
};

export const getKeyboardShortcuts = () => shortcutsInstance || initializeKeyboardShortcuts();
