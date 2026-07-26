import React from 'react';
import { logger } from './logger';

/**
 * Higher-order component to measure render performance
 */
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return (props: P) => {
    const start = performance.now();
    const result = React.createElement(Component, props);
    const duration = performance.now() - start;

    if (duration > 16) { // > 1 frame at 60fps
      logger.warn(`Slow render detected: ${componentName}`, { duration });
    }

    return result;
  };
};

/**
 * Track expensive computations
 */
export const trackComputation = <T>(
  computation: () => T,
  label: string
): T => {
  const start = performance.now();
  const result = computation();
  const duration = performance.now() - start;

  logger.debug(`Computation: ${label}`, { duration: `${duration.toFixed(2)}ms` });
  return result;
};

/**
 * Debounced function with tracking
 */
export const createDebouncedFunction = <T extends (...args: any[]) => void>(
  fn: T,
  delay: number = 500,
  label: string = 'debounced'
): T => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      logger.debug(`Executing ${label}`);
      fn(...args);
    }, delay);
  }) as T;
};

/**
 * Throttled function with tracking
 */
export const createThrottledFunction = <T extends (...args: any[]) => void>(
  fn: T,
  limit: number = 100,
  label: string = 'throttled'
): T => {
  let lastCall = 0;

  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      logger.debug(`Executing ${label}`);
      fn(...args);
      lastCall = now;
    }
  }) as T;
};

/**
 * Measure array filter performance
 */
export const efficientFilter = <T>(
  array: T[],
  predicate: (item: T) => boolean,
  label: string = 'filter'
): T[] => {
  return trackComputation(() => array.filter(predicate), label);
};

/**
 * Measure array map performance
 */
export const efficientMap = <T, U>(
  array: T[],
  mapper: (item: T) => U,
  label: string = 'map'
): U[] => {
  return trackComputation(() => array.map(mapper), label);
};

/**
 * Track re-render frequency of a component
 */
let renderCounts: Record<string, number> = {};

export const trackRenderCount = (componentName: string) => {
  renderCounts[componentName] = (renderCounts[componentName] || 0) + 1;

  if (renderCounts[componentName] > 10) {
    logger.warn(`Excessive renders: ${componentName}`, {
      count: renderCounts[componentName],
    });
  }
};

export const getRenderCounts = () => renderCounts;
export const resetRenderCounts = () => {
  renderCounts = {};
};
