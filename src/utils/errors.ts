/**
 * Centralized error handling with specific error types
 * Provides better error categorization and recovery strategies
 */

export enum ErrorCode {
  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  
  // Authentication Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Rate Limiting
  RATE_LIMIT = 'RATE_LIMIT',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // Server Errors
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Client Errors
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppErrorDetails {
  code: ErrorCode;
  message: string;
  userMessage: string;
  statusCode?: number;
  retryable: boolean;
  retryAfter?: number; // seconds
  originalError?: Error;
  context?: Record<string, any>;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;
  public readonly context?: Record<string, any>;

  constructor(details: AppErrorDetails) {
    super(details.message);
    this.name = 'AppError';
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.statusCode = details.statusCode;
    this.retryable = details.retryable;
    this.retryAfter = details.retryAfter;
    this.context = details.context;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  static fromError(error: unknown, context?: Record<string, any>): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Connection refused errors (backend not running)
      const errorMessage = error.message.toLowerCase();
      const isConnectionRefused = 
        errorMessage.includes('failed to fetch') ||
        errorMessage.includes('networkerror') ||
        errorMessage.includes('connection refused') ||
        errorMessage.includes('err_connection_refused') ||
        errorMessage.includes('err_internet_disconnected') ||
        (context?.endpoint && errorMessage.includes('fetch'));
      
      if (isConnectionRefused) {
        // Check if it's specifically a connection refused (backend not running)
        const isBackendConnection = context?.endpoint?.includes('/api/') || 
                                   context?.endpoint?.includes('/auth/') ||
                                   context?.endpoint?.includes('/foods/') ||
                                   context?.endpoint?.includes('/vision/') ||
                                   context?.endpoint?.includes('/chat/');
        
        if (isBackendConnection) {
          return new AppError({
            code: ErrorCode.CONNECTION_REFUSED,
            message: error.message,
            userMessage: 'Backend server is not running. Please start the Flask backend server on port 3001.',
            retryable: true,
            retryAfter: 5,
            originalError: error,
            context,
          });
        }
        
        return new AppError({
          code: ErrorCode.NETWORK_ERROR,
          message: error.message,
          userMessage: 'Network error. Please check your connection and try again.',
          retryable: true,
          retryAfter: 5,
          originalError: error,
          context,
        });
      }

      // Timeout errors
      if (error.message.includes('timeout') || error.message.includes('aborted')) {
        return new AppError({
          code: ErrorCode.TIMEOUT,
          message: error.message,
          userMessage: 'Request timed out. Please try again.',
          statusCode: 408,
          retryable: true,
          retryAfter: 10,
          originalError: error,
          context,
        });
      }

      // Rate limit errors
      if (error.message.toLowerCase().includes('rate limit') || 
          error.message.toLowerCase().includes('too many requests')) {
        const retryAfter = extractRetryAfter(error.message) || 60;
        return new AppError({
          code: ErrorCode.RATE_LIMIT,
          message: error.message,
          userMessage: `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`,
          statusCode: 429,
          retryable: true,
          retryAfter,
          originalError: error,
          context,
        });
      }
    }

    // Check for status codes
    const statusCode = (error as any)?.status || (error as any)?.response?.status;
    if (statusCode) {
      return createErrorFromStatusCode(statusCode, error, context);
    }

    // Unknown error
    return new AppError({
      code: ErrorCode.UNKNOWN_ERROR,
      message: error instanceof Error ? error.message : String(error),
      userMessage: 'An unexpected error occurred. Please try again later.',
      retryable: false,
      originalError: error instanceof Error ? error : new Error(String(error)),
      context,
    });
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      statusCode: this.statusCode,
      retryable: this.retryable,
      retryAfter: this.retryAfter,
      context: this.context,
    };
  }
}

function extractRetryAfter(message: string): number | undefined {
  const match = message.match(/(\d+)\s*second/i);
  return match ? parseInt(match[1], 10) : undefined;
}

function createErrorFromStatusCode(
  statusCode: number,
  error: unknown,
  context?: Record<string, any>
): AppError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  switch (statusCode) {
    case 400:
      // Bad request errors (validation errors)
      // Use the error message from the backend as it contains specific validation information
      return new AppError({
        code: ErrorCode.VALIDATION_ERROR,
        message: errorMessage,
        userMessage: errorMessage, // Use backend message directly for validation errors
        statusCode: 400,
        retryable: false,
        originalError: error instanceof Error ? error : new Error(errorMessage),
        context,
      });
    
    case 401:
      return new AppError({
        code: ErrorCode.UNAUTHORIZED,
        message: errorMessage,
        userMessage: 'You are not authorized. Please log in again.',
        statusCode: 401,
        retryable: false,
        originalError: error instanceof Error ? error : new Error(errorMessage),
        context,
      });
    
    case 403:
      return new AppError({
        code: ErrorCode.FORBIDDEN,
        message: errorMessage,
        userMessage: 'You do not have permission to perform this action.',
        statusCode: 403,
        retryable: false,
        originalError: error instanceof Error ? error : new Error(errorMessage),
        context,
      });
    
    case 404:
      return new AppError({
        code: ErrorCode.NOT_FOUND,
        message: errorMessage,
        userMessage: 'The requested resource was not found.',
        statusCode: 404,
        retryable: false,
        originalError: error instanceof Error ? error : new Error(errorMessage),
        context,
      });
    
    case 409:
      // Conflict errors (e.g., email already exists, verification code already sent)
      // Use the error message from the backend as it contains specific user-friendly information
      return new AppError({
        code: ErrorCode.VALIDATION_ERROR,
        message: errorMessage,
        userMessage: errorMessage, // Use backend message directly for 409 conflicts
        statusCode: 409,
        retryable: false,
        originalError: error instanceof Error ? error : new Error(errorMessage),
        context,
      });
    
    case 408:
      return new AppError({
        code: ErrorCode.TIMEOUT,
        message: errorMessage,
        userMessage: 'Request timed out. Please try again.',
        statusCode: 408,
        retryable: true,
        retryAfter: 10,
        originalError: error instanceof Error ? error : new Error(errorMessage),
        context,
      });
    
    case 429:
      return new AppError({
        code: ErrorCode.RATE_LIMIT,
        message: errorMessage,
        userMessage: 'Too many requests. Please wait a moment before trying again.',
        statusCode: 429,
        retryable: true,
        retryAfter: 60,
        originalError: error instanceof Error ? error : new Error(errorMessage),
        context,
      });
    
    case 500:
      return new AppError({
        code: ErrorCode.SERVER_ERROR,
        message: errorMessage,
        userMessage: 'Server error. Please try again later.',
        statusCode: 500,
        retryable: true,
        retryAfter: 30,
        originalError: error instanceof Error ? error : new Error(errorMessage),
        context,
      });
    
    case 502:
    case 503:
      // Bad Gateway / Service Unavailable errors
      // Use the error message from the backend as it contains specific information about what went wrong
      // (e.g., "Vision model returned invalid JSON", "Vision model returned no choices", etc.)
      return new AppError({
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: errorMessage,
        userMessage: errorMessage, // Use backend message directly for better user feedback
        statusCode,
        retryable: true,
        retryAfter: 30,
        originalError: error instanceof Error ? error : new Error(errorMessage),
        context,
      });
    
    default:
      return new AppError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: errorMessage,
        userMessage: `An error occurred (${statusCode}). Please try again.`,
        statusCode,
        retryable: statusCode >= 500,
        originalError: error instanceof Error ? error : new Error(errorMessage),
        context,
      });
  }
}

/**
 * Error recovery strategies
 */
export class ErrorRecovery {
  /**
   * Retry a function with exponential backoff
   */
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      backoffMultiplier?: number;
      retryable?: (error: unknown) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 2,
      retryable = (error) => {
        const appError = AppError.fromError(error);
        return appError.retryable;
      },
    } = options;

    let lastError: unknown;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry if error is not retryable
        if (!retryable(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }

    throw lastError;
  }

  /**
   * Retry with fixed delay
   */
  static async retryWithFixedDelay<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      delay?: number;
      retryable?: (error: unknown) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      delay = 1000,
      retryable = (error) => {
        const appError = AppError.fromError(error);
        return appError.retryable;
      },
    } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (!retryable(error) || attempt === maxRetries) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

