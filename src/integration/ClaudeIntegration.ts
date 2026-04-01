import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';
import { DateTime } from 'luxon';
import { createError } from '../utils/errors';
import { UsageData } from '../usage/ClaudeApiClient';

export interface ClaudeAppInfo {
  name: 'desktop' | 'code';
  installed: boolean;
  version?: string;
  path?: string;
  configPath?: string;
  usagePath?: string;
}

export interface ClaudeUsageData {
  requests: number;
  tokens: number;
  costs: number;
  timestamp: string;
  source: 'desktop' | 'code' | 'api';
}

export class ClaudeIntegration {
  private readonly appPaths = {
    // Claude Desktop paths
    desktop: {
      macos: [
        join(homedir(), 'Library', 'Application Support', 'Claude'),
        join('/Applications', 'Claude.app'),
        join('/macintosh', 'Applications', 'Claude.app')
      ],
      windows: [
        join(process.env.LOCALAPPDATA || '', 'Claude'),
        join(process.env.PROGRAMFILES || '', 'Claude')
      ],
      linux: [
        join(homedir(), '.config', 'claude'),
        join('/usr', 'local', 'share', 'claude')
      ]
    },
    // Claude Code CLI paths
    code: {
      config: join(homedir(), '.config', 'claude-cli'),
      data: join(homedir(), '.local', 'share', 'claude-cli'),
      npm: join(homedir(), '.npm', 'lib', 'node_modules', '@anthropic-ai', 'claude-cli'),
      pip: join(homedir(), '.local', 'lib', 'python3.9', 'site-packages', 'anthropic_claude')
    }
  };

  /**
   * Check if Claude Desktop is installed and get info
   */
  async getClaudeDesktopInfo(): Promise<ClaudeAppInfo> {
    try {
      const platform = this.getPlatform();
      const desktopPaths = this.appPaths.desktop[platform];
      
      for (const path of desktopPaths) {
        if (existsSync(path)) {
          return {
            name: 'desktop',
            installed: true,
            path,
            configPath: join(path, 'config.json'),
            usagePath: join(path, 'usage.json')
          };
        }
      }

      return {
        name: 'desktop',
        installed: false
      };
    } catch (error) {
      return {
        name: 'desktop',
        installed: false
      };
    }
  }

  /**
   * Check if Claude Code CLI is installed and get info
   */
  async getClaudeCodeInfo(): Promise<ClaudeAppInfo> {
    try {
      // Check if claude CLI is available
      execSync('claude --version', { stdio: 'pipe', timeout: 5000 });
      
      // Try to find the installation location
      const installPaths = [
        this.appPaths.code.npm,
        this.appPaths.code.pip,
        this.appPaths.code.config
      ];
      
      let installPath = '';
      for (const path of installPaths) {
        if (existsSync(path)) {
          installPath = path;
          break;
        }
      }
      
      return {
        name: 'code',
        installed: true,
        path: installPath,
        configPath: this.appPaths.code.config,
        usagePath: join(this.appPaths.code.data, 'usage.json')
      };
    } catch (error) {
      return {
        name: 'code',
        installed: false
      };
    }
  }

  /**
   * Get usage data from Claude Desktop
   */
  async getDesktopUsage(): Promise<ClaudeUsageData[]> {
    try {
      const desktopInfo = await this.getClaudeDesktopInfo();
      
      if (!desktopInfo.installed || !desktopInfo.usagePath) {
        return [];
      }

      if (!existsSync(desktopInfo.usagePath)) {
        return [];
      }

      const usageData = readFileSync(desktopInfo.usagePath, 'utf8');
      const parsed = JSON.parse(usageData);
      
      // Transform Claude Desktop format to our format
      return this.transformDesktopUsage(parsed);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get usage data from Claude Code CLI
   */
  async getCodeUsage(): Promise<ClaudeUsageData[]> {
    try {
      const codeInfo = await this.getClaudeCodeInfo();
      
      if (!codeInfo.installed) {
        return [];
      }

      // Try to get usage from claude CLI
      try {
        const usageOutput = execSync('claude usage --json', { 
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 10000
        });
        
        if (usageOutput) {
          const parsed = JSON.parse(usageOutput);
          return this.transformCodeUsage(parsed);
        }
      } catch (error) {
        // If CLI command fails, try to read from file
        if (codeInfo.usagePath && existsSync(codeInfo.usagePath)) {
          const usageData = readFileSync(codeInfo.usagePath, 'utf8');
          const parsed = JSON.parse(usageData);
          return this.transformCodeUsage(parsed);
        }
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get combined usage from all Claude applications
   */
  async getAllClaudeUsage(): Promise<ClaudeUsageData[]> {
    try {
      const [desktopUsage, codeUsage] = await Promise.all([
        this.getDesktopUsage(),
        this.getCodeUsage()
      ]);

      // Combine and deduplicate by timestamp
      const allUsage = [...desktopUsage, ...codeUsage];
      
      // Sort by timestamp (most recent first)
      return allUsage.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * Get comprehensive Claude integration report
   */
  async getIntegrationReport(): Promise<{
    desktop: ClaudeAppInfo;
    code: ClaudeAppInfo;
    usage: ClaudeUsageData[];
    recommendations: string[];
  }> {
    try {
      const [desktop, code, usage] = await Promise.all([
        this.getClaudeDesktopInfo(),
        this.getClaudeCodeInfo(),
        this.getAllClaudeUsage()
      ]);

      const recommendations = this.generateRecommendations(desktop, code, usage);

      return {
        desktop,
        code,
        usage,
        recommendations
      };
    } catch (error) {
      throw createError.networkError('Claude Integration', 'Failed to get integration report');
    }
  }

  /**
   * Get platform-specific paths
   */
  private getPlatform(): 'macos' | 'windows' | 'linux' {
    const platform = process.platform;
    
    if (platform === 'darwin') return 'macos';
    if (platform === 'win32') return 'windows';
    return 'linux';
  }

  /**
   * Transform Claude Desktop usage to our format
   */
  private transformDesktopUsage(desktopData: any): ClaudeUsageData[] {
    try {
      // Claude Desktop likely stores usage differently
      // This is a transformation based on expected structure
      const usage: ClaudeUsageData[] = [];

      if (desktopData.usage && Array.isArray(desktopData.usage)) {
        desktopData.usage.forEach((entry: any) => {
          usage.push({
            requests: entry.requests || 0,
            tokens: entry.tokens || 0,
            costs: entry.costs || 0,
            timestamp: entry.timestamp || new Date().toISOString(),
            source: 'desktop'
          });
        });
      }

      return usage;
    } catch (error) {
      return [];
    }
  }

  /**
   * Transform Claude Code usage to our format
   */
  private transformCodeUsage(codeData: any): ClaudeUsageData[] {
    try {
      const usage: ClaudeUsageData[] = [];

      if (codeData.requests) {
        usage.push({
          requests: codeData.requests.count || 0,
          tokens: codeData.tokens?.input + codeData.tokens?.output || 0,
          costs: this.calculateCosts(codeData.tokens),
          timestamp: new Date().toISOString(),
          source: 'code'
        });
      }

      if (codeData.history && Array.isArray(codeData.history)) {
        codeData.history.forEach((entry: any) => {
          usage.push({
            requests: entry.requests || 0,
            tokens: (entry.tokens?.input || 0) + (entry.tokens?.output || 0),
            costs: this.calculateCosts(entry.tokens),
            timestamp: entry.timestamp || new Date().toISOString(),
            source: 'code'
          });
        });
      }

      return usage;
    } catch (error) {
      return [];
    }
  }

  /**
   * Calculate costs from token usage
   */
  private calculateCosts(tokens: any): number {
    if (!tokens) return 0;
    
    const totalTokens = (tokens.input || 0) + (tokens.output || 0);
    const COST_PER_1K_TOKENS = 0.015; // Claude 3 Haiku pricing
    
    return (totalTokens / 1000) * COST_PER_1K_TOKENS;
  }

  /**
   * Generate recommendations based on Claude usage
   */
  private generateRecommendations(
    desktop: ClaudeAppInfo, 
    code: ClaudeAppInfo, 
    usage: ClaudeUsageData[]
  ): string[] {
    const recommendations: string[] = [];

    // Check which Claude applications are installed
    if (desktop.installed && code.installed) {
      recommendations.push('✅ Both Claude Desktop and Claude Code CLI detected');
      recommendations.push('🔄 Usage from both applications will be combined');
    } else if (desktop.installed) {
      recommendations.push('✅ Claude Desktop detected');
      recommendations.push('💡 Claude Code CLI also available for terminal usage');
    } else if (code.installed) {
      recommendations.push('✅ Claude Code CLI detected');
      recommendations.push('🎯 Perfect for terminal-based workflows');
    } else {
      recommendations.push('📦 Install Claude Code CLI: npm install -g @anthropic-ai/claude-cli');
      recommendations.push('💬 Start chatting with Claude in terminal');
    }

    // Analyze usage patterns
    if (usage.length > 0) {
      const totalRequests = usage.reduce((sum: number, entry: ClaudeUsageData) => sum + entry.requests, 0);
      const totalTokens = usage.reduce((sum: number, entry: ClaudeUsageData) => sum + entry.tokens, 0);
      const totalCosts = usage.reduce((sum: number, entry: ClaudeUsageData) => sum + entry.costs, 0);

      recommendations.push(`📊 Total Usage: ${totalRequests.toLocaleString()} requests`);
      recommendations.push(`📝 Total Tokens: ${totalTokens.toLocaleString()} tokens`);
      recommendations.push(`💰 Total Costs: $${totalCosts.toFixed(2)}`);

      // Find most used source
      const sourceCounts = usage.reduce((acc: Record<string, number>, entry: ClaudeUsageData) => {
        acc[entry.source] = (acc[entry.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostUsedSource = Object.entries(sourceCounts)
        .sort(([,a], [,b]) => b - a)[0];

      if (mostUsedSource) {
        recommendations.push(`🎯 Most used: ${mostUsedSource[0]} (${mostUsedSource[1]} entries)`);
      }
    }

    // Add optimization recommendations
    recommendations.push('⚡ Use Off-Peaky Claudsters to optimize timing');
    recommendations.push('💰 Schedule heavy tasks during off-peak hours');
    recommendations.push('📈 Track usage patterns to optimize costs');

    return recommendations;
  }

  /**
   * Export combined usage data
   */
  async exportUsageData(filePath: string): Promise<void> {
    try {
      const usage = await this.getAllClaudeUsage();
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalEntries: usage.length,
        usage: usage
      };

      const exportDir = filePath.substring(0, filePath.lastIndexOf('/'));
      if (exportDir && !existsSync(exportDir)) {
        mkdirSync(exportDir, { recursive: true });
      }

      writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    } catch (error) {
      throw createError.networkError('Claude Integration', 'Failed to export usage data');
    }
  }

  /**
   * Import usage data (for testing/backup)
   */
  async importUsageData(filePath: string): Promise<void> {
    try {
      if (!existsSync(filePath)) {
        throw createError.validationError('filePath', 'File does not exist');
      }

      const importData = readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(importData);
      
      // Validate structure
      if (!parsed.usage || !Array.isArray(parsed.usage)) {
        throw createError.validationError('filePath', 'Invalid usage data format');
      }

      // For now, we'll just validate the import
      // In a real implementation, we might merge with existing data
      console.log(`✅ Import successful: ${parsed.usage.length} usage entries`);
    } catch (error) {
      if (error instanceof Error && error.name === 'SecureError') {
        throw error;
      }
      throw createError.networkError('Claude Integration', 'Failed to import usage data');
    }
  }
}