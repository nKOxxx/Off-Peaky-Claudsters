import { 
  SecureError, 
  createError, 
  wrapError, 
  wrapAsyncError,
  ErrorCodes 
} from '../src/utils/errors';
import { describe, it, expect } from '@jest/globals';

describe('Error Handling', () => {
  describe('SecureError', () => {
    it('should create secure error with basic information', () => {
      const error = new SecureError('TEST_ERROR', 'Test message');
      
      expect(error.code).toBe('TEST_ERROR');
      expect(error.userMessage).toBe('Test message');
      expect(error.name).toBe('SecureError');
      expect(error.timestamp).toBeDefined();
    });

    it('should include internal message in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        const error = new SecureError('TEST_ERROR', 'Test message', 'Internal details');
        const json = error.toJSON();
        
        expect(json.internalMessage).toBe('Internal details');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should not include internal message in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      try {
        const error = new SecureError('TEST_ERROR', 'Test message', 'Internal details');
        const json = error.toJSON();
        
        expect(json.internalMessage).toBeUndefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should sanitize stack traces', () => {
      const originalError = new Error('Test');
      originalError.stack = 'Error: Test\n    at test (/path/to/file.js:10:5)\n    password=secret123';
      
      const error = new SecureError('TEST_ERROR', 'Test message', 'Internal message', originalError);
      expect(error.stack).not.toContain('secret123');
      expect(error.stack).toContain('[REDACTED]');
    });

    it('should convert to string properly', () => {
      const error = new SecureError('TEST_ERROR', 'Test message');
      const str = error.toString();
      
      expect(str).toBe('[TEST_ERROR] Test message');
    });

    it('should include internal message in string in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        const error = new SecureError('TEST_ERROR', 'Test message', 'Internal details');
        const str = error.toString();
        
        expect(str).toBe('[TEST_ERROR] Test message (Internal details)');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('createError factory', () => {
    it('should create validation errors', () => {
      const error = createError.validationError('timezone', 'Invalid timezone format');
      
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.userMessage).toBe('Invalid timezone: Invalid timezone format');
    });

    it('should create path traversal errors', () => {
      const error = createError.pathTraversal('/etc/passwd');
      
      expect(error.code).toBe(ErrorCodes.PATH_TRAVERSAL);
      expect(error.userMessage).toBe('Path traversal attempt: /etc/passwd');
    });

    it('should create command injection errors', () => {
      const error = createError.commandInjection('rm -rf /');
      
      expect(error.code).toBe(ErrorCodes.COMMAND_INJECTION);
      expect(error.userMessage).toBe('Command injection attempt: rm -rf /');
    });

    it('should create security violation errors', () => {
      const error = createError.securityViolation('Unauthorized access attempt');
      
      expect(error.code).toBe(ErrorCodes.SECURITY_VIOLATION);
      expect(error.userMessage).toBe('Security violation: Unauthorized access attempt');
    });

    it('should create file system errors', () => {
      const originalError = new Error('Permission denied');
      const error = createError.fileSystemError('read', '/etc/passwd', originalError);
      
      expect(error.code).toBe(ErrorCodes.FILE_SYSTEM_ERROR);
      expect(error.userMessage).toBe('File system error: read failed for /etc/passwd');
      expect(error.internalMessage).toBe('Permission denied');
    });
  });

  describe('wrapError', () => {
    it('should return function result when no error', () => {
      const result = wrapError(() => 42, 'fallback');
      
      expect(result).toBe(42);
    });

    it('should convert unknown errors to SecureError', () => {
      expect(() => {
        wrapError(() => {
          throw new Error('Original error');
        }, 'fallback message');
      }).toThrow(SecureError);
    });

    it('should re-throw SecureError instances', () => {
      const secureError = new SecureError('TEST_CODE', 'Test message');
      
      expect(() => {
        wrapError(() => {
          throw secureError;
        }, 'fallback');
      }).toThrow(secureError);
    });
  });

  describe('wrapAsyncError', () => {
    it('should return promise result when no error', async () => {
      const result = await wrapAsyncError(async () => 42, 'fallback');
      
      expect(result).toBe(42);
    });

    it('should convert async unknown errors to SecureError', async () => {
      await expect(async () => {
        await wrapAsyncError(async () => {
          throw new Error('Async error');
        }, 'fallback message');
      }).rejects.toThrow(SecureError);
    });

    it('should re-throw async SecureError instances', async () => {
      const secureError = new SecureError('TEST_CODE', 'Test message');
      
      await expect(wrapAsyncError(async () => {
        throw secureError;
      }, 'fallback')).rejects.toThrow(secureError);
    });
  });

  describe('ErrorCodes', () => {
    it('should have all expected error codes', () => {
      const expectedCodes = [
        'CONFIG_INVALID',
        'CONFIG_NOT_FOUND', 
        'CONFIG_PERMISSION',
        'VALIDATION_ERROR',
        'INVALID_INPUT',
        'INVALID_PATH',
        'INVALID_COMMAND',
        'INVALID_URL',
        'PEAK_DETECTION_ERROR',
        'SCHEDULING_ERROR',
        'NOTIFICATION_ERROR',
        'SECURITY_VIOLATION',
        'UNAUTHORIZED_ACCESS',
        'PATH_TRAVERSAL',
        'COMMAND_INJECTION',
        'FILE_SYSTEM_ERROR',
        'NETWORK_ERROR',
        'TIMEOUT_ERROR'
      ];

      expectedCodes.forEach(code => {
        expect(ErrorCodes).toHaveProperty(code);
      });
    });

    it('should have consistent error code naming', () => {
      Object.values(ErrorCodes).forEach(code => {
        expect(code).toEqual(code.toUpperCase());
        expect(code).not.toMatch(/[^A-Z_]/);
      });
    });
  });
});