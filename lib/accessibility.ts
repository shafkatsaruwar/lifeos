import { logger } from './logger';

export interface AccessibilityConfig {
  announceUpdates?: boolean;
  highContrast?: boolean;
  reduceMotion?: boolean;
  focusOutline?: boolean;
}

export class AccessibilityManager {
  private config: AccessibilityConfig = {
    announceUpdates: true,
    highContrast: false,
    reduceMotion: false,
    focusOutline: true,
  };

  private announcer: HTMLDivElement | null = null;

  constructor(initialConfig?: AccessibilityConfig) {
    this.config = { ...this.config, ...initialConfig };
    this.initializeAnnouncer();
    this.setupMediaQueries();
    logger.info('Accessibility manager initialized');
  }

  private initializeAnnouncer() {
    // Create a live region for screen reader announcements
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.style.position = 'absolute';
    this.announcer.style.left = '-10000px';
    this.announcer.style.width = '1px';
    this.announcer.style.height = '1px';
    this.announcer.style.overflow = 'hidden';
    document.body.appendChild(this.announcer);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.config.announceUpdates || !this.announcer) return;

    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = message;
    logger.debug('Announcement made', { message, priority });
  }

  private setupMediaQueries() {
    // Detect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', (e) => {
      this.config.reduceMotion = e.matches;
      logger.debug('Motion preference changed', { reduceMotion: this.config.reduceMotion });
      this.applyReducedMotion();
    });

    // Initial state
    if (mediaQuery.matches) {
      this.config.reduceMotion = true;
      this.applyReducedMotion();
    }
  }

  private applyReducedMotion() {
    const root = document.documentElement;
    if (this.config.reduceMotion) {
      root.style.setProperty('--motion-safe', '0s');
    } else {
      root.style.setProperty('--motion-safe', '0.3s');
    }
  }

  setHighContrast(enabled: boolean) {
    this.config.highContrast = enabled;
    const root = document.documentElement;
    if (enabled) {
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.removeAttribute('data-high-contrast');
    }
    logger.debug('High contrast mode', { enabled });
  }

  setReduceMotion(enabled: boolean) {
    this.config.reduceMotion = enabled;
    this.applyReducedMotion();
  }

  setFocusOutline(enabled: boolean) {
    this.config.focusOutline = enabled;
    const root = document.documentElement;
    if (enabled) {
      root.style.removeProperty('--focus-visible');
    } else {
      root.style.setProperty('--focus-visible', 'none');
    }
    logger.debug('Focus outline', { enabled });
  }

  // Helper to ensure keyboard navigability
  makeKeyboardNavigable(element: HTMLElement) {
    if (!element.hasAttribute('tabindex') && !this.isNativelyKeyboardNavigable(element)) {
      element.setAttribute('tabindex', '0');
      logger.debug('Element made keyboard navigable', { tag: element.tagName });
    }
  }

  private isNativelyKeyboardNavigable(element: HTMLElement): boolean {
    const navigableElements = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
    return navigableElements.includes(element.tagName);
  }

  // Helper for skip links
  createSkipLink(targetSelector: string, label: string = 'Skip to main content'): HTMLAnchorElement {
    const link = document.createElement('a');
    link.href = `#${targetSelector}`;
    link.textContent = label;
    link.setAttribute('data-skip-link', 'true');
    link.style.position = 'absolute';
    link.style.left = '-10000px';
    link.addEventListener('focus', () => {
      link.style.left = '0';
    });
    link.addEventListener('blur', () => {
      link.style.left = '-10000px';
    });
    document.body.insertBefore(link, document.body.firstChild);
    logger.debug('Skip link created', { label });
    return link;
  }

  // Helper to manage focus management
  focusElement(element: HTMLElement, announce?: string) {
    element.focus();
    if (announce) {
      this.announce(announce, 'polite');
    }
    logger.debug('Focus set', { tag: element.tagName, announce });
  }

  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }
}

// Singleton instance
let accessibilityInstance: AccessibilityManager | null = null;

export const initializeAccessibility = (config?: AccessibilityConfig) => {
  if (!accessibilityInstance) {
    accessibilityInstance = new AccessibilityManager(config);
  }
  return accessibilityInstance;
};

export const getAccessibility = () => accessibilityInstance || initializeAccessibility();
