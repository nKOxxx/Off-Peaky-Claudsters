import { 
  envSchema, 
  cliArgsSchema, 
  scheduleTaskSchema, 
  validatePath, 
  validateCommand, 
  validateUrl 
} from '../src/utils/validation';
import { describe, it, expect } from '@jest/globals';

describe('Validation Utilities', () => {
  describe('envSchema', () => {
    it('should validate valid environment variables', () => {
      const validEnv = {
        TZ: 'America/New_York',
        PEAK_HOURS_START: '09:00',
        PEAK_HOURS_END: '17:00',
        PEAK_WEEKDAYS: '1,2,3,4,5',
        LOG_LEVEL: 'info'
      };

      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it('should reject invalid time formats', () => {
      const invalidEnv = {
        TZ: 'America/New_York',
        PEAK_HOURS_START: '25:00', // Invalid hour
        PEAK_HOURS_END: '17:00',
        PEAK_WEEKDAYS: '1,2,3,4,5',
        LOG_LEVEL: 'info'
      };

      const result = envSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });

    it('should reject invalid log levels', () => {
      const invalidEnv = {
        TZ: 'America/New_York',
        PEAK_HOURS_START: '09:00',
        PEAK_HOURS_END: '17:00',
        PEAK_WEEKDAYS: '1,2,3,4,5',
        LOG_LEVEL: 'invalid' // Invalid log level
      };

      const result = envSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });

    it('should transform weekdays correctly', () => {
      const env = {
        TZ: 'America/New_York',
        PEAK_HOURS_START: '09:00',
        PEAK_HOURS_END: '17:00',
        PEAK_WEEKDAYS: '1,2,3,4,5',
        LOG_LEVEL: 'info'
      };

      const result = envSchema.parse(env);
      expect(result.PEAK_WEEKDAYS).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('validatePath', () => {
    it('should normalize valid paths', () => {
      const path = './config/file.json';
      const result = validatePath(path);
      expect(result).toBe('./config/file.json');
    });

    it('should reject path traversal attempts', () => {
      const maliciousPaths = [
        '../../etc/passwd',
        '..\\..\\windows\\system32',
        '~/../../sensitive',
        '/etc/passwd',
        '../.././config'
      ];

      maliciousPaths.forEach(path => {
        expect(() => {
          validatePath(path);
        }).toThrow(Error);
      });
    });

    it('should remove leading slashes and trailing slashes', () => {
      const path1 = '/config/file.json/';
      const path2 = 'config//file.json';
      
      expect(validatePath(path1)).toBe('config/file.json');
      expect(validatePath(path2)).toBe('config//file.json');
    });
  });

  describe('validateCommand', () => {
    it('should sanitize valid commands', () => {
      const command = 'npm run build';
      const result = validateCommand(command);
      expect(result).toBe('npm run build');
    });

    it('should reject dangerous command patterns', () => {
      const dangerousCommands = [
        'npm run build && rm -rf /',
        'npm run build; rm -rf /',
        'npm run build | cat',
        'sudo rm -rf /',
        'npm run build < /dev/null',
        'npm run build\n rm -rf /',
        'npm run build\r rm -rf /'
      ];

      dangerousCommands.forEach(command => {
        expect(() => {
          validateCommand(command);
        }).toThrow(Error);
      });
    });

    it('should trim whitespace', () => {
      const command = '  npm run build  ';
      const result = validateCommand(command);
      expect(result).toBe('npm run build');
    });
  });

  describe('validateUrl', () => {
    it('should validate valid HTTP/HTTPS URLs', () => {
      const validUrls = [
        'https://api.example.com/webhook',
        'http://localhost:3000',
        'https://hooks.slack.com/services/ABC123'
      ];

      validUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result).toBe(url);
      });
    });

    it('should reject non-HTTP/HTTPS protocols', () => {
      const invalidUrls = [
        'ftp://example.com',
        'file:///etc/passwd',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>'
      ];

      invalidUrls.forEach(url => {
        expect(() => validateUrl(url)).toThrow('Only HTTP/HTTPS protocols are allowed');
      });
    });

    it('should reject localhost in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const localhostUrls = [
          'http://localhost:3000',
          'https://127.0.0.1:3000',
          'http://0.0.0.0:3000'
        ];

        localhostUrls.forEach(url => {
          expect(() => validateUrl(url)).toThrow('Localhost access not allowed in production');
        });
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('cliArgsSchema', () => {
    it('should validate valid CLI arguments', () => {
      const validArgs = {
        command: 'status' as const,
        args: ['--help'],
        options: {
          time: '14:30',
          delay: '5'
        }
      };

      const result = cliArgsSchema.safeParse(validArgs);
      expect(result.success).toBe(true);
    });

    it('should reject invalid commands', () => {
      const invalidArgs = {
        command: 'invalid' as any,
        args: ['--help']
      };

      const result = cliArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });

    it('should reject invalid time formats', () => {
      const invalidArgs = {
        command: 'schedule' as const,
        options: {
          time: '25:00' // Invalid time
        }
      };

      const result = cliArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });

    it('should transform delay string to number', () => {
      const args = {
        command: 'schedule' as const,
        options: {
          delay: '5'
        }
      };

      const result = cliArgsSchema.parse(args);
      expect(result.options?.delay).toBe(5);
    });
  });

  describe('scheduleTaskSchema', () => {
    it('should validate valid schedule tasks', () => {
      const validTask = {
        id: 'task-123',
        command: 'npm run build',
        scheduledAt: new Date(),
        executed: false
      };

      const result = scheduleTaskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it('should reject tasks with empty IDs', () => {
      const invalidTask = {
        id: '',
        command: 'npm run build',
        scheduledAt: new Date(),
        executed: false
      };

      const result = scheduleTaskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });

    it('should reject tasks with empty commands', () => {
      const invalidTask = {
        id: 'task-123',
        command: '',
        scheduledAt: new Date(),
        executed: false
      };

      const result = scheduleTaskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });
  });
});