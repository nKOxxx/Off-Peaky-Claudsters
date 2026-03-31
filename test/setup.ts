// Test setup file
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Set default test values for required environment variables
process.env.TZ = process.env.TZ || 'UTC';
process.env.PEAK_HOURS_START = process.env.PEAK_HOURS_START || '09:00';
process.env.PEAK_HOURS_END = process.env.PEAK_HOURS_END || '17:00';
process.env.PEAK_WEEKDAYS = process.env.PEAK_WEEKDAYS || '1,2,3,4,5';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';

// Mock console methods to reduce noise during tests
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    // Uncomment to ignore specific console methods in tests
    // log: jest.fn(),
    // warn: jest.fn(),
    // error: jest.fn(),
  };
}

// Set global test timeout
jest.setTimeout(10000);