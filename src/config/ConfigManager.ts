import { readFileSync, existsSync } from 'fs';
import { access, constants } from 'fs/promises';
import { join, dirname } from 'path';
import { AppConfig } from '../types';
import dotenv from 'dotenv';
import { envSchema } from '../utils/validation';
import { createError, wrapError, wrapAsyncError, SecureError } from '../utils/errors';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private initialized = false;

  private constructor() {
    // Don't load config in constructor - use async initialization
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.loadConfig();
      this.initialized = true;
    } catch (error) {
      if (error instanceof SecureError) {
        throw error;
      }
      throw createError.configInvalid(
        `Failed to initialize configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async loadConfig(): Promise<void> {
    // Load .env file
    dotenv.config();

    // Validate environment variables
    const env = wrapError(() => {
      const parsed = envSchema.safeParse(process.env);
      if (!parsed.success) {
        throw createError.validationError('environment', parsed.error.message);
      }
      return parsed.data;
    }, 'Failed to validate environment variables');

    // Secure file path validation
    const configPath = this.validateConfigPath();

    // Check file permissions before reading
    await this.checkFilePermissions(configPath);

    // Default configuration from validated env vars
    this.config = {
      timezone: env.TZ,
      peak: {
        weekdays: env.PEAK_WEEKDAYS,
        peakHours: {
          start: env.PEAK_HOURS_START,
          end: env.PEAK_HOURS_END
        },
        timezone: env.TZ
      },
      alerts: {
        slack: env.SLACK_WEBHOOK ? {
          webhook: env.SLACK_WEBHOOK,
          channel: env.SLACK_CHANNEL
        } : undefined,
        telegram: env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID ? {
          botToken: env.TELEGRAM_BOT_TOKEN,
          chatId: env.TELEGRAM_CHAT_ID
        } : undefined
      },
      claude: env.CLAUDE_API_KEY ? {
        apiKey: env.CLAUDE_API_KEY,
        baseUrl: env.CLAUDE_BASE_URL
      } : undefined,
      logging: {
        level: env.LOG_LEVEL,
        file: env.LOG_FILE
      }
    };

    // Load and validate config file if it exists
    if (await this.fileExists(configPath)) {
      await this.loadConfigFile(configPath);
    }
  }

  /**
   * Validate configuration file path for security
   */
  private validateConfigPath(): string {
    const configPath = join(process.cwd(), 'off-peaky.config.json');
    
    // Normalize and validate path
    const normalized = configPath.replace(/\.\./g, '');
    if (normalized !== configPath) {
      throw createError.pathTraversal(configPath);
    }
    
    return normalized;
  }

  /**
   * Check file permissions for security
   */
  private async checkFilePermissions(filePath: string): Promise<void> {
    if (!(await this.fileExists(filePath))) {
      return; // File doesn't exist, no permission check needed
    }

    try {
      // Check if file is readable
      await access(filePath, constants.R_OK);
      
      // Additional security: check if file has unsafe permissions
      if (process.env.NODE_ENV === 'production') {
        const stats = await import('fs').then(fs => fs.promises.stat(filePath));
        if (stats.mode & 0o002) { // Check if world-writable
          throw createError.configPermission(
            `${filePath} is world-writable, which is unsafe`
          );
        }
      }
    } catch (error) {
      throw createError.configPermission(
        `Cannot access configuration file: ${filePath}`
      );
    }
  }

  /**
   * Safely check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load and validate config file securely
   */
  private async loadConfigFile(configPath: string): Promise<void> {
    try {
      const fileContent = readFileSync(configPath, 'utf8');
      
      // Basic security check: ensure file size is reasonable
      if (fileContent.length > 1024 * 1024) { // 1MB limit
        throw createError.configInvalid(
          'Configuration file is too large (max 1MB)'
        );
      }

      // Parse JSON with size limits
      let fileConfig;
      try {
        fileConfig = JSON.parse(fileContent);
      } catch (parseError) {
        throw createError.configInvalid(
          'Invalid JSON in configuration file'
        );
      }

      // Validate config structure
      if (typeof fileConfig !== 'object' || fileConfig === null) {
        throw createError.configInvalid(
          'Configuration must be an object'
        );
      }

      // Merge with validated default config
      this.config = { ...this.config, ...fileConfig };

    } catch (error) {
      if (error instanceof SecureError) {
        throw error;
      }
      throw createError.configInvalid(
        `Could not parse config file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get config with async initialization check
   */
  async getConfig(): Promise<AppConfig> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.config;
  }

  async getTimezone(): Promise<string> {
    const config = await this.getConfig();
    return config.timezone;
  }

  async getPeakConfig() {
    const config = await this.getConfig();
    return config.peak;
  }

  async getAlertConfig() {
    const config = await this.getConfig();
    return config.alerts;
  }

  async getClaudeConfig() {
    const config = await this.getConfig();
    return config.claude;
  }

  async getLoggingConfig() {
    const config = await this.getConfig();
    return config.logging;
  }

  async reloadConfig(): Promise<void> {
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Legacy sync methods for backward compatibility
   * These will throw if not initialized
   */
  getConfigSync(): AppConfig {
    if (!this.initialized) {
      throw createError.configInvalid(
        'Configuration not initialized. Call initialize() first or use async methods.'
      );
    }
    return this.config;
  }

  getTimezoneSync(): string {
    return this.getConfigSync().timezone;
  }

  getPeakConfigSync() {
    return this.getConfigSync().peak;
  }

  getAlertConfigSync() {
    return this.getConfigSync().alerts;
  }

  getClaudeConfigSync() {
    return this.getConfigSync().claude;
  }

  getLoggingConfigSync() {
    return this.getConfigSync().logging;
  }

  reloadConfigSync(): void {
    throw createError.configInvalid(
      'Synchronous reload not supported. Use reloadConfig() instead.'
    );
  }
}