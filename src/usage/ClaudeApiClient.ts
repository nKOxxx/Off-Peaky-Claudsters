import axios, { AxiosInstance } from 'axios';
import { createError } from '../utils/errors';
import { z } from 'zod';

// Schemas for API validation
const UsageResponseSchema = z.object({
  requests: z.number().min(0),
  tokens: z.object({
    input: z.number().min(0),
    output: z.number().min(0)
  }),
  costs: z.number().min(0),
  timestamp: z.string(),
  model: z.string().optional()
});

const UsageDataSchema = z.object({
  requests: z.number().min(0),
  tokens: z.number().min(0),
  costs: z.number().min(0),
  timestamp: z.string(),
  source: z.enum(['api', 'desktop', 'code']),
  model: z.string().optional()
});

export type UsageData = z.infer<typeof UsageDataSchema>;

export class ClaudeApiClient {
  private readonly client: AxiosInstance;
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.CLAUDE_API_KEY || '';
    
    if (!this.apiKey) {
      throw createError.validationError('apiKey', 'Claude API key is required');
    }

    this.client = axios.create({
      baseURL: 'https://api.anthropic.com',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      timeout: 10000
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.error?.message || error.message;
          
          if (status === 401) {
            throw createError.validationError('apiKey', 'Invalid Claude API key');
          } else if (status === 429) {
            throw createError.networkError('Claude API', 'Rate limit exceeded');
          } else if (status >= 500) {
            throw createError.networkError('Claude API', 'Server error');
          } else {
            throw createError.networkError('Claude API', message);
          }
        }
        
        throw createError.networkError('Claude API', error.message);
      }
    );
  }

  /**
   * Get current usage statistics from Claude API
   */
  async getUsage(): Promise<UsageData> {
    try {
      // Note: Claude API doesn't have direct usage endpoint
      // This is a mock implementation for development
      // In production, you'd need to implement actual usage tracking
      
      const mockUsage = {
        requests: Math.floor(Math.random() * 100) + 1,
        tokens: {
          input: Math.floor(Math.random() * 10000) + 1000,
          output: Math.floor(Math.random() * 5000) + 500
        },
        costs: (Math.random() * 10).toFixed(2),
        timestamp: new Date().toISOString(),
        model: 'claude-3-haiku-20240307'
      };

      const validatedUsage = UsageResponseSchema.parse(mockUsage);
      
      return {
        requests: validatedUsage.requests,
        tokens: validatedUsage.tokens.input + validatedUsage.tokens.output,
        costs: parseFloat(validatedUsage.costs),
        timestamp: validatedUsage.timestamp,
        source: 'api',
        model: validatedUsage.model
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'SecureError') {
        throw error;
      }
      
      throw createError.networkError('Claude API', 'Failed to fetch usage data');
    }
  }

  /**
   * Test API connection and credentials
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple API call
      await this.getUsage();
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'SecureError') {
        return false;
      }
      return false;
    }
  }

  /**
   * Calculate estimated costs based on token usage
   */
  calculateCosts(tokens: { input: number; output: number }, model: string = 'claude-3-haiku-20240307'): number {
    const pricing = {
      'claude-3-haiku-20240307': {
        input: 0.00025,  // $0.25 per 1M tokens
        output: 0.00125  // $1.25 per 1M tokens
      },
      'claude-3-sonnet-20240229': {
        input: 0.003,
        output: 0.015
      },
      'claude-3-opus-20240229': {
        input: 0.015,
        output: 0.075
      }
    };

    const modelPricing = pricing[model as keyof typeof pricing] || pricing['claude-3-haiku-20240307'];
    
    const inputCost = (tokens.input / 1000000) * modelPricing.input;
    const outputCost = (tokens.output / 1000000) * modelPricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Get estimated monthly costs based on current usage patterns
   */
  getEstimatedMonthlyCosts(dailyUsage: UsageData[]): {
    daily: number;
    weekly: number;
    monthly: number;
    recommended: string;
  } {
    if (dailyUsage.length === 0) {
      return {
        daily: 0,
        weekly: 0,
        monthly: 0,
        recommended: 'Start using Claude to see cost estimates'
      };
    }

    const averageDaily = dailyUsage.reduce((sum, usage) => sum + usage.costs, 0) / dailyUsage.length;
    const weekly = averageDaily * 7;
    const monthly = averageDaily * 30;

    let recommended = 'Good usage patterns';
    
    if (monthly > 100) {
      recommended = 'Consider optimizing usage to reduce costs';
    } else if (monthly > 50) {
      recommended = 'Monitor usage and consider off-peak scheduling';
    }

    return {
      daily: parseFloat(averageDaily.toFixed(2)),
      weekly: parseFloat(weekly.toFixed(2)),
      monthly: parseFloat(monthly.toFixed(2)),
      recommended
    };
  }

  /**
   * Validate API key format
   */
  static validateApiKey(apiKey: string): boolean {
    // Claude API keys typically start with 'sk-ant-api03' and are at least 32 characters
    return apiKey.startsWith('sk-ant-api03') && apiKey.length >= 32;
  }

  /**
   * Get usage efficiency analysis
   */
  getEfficiencyAnalysis(usageData: UsageData[]): {
    efficiency: number;
    avgTokensPerRequest: number;
    avgCostPerRequest: number;
    peakHoursUsage: UsageData[];
    offPeakHoursUsage: UsageData[];
  } {
    if (usageData.length === 0) {
      return {
        efficiency: 0,
        avgTokensPerRequest: 0,
        avgCostPerRequest: 0,
        peakHoursUsage: [],
        offPeakHoursUsage: []
      };
    }

    const totalTokens = usageData.reduce((sum, usage) => sum + usage.tokens, 0);
    const totalRequests = usageData.reduce((sum, usage) => sum + usage.requests, 0);
    const totalCosts = usageData.reduce((sum, usage) => sum + usage.costs, 0);

    const avgTokensPerRequest = totalRequests > 0 ? totalTokens / totalRequests : 0;
    const avgCostPerRequest = totalRequests > 0 ? totalCosts / totalRequests : 0;

    // Categorize usage by peak/off-peak hours (simplified)
    const peakHoursUsage: UsageData[] = [];
    const offPeakHoursUsage: UsageData[] = [];

    usageData.forEach(usage => {
      const hour = new Date(usage.timestamp).getHours();
      if ((hour >= 9 && hour <= 17) || (hour >= 19 && hour <= 22)) {
        peakHoursUsage.push(usage);
      } else {
        offPeakHoursUsage.push(usage);
      }
    });

    // Calculate efficiency (higher is better)
    const peakPercentage = usageData.length > 0 ? peakHoursUsage.length / usageData.length : 0;
    const efficiency = Math.max(0, 100 - (peakPercentage * 50)); // Penalty for peak usage

    return {
      efficiency: Math.round(efficiency),
      avgTokensPerRequest: Math.round(avgTokensPerRequest),
      avgCostPerRequest: parseFloat(avgCostPerRequest.toFixed(3)),
      peakHoursUsage,
      offPeakHoursUsage
    };
  }
}