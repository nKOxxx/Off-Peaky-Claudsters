import { DateTime } from 'luxon';

/**
 * Secure error class that prevents information leakage
 */
export class SecureError extends Error {
  public readonly code: string;
  public readonly timestamp: DateTime;
  public readonly userMessage: string;
  public readonly internalMessage?: string;

  constructor(
    code: string,
    userMessage: string,
    internalMessage?: string,
    originalError?: Error
  ) {
    super(userMessage);
    this.name = 'SecureError';
    this.code = code;
    this.userMessage = userMessage;
    this.internalMessage = internalMessage;
    this.timestamp = DateTime.now();
    
    // Capture stack trace but without sensitive information
    if (originalError?.stack) {
      this.stack = this.sanitizeStack(originalError.stack);
    }
  }

  /**
   * Sanitize stack trace to remove sensitive information
   */
  private sanitizeStack(stack: string): string {
    const sensitivePatterns = [
      /password=[^&\s]*/gi,
      /token=[^&\s]*/gi,
      /key=[^&\s]*/gi,
      /secret=[^&\s]*/gi,
      /api[_-]?key=[^&\s]*/gi,
    ];

    let sanitized = stack;
    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  /**
   * Convert to JSON with only safe information
   */
  toJSON() {
    return {
      code: this.code,
      message: this.userMessage,
      timestamp: this.timestamp.toISO(),
      // Include internal message only in development
      ...(process.env.NODE_ENV === 'development' && this.internalMessage && {
        internalMessage: this.internalMessage
      })
    };
  }

  /**
   * Convert to string for logging
   */
  toString(): string {
    const parts = [`[${this.code}] ${this.userMessage}`];
    
    if (process.env.NODE_ENV === 'development' && this.internalMessage) {
      parts.push(`(${this.internalMessage})`);
    }
    
    return parts.join(' ');
  }
}

/**
 * Error codes for categorization
 */
export const ErrorCodes = {
  // Configuration errors
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_PERMISSION: 'CONFIG_PERMISSION',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_PATH: 'INVALID_PATH',
  INVALID_COMMAND: 'INVALID_COMMAND',
  INVALID_URL: 'INVALID_URL',
  
  // Runtime errors
  PEAK_DETECTION_ERROR: 'PEAK_DETECTION_ERROR',
  SCHEDULING_ERROR: 'SCHEDULING_ERROR',
  NOTIFICATION_ERROR: 'NOTIFICATION_ERROR',
  
  // Security errors
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  PATH_TRAVERSAL: 'PATH_TRAVERSAL',
  COMMAND_INJECTION: 'COMMAND_INJECTION',
  
  // System errors
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

/**
 * Factory functions for creating specific error types
 */
export const createError = {
  /**
   * Configuration errors
   */
  configInvalid: (message: string, internal?: string) =>
    new SecureError(ErrorCodes.CONFIG_INVALID, message, internal),
    
  configNotFound: (path: string) =>
    new SecureError(ErrorCodes.CONFIG_NOT_FOUND, `Configuration file not found: ${path}`),
    
  configPermission: (path: string) =>
    new SecureError(ErrorCodes.CONFIG_PERMISSION, `Permission denied accessing configuration: ${path}`),
    
  /**
   * Validation errors
   */
  validationError: (field: string, message: string) =>
    new SecureError(ErrorCodes.VALIDATION_ERROR, `Invalid ${field}: ${message}`),
    
  invalidInput: (input: string, expected: string) =>
    new SecureError(ErrorCodes.INVALID_INPUT, `Invalid input: expected ${expected}`),
    
  invalidPath: (path: string) =>
    new SecureError(ErrorCodes.INVALID_PATH, `Invalid file path: ${path}`),
    
  invalidCommand: (command: string) =>
    new SecureError(ErrorCodes.INVALID_COMMAND, `Invalid command: ${command}`),
    
  invalidUrl: (url: string) =>
    new SecureError(ErrorCodes.INVALID_URL, `Invalid URL: ${url}`),
    
  /**
   * Runtime errors
   */
  peakDetectionError: (message: string, internal?: string) =>
    new SecureError(ErrorCodes.PEAK_DETECTION_ERROR, `Peak detection error: ${message}`, internal),
    
  schedulingError: (message: string) =>
    new SecureError(ErrorCodes.SCHEDULING_ERROR, `Scheduling error: ${message}`),
    
  notificationError: (service: string, message: string) =>
    new SecureError(ErrorCodes.NOTIFICATION_ERROR, `${service} notification error: ${message}`),
    
  /**
   * Security errors
   */
  securityViolation: (violation: string) =>
    new SecureError(ErrorCodes.SECURITY_VIOLATION, `Security violation: ${violation}`),
    
  unauthorizedAccess: (resource: string) =>
    new SecureError(ErrorCodes.UNAUTHORIZED_ACCESS, `Unauthorized access to: ${resource}`),
    
  pathTraversal: (path: string) =>
    new SecureError(ErrorCodes.PATH_TRAVERSAL, `Path traversal attempt: ${path}`),
    
  commandInjection: (command: string) =>
    new SecureError(ErrorCodes.COMMAND_INJECTION, `Command injection attempt: ${command}`),
    
  /**
   * System errors
   */
  fileSystemError: (operation: string, path: string, error?: Error) =>
    new SecureError(
      ErrorCodes.FILE_SYSTEM_ERROR,
      `File system error: ${operation} failed for ${path}`,
      error?.message
    ),
    
  networkError: (url: string, message: string) =>
    new SecureError(ErrorCodes.NETWORK_ERROR, `Network error accessing ${url}: ${message}`),
    
  timeoutError: (operation: string, timeout: number) =>
    new SecureError(ErrorCodes.TIMEOUT_ERROR, `${operation} timed out after ${timeout}ms`),
};

/**
 * Global error handler wrapper
 */
export function wrapError(fn: () => any, fallbackMessage: string = 'An error occurred'): any {
  try {
    return fn();
  } catch (error) {
    if (error instanceof SecureError) {
      throw error; // Re-throw our secure errors
    }
    
    // Convert unknown errors to secure errors
    throw new SecureError(
      'UNKNOWN_ERROR',
      fallbackMessage,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Async error handler wrapper
 */
export async function wrapAsyncError<T>(
  fn: () => Promise<T>,
  fallbackMessage: string = 'An error occurred'
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof SecureError) {
      throw error; // Re-throw our secure errors
    }
    
    // Convert unknown errors to secure errors
    throw new SecureError(
      'UNKNOWN_ERROR',
      fallbackMessage,
      error instanceof Error ? error.message : String(error)
    );
  }
}