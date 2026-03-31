export interface TimeWindow {
  start: DateTime;
  end: DateTime;
  isPeak: boolean;
}

export interface PeakConfig {
  weekdays: number[]; // 1-7 (Mon-Sun)
  peakHours: {
    start: string; // HH:mm
    end: string;   // HH:mm
  };
  timezone: string;
}

export interface UsageStats {
  requests: number;
  tokens: number;
  timestamp: DateTime;
}

export interface ScheduleTask {
  id: string;
  command: string;
  scheduledAt: DateTime;
  executed: boolean;
  result?: string;
}

export interface AlertConfig {
  slack?: {
    webhook: string;
    channel?: string;
  };
  telegram?: {
    botToken: string;
    chatId: string;
  };
}

export interface ClaudeConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface AppConfig {
  timezone: string;
  peak: PeakConfig;
  alerts: AlertConfig;
  claude?: ClaudeConfig;
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
  };
}