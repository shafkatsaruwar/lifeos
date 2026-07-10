import { logger } from './logger';
import { ERROR_MESSAGES } from './constants';

export class FirebaseError extends Error {
  constructor(
    public code: string,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'FirebaseError';
  }
}

export const handleFirebaseError = (error: unknown, context: string): FirebaseError => {
  let code = 'UNKNOWN';
  let message: string = ERROR_MESSAGES.NETWORK_ERROR;

  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('network') || errorMessage.includes('offline')) {
      code = 'NETWORK_ERROR';
      message = ERROR_MESSAGES.NETWORK_ERROR;
    } else if (errorMessage.includes('auth') || errorMessage.includes('permission')) {
      code = 'AUTH_ERROR';
      message = ERROR_MESSAGES.AUTH_FAILED;
    } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      code = 'NOT_FOUND';
      message = `Resource not found: ${context}`;
    } else if (errorMessage.includes('invalid')) {
      code = 'VALIDATION_ERROR';
      message = ERROR_MESSAGES.INVALID_DATA;
    }
  }

  const fbError = new FirebaseError(code, message, error);
  logger.error(`Firebase Error in ${context}`, fbError, { originalError: error });

  return fbError;
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      logger.warn(`Operation attempt ${attempt}/${maxRetries} failed`, { error });

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
};

export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: string,
  onError?: (error: FirebaseError) => void
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    const fbError = handleFirebaseError(error, context);
    onError?.(fbError);
    return null;
  }
};

export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof FirebaseError) {
    return (
      error.code === 'NETWORK_ERROR' ||
      error.code === 'TIMEOUT' ||
      error.message.includes('temporarily unavailable')
    );
  }

  if (error instanceof Error) {
    return (
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('temporarily unavailable')
    );
  }

  return false;
};
