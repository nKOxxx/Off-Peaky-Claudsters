import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { DateTime } from 'luxon';
import { createError } from '../utils/errors';
import { UsageData, ClaudeApiClient } from './ClaudeApiClient';

export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCosts: number;
  averageTokensPerRequest: number;
  averageCostPerRequest: number;
  dailyAverage: number;
  efficiency: number;
  peakHoursUsage: number;
  offPeakHoursUsage: number;
}

export class UsageTracker {
  private readonly usageFilePath: string;
  private readonly retentionDays: number = 90;
  private readonly client: ClaudeApiClient;

  constructor(apiKey?: string, customDataPath?: string) {
    // Use custom path or default to user's home directory
    const dataDir = customDataPath || join(homedir(), '.off-peaky-claudsters');
    
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    this.usageFilePath = join(dataDir, 'usage-data.json');
    this.client = new ClaudeApiClient(apiKey);
  }

  /**
   * Load usage data from file
   */
  private loadUsageData(): UsageData[] {
    try {
      if (!existsSync(this.usageFilePath)) {
        return [];
      }

      const rawData = readFileSync(this.usageFilePath, 'utf8');
      const data = JSON.parse(rawData);
      
      if (!Array.isArray(data)) {
        return [];
      }

      return data.filter((item): item is UsageData => {
        return typeof item === 'object' && 
               typeof item.requests === 'number' &&
               typeof item.tokens === 'number' &&
               typeof item.costs === 'number' &&
               typeof item.timestamp === 'string';
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Save usage data to file
   */
  private saveUsageData(data: UsageData[]): void {
    try {
      const dataDir = dirname(this.usageFilePath);
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      writeFileSync(this.usageFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
      throw createError.systemError('Failed to save usage data');
    }
  }

  /**
   * Clean up old usage data based on retention policy
   */
  private cleanupOldData(data: UsageData[]): UsageData[] {
    const cutoffDate = DateTime.now().minus({ days: this.retentionDays });
    
    return data.filter(entry => {
      const entryDate = DateTime.fromISO(entry.timestamp);
      return entryDate > cutoffDate;
    });
  }

  /**
   * Add new usage data
   */
  async addUsageData(data: Partial<UsageData> = {}): Promise<UsageData> {
    try {
      // Get current API usage if not provided
      let usageData: UsageData;
      
      if (data.requests && data.tokens) {
        // Use provided data
        usageData = {
          requests: data.requests,
          tokens: data.tokens,
          costs: data.costs || 0,
          timestamp: data.timestamp || new Date().toISOString(),
          source: data.source || 'api',
          model: data.model
        };
      } else {
        // Fetch from API
        usageData = await this.client.getUsage();
      }

      // Load existing data
      const allData = this.loadUsageData();
      
      // Clean up old data
      const cleanedData = this.cleanupOldData(allData);
      
      // Add new data
      cleanedData.push(usageData);
      
      // Sort by timestamp (most recent first)
      cleanedData.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Save updated data
      this.saveUsageData(cleanedData);
      
      return usageData;
    } catch (error) {
      if (error instanceof Error && error.name === 'SecureError') {
        throw error;
      }
      throw createError.systemError('Failed to add usage data');
    }
  }

  /**
   * Get all usage data
   */
  getAllUsageData(): UsageData[] {
    try {
      return this.loadUsageData();
    } catch (error) {
      return [];
    }
  }

  /**
   * Get usage data filtered by date range
   */
  getUsageDataByDateRange(startDate: string, endDate: string): UsageData[] {
    try {
      const allData = this.loadUsageData();
      const start = DateTime.fromISO(startDate);
      const end = DateTime.fromISO(endDate);
      
      return allData.filter(entry => {
        const entryDate = DateTime.fromISO(entry.timestamp);
        return entryDate >= start && entryDate <= end;
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Get usage data filtered by source
   */
  getUsageDataBySource(source: string): UsageData[] {
    try {
      const allData = this.loadUsageData();
      return allData.filter(entry => entry.source === source);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get comprehensive usage statistics
   */
  getUsageStats(): UsageStats {
    try {
      const allData = this.loadUsageData();
      
      if (allData.length === 0) {
        return {
          totalRequests: 0,
          totalTokens: 0,
          totalCosts: 0,
          averageTokensPerRequest: 0,
          averageCostPerRequest: 0,
          dailyAverage: 0,
          efficiency: 0,
          peakHoursUsage: 0,
          offPeakHoursUsage: 0
        };
      }

      const totalRequests = allData.reduce((sum, entry) => sum + entry.requests, 0);
      const totalTokens = allData.reduce((sum, entry) => sum + entry.tokens, 0);
      const totalCosts = allData.reduce((sum, entry) => sum + entry.costs, 0);

      const averageTokensPerRequest = totalRequests > 0 ? totalTokens / totalRequests : 0;
      const averageCostPerRequest = totalRequests > 0 ? totalCosts / totalRequests : 0;

      // Calculate daily average
      const daysWithUsage = new Set(allData.map(entry => 
        DateTime.fromISO(entry.timestamp).toISODate()
      )).size;
      
      const dailyAverage = daysWithUsage > 0 ? totalCosts / daysWithUsage : 0;

      // Categorize by peak/off-peak hours
      const peakHoursUsage = allData.filter(entry => {
        const hour = DateTime.fromISO(entry.timestamp).hour;
        return (hour >= 9 && hour <= 17) || (hour >= 19 && hour <= 22);
      }).length;

      const offPeakHoursUsage = allData.length - peakHoursUsage;

      // Calculate efficiency (higher is better - less peak usage)
      const efficiency = allData.length > 0 ? 
        Math.round((offPeakHoursUsage / allData.length) * 100) : 0;

      return {
        totalRequests,
        totalTokens,
        totalCosts: parseFloat(totalCosts.toFixed(2)),
        averageTokensPerRequest: Math.round(averageTokensPerRequest),
        averageCostPerRequest: parseFloat(averageCostPerRequest.toFixed(3)),
        dailyAverage: parseFloat(dailyAverage.toFixed(2)),
        efficiency,
        peakHoursUsage,
        offPeakHoursUsage
      };
    } catch (error) {
      throw createError.systemError('Failed to calculate usage statistics');
    }
  }

  /**
   * Export usage data to a file
   */
  exportUsageData(filePath: string): void {
    try {
      const data = this.getAllUsageData();
      const stats = this.getUsageStats();
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '2.0.0',
        statistics: stats,
        data: data
      };

      writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    } catch (error) {
      throw createError.systemError('Failed to export usage data');
    }
  }

  /**
   * Import usage data from a file
   */
  importUsageData(filePath: string): void {
    try {
      if (!existsSync(filePath)) {
        throw createError.validationError('filePath', 'File does not exist');
      }

      const rawData = readFileSync(filePath, 'utf8');
      const importData = JSON.parse(rawData);
      
      // Validate import data structure
      if (!importData.data || !Array.isArray(importData.data)) {
        throw createError.validationError('filePath', 'Invalid usage data format');
      }

      // Validate each usage entry
      const validData = importData.data.filter((item: any): item is UsageData => {
        return typeof item === 'object' && 
               typeof item.requests === 'number' &&
               typeof item.tokens === 'number' &&
               typeof item.costs === 'number' &&
               typeof item.timestamp === 'string';
      });

      if (validData.length === 0) {
        throw createError.validationError('filePath', 'No valid usage data found');
      }

      // Load existing data
      const existingData = this.loadUsageData();
      
      // Merge data (avoid duplicates based on timestamp and source)
      const mergedData = [...existingData, ...validData].reduce((acc, current) => {
        const duplicate = acc.find(item => 
          item.timestamp === current.timestamp && 
          item.source === current.source &&
          item.requests === current.requests
        );
        
        if (!duplicate) {
          return acc.concat([current]);
        }
        
        return acc;
      }, [] as UsageData[]);

      // Clean up old data
      const cleanedData = this.cleanupOldData(mergedData);
      
      // Sort by timestamp
      cleanedData.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Save merged data
      this.saveUsageData(cleanedData);
    } catch (error) {
      if (error instanceof Error && error.name === 'SecureError') {
        throw error;
      }
      throw createError.systemError('Failed to import usage data');
    }
  }

  /**
   * Clear all usage data
   */
  clearUsageData(): void {
    try {
      if (existsSync(this.usageFilePath)) {
        unlinkSync(this.usageFilePath);
      }
    } catch (error) {
      throw createError.systemError('Failed to clear usage data');
    }
  }

  /**
   * Test if usage tracking is working
   */
  async testUsageTracking(): Promise<boolean> {
    try {
      const stats = this.getUsageStats();
      const testEntry = await this.addUsageData({
        requests: 1,
        tokens: 100,
        costs: 0.01,
        timestamp: new Date().toISOString(),
        source: 'test'
      });
      
      return testEntry.requests === 1 && testEntry.tokens === 100;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get usage data file path
   */
  getUsageFilePath(): string {
    return this.usageFilePath;
  }
}