import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AppConfig } from '../types';
import dotenv from 'dotenv';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): void {
    // Load .env file
    dotenv.config();

    // Default configuration
    this.config = {
      timezone: process.env.TZ || 'UTC',
      peak: {
        weekdays: this.parseWeekdays(process.env.PEAK_WEEKDAYS || '1,2,3,4,5'),
        peakHours: {
          start: process.env.PEAK_HOURS_START || '09:00',
          end: process.env.PEAK_HOURS_END || '17:00'
        },
        timezone: process.env.TZ || 'UTC'
      },
      alerts: {
        slack: process.env.SLACK_WEBHOOK ? {
          webhook: process.env.SLACK_WEBHOOK,
          channel: process.env.SLACK_CHANNEL
        } : undefined,
        telegram: process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID ? {
          botToken: process.env.TELEGRAM_BOT_TOKEN,
          chatId: process.env.TELEGRAM_CHAT_ID
        } : undefined
      },
      claude: process.env.CLAUDE_API_KEY ? {
        apiKey: process.env.CLAUDE_API_KEY,
        baseUrl: process.env.CLAUDE_BASE_URL
      } : undefined,
      logging: {
        level: (process.env.LOG_LEVEL as any) || 'info',
        file: process.env.LOG_FILE
      }
    };

    // Load config file if it exists
    const configPath = join(process.cwd(), 'off-peaky.config.json');
    if (existsSync(configPath)) {
      try {
        const fileConfig = JSON.parse(readFileSync(configPath, 'utf8'));
        this.config = { ...this.config, ...fileConfig };
      } catch (error) {
        console.warn('Warning: Could not parse config file:', error);
      }
    }
  }

  private parseWeekdays(weekdaysStr: string): number[] {
    return weekdaysStr
      .split(',')
      .map(day => parseInt(day.trim()))
      .filter(day => day >= 1 && day <= 7);
  }

  getConfig(): AppConfig {
    return this.config;
  }

  getTimezone(): string {
    return this.config.timezone;
  }

  getPeakConfig() {
    return this.config.peak;
  }

  getAlertConfig() {
    return this.config.alerts;
  }

  getClaudeConfig() {
    return this.config.claude;
  }

  getLoggingConfig() {
    return this.config.logging;
  }

  reloadConfig(): void {
    this.loadConfig();
  }
}