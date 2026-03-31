import { z } from 'zod';

// Environment variable validation schema
export const envSchema = z.object({
  // Timezone configuration
  TZ: z.string().default('UTC'),
  
  // Peak hours configuration
  PEAK_HOURS_START: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  PEAK_HOURS_END: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  PEAK_WEEKDAYS: z.string().transform((val) => 
    val.split(',').map(day => {
      const num = parseInt(day.trim(), 10);
      if (isNaN(num) || num < 1 || num > 7) {
        throw new Error('Invalid weekday: must be 1-7');
      }
      return num;
    })
  ).default(() => [1,2,3,4,5]),
  
  // Claude API configuration (optional)
  CLAUDE_API_KEY: z.string().optional(),
  CLAUDE_BASE_URL: z.string().url().optional(),
  
  // Notification settings (optional)
  SLACK_WEBHOOK: z.string().url().optional(),
  SLACK_CHANNEL: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(10).optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  
  // Logging configuration
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FILE: z.string().optional(),
});

// CLI argument validation schemas
export const cliArgsSchema = z.object({
  command: z.enum(['status', 'predict', 'schedule', 'monitor', 'config']),
  args: z.array(z.string()).optional(),
  options: z.object({
    time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    delay: z.string().regex(/^\d+$/).transform(Number).optional(),
  }).optional(),
});

// Schedule task validation
export const scheduleTaskSchema = z.object({
  id: z.string().min(1),
  command: z.string().min(1),
  scheduledAt: z.date(),
  executed: z.boolean().default(false),
  result: z.string().optional(),
});

// Path validation for security
export function validatePath(path: string): string {
  // Prevent path traversal attacks
  const normalized = path.replace(/\.\./g, '').replace(/^\//, '').replace(/\/+$/, '');
  
  // Additional sanitization
  if (path.includes('..') || path.includes('~')) {
    throw new Error('Path traversal attempt');
  }
  
  return normalized;
}

// Command validation for security
export function validateCommand(command: string): string {
  // Basic command sanitization
  const sanitized = command.trim();
  
  // Prevent command injection attempts
  const dangerousPatterns = [
    /&&/g, /;/g, /\|/g, /\n/g, /\r/g,
    /rm\s+-rf/gi, /sudo/gi,
    /<\/dev\/null/gi
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      throw new Error(`Command injection attempt`);
    }
  }
  
  return sanitized;
}

// URL validation with additional security
export function validateUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Only HTTP/HTTPS protocols are allowed');
    }
    
    // Prevent localhost access in production
    if (process.env.NODE_ENV === 'production') {
      if (['localhost', '127.0.0.1', '0.0.0.0'].includes(urlObj.hostname)) {
        throw new Error('Localhost access not allowed in production');
      }
    }
    
    return url;
  } catch (error) {
    throw new Error(`Invalid URL: ${error}`);
  }
}

// Export types
export type EnvConfig = z.infer<typeof envSchema>;
export type CliArgs = z.infer<typeof cliArgsSchema>;
export type ScheduleTask = z.infer<typeof scheduleTaskSchema>;