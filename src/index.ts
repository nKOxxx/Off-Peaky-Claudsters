#!/usr/bin/env node

/**
 * Off-Peaky Claudsters v2.0
 * Claude API peak/off-peak tracker with complete Claude integration, usage tracking, and two-terminal workflow optimization
 */

import { Command } from 'commander';
import { loadConfig } from './config/ConfigManager';
import { PeakTracker } from './tracker/PeakTracker';
import { UsageTracker } from './usage/UsageTracker';
import { ClaudeIntegration } from './integration/ClaudeIntegration';
import { createError } from './utils/errors';
import { logger } from './utils/logger';

// Import CLI commands
import './cli/status';
import './cli/predict';
import './cli/usage';
import './cli/claude-integration';
import './cli/timezone-check';
import './cli/export-usage';
import './cli/import-usage';

// Set up CLI program
const program = new Command();

program
  .name('off-peaky-claudsters')
  .description('Claude API peak/off-peak tracker with complete Claude integration and usage tracking')
  .version('2.0.0')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Suppress all output except errors')
  .option('--no-color', 'Disable colored output');

// Global options
program.hook('preAction', (thisProgram) => {
  const options = thisProgram.opts();
  
  // Load configuration
  try {
    const config = loadConfig(options.config);
    
    // Set up logging based on options
    if (options.verbose) {
      logger.setLevel('debug');
    } else if (options.quiet) {
      logger.setLevel('error');
    } else {
      logger.setLevel('info');
    }
    
    // Disable colors if requested
    if (options.noColor) {
      process.env.FORCE_COLOR = '0';
    }
    
    logger.debug('Configuration loaded successfully');
    
  } catch (error) {
    if (error instanceof Error && error.name === 'SecureError') {
      console.error(`❌ Configuration error: ${error.message}`);
      process.exit(1);
    }
    
    console.error('⚠️  Using default configuration');
  }
});

// Add core commands
program
  .command('status')
  .description('Show current peak/off-peak status')
  .option('-t, --timezone <timezone>', 'Specify timezone (default: Europe/Sofia)')
  .option('-j, --json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const peakTracker = new PeakTracker(options.timezone);
      const status = peakTracker.getCurrentStatus();
      
      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        peakTracker.displayStatus(status);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'SecureError') {
        console.error(`❌ ${error.message}`);
        process.exit(1);
      }
      console.error('❌ Failed to get peak status');
      process.exit(1);
    }
  });

program
  .command('predict')
  .description('Show 24-hour timing predictions')
  .option('-t, --timezone <timezone>', 'Specify timezone (default: Europe/Sofia)')
  .option('-j, --json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const peakTracker = new PeakTracker(options.timezone);
      const predictions = peakTracker.get24HourPredictions();
      
      if (options.json) {
        console.log(JSON.stringify(predictions, null, 2));
      } else {
        peakTracker.displayPredictions(predictions);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'SecureError') {
        console.error(`❌ ${error.message}`);
        process.exit(1);
      }
      console.error('❌ Failed to get predictions');
      process.exit(1);
    }
  });

program
  .command('usage')
  .description('Track Claude API usage and costs')
  .option('--api-key <key>', 'Claude API key (or set CLAUDE_API_KEY env var)')
  .option('-j, --json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const usageTracker = new UsageTracker(options.apiKey);
      const stats = usageTracker.getUsageStats();
      
      if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        console.log('📊 Claude Usage Statistics:');
        console.log(`   Total Requests: ${stats.totalRequests.toLocaleString()}`);
        console.log(`   Total Tokens: ${stats.totalTokens.toLocaleString()}`);
        console.log(`   Total Costs: $${stats.totalCosts.toFixed(2)}`);
        console.log(`   Usage Efficiency: ${stats.efficiency}%`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'SecureError') {
        console.error(`❌ ${error.message}`);
        process.exit(1);
      }
      console.error('❌ Failed to get usage statistics');
      process.exit(1);
    }
  });

program
  .command('claude-integration')
  .description('Check Claude Desktop and Code CLI integration')
  .action(async () => {
    try {
      const claudeIntegration = new ClaudeIntegration();
      const report = await claudeIntegration.getIntegrationReport();
      
      console.log('🤖 Claude Integration Report:');
      console.log(`   Claude Desktop: ${report.desktop.installed ? '✅ Installed' : '❌ Not Installed'}`);
      console.log(`   Claude Code CLI: ${report.code.installed ? '✅ Installed' : '❌ Not Installed'}`);
      console.log(`   Total Usage Entries: ${report.usage.length}`);
      
      if (report.recommendations.length > 0) {
        console.log('');
        console.log('💡 Recommendations:');
        report.recommendations.forEach((rec, index) => {
          console.log(`   ${index === 0 ? '🎯' : '📝'} ${rec}`);
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'SecureError') {
        console.error(`❌ ${error.message}`);
        process.exit(1);
      }
      console.error('❌ Failed to get Claude integration report');
      process.exit(1);
    }
  });

program
  .command('timezone-check')
  .description('Compare 70+ global timezones for optimal timing')
  .option('--sort <criteria>', 'Sort by: time, offset, or name (default: offset)')
  .action(async (options) => {
    try {
      const peakTracker = new PeakTracker();
      const globalTimezones = await peakTracker.getGlobalTimezoneComparison();
      
      console.log('🌍 Global Timezone Comparison:');
      console.log(`   Showing ${globalTimezones.length} major cities`);
      
      // Sort based on criteria
      const sortedTimezones = [...globalTimezones].sort((a, b) => {
        switch (options.sort) {
          case 'time':
            return a.hour - b.hour;
          case 'name':
            return a.city.localeCompare(b.city);
          default: // offset
            return a.offset - b.offset;
        }
      });
      
      sortedTimezones.forEach(tz => {
        const status = tz.isPeak ? '⚠️ PEAK' : '✅ OPTIMAL';
        console.log(`   ${tz.flag} ${tz.city.padEnd(15)} ${tz.localTime} (${tz.diffDisplay}) ${status}`);
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'SecureError') {
        console.error(`❌ ${error.message}`);
        process.exit(1);
      }
      console.error('❌ Failed to get timezone comparison');
      process.exit(1);
    }
  });

program
  .command('export-usage')
  .description('Export usage data to JSON file')
  .option('-o, --output <path>', 'Output file path')
  .option('-f, --format <format>', 'Export format: json, csv (default: json)')
  .action(async (options) => {
    try {
      const usageTracker = new UsageTracker();
      const claudeIntegration = new ClaudeIntegration();
      
      const outputPath = options.output || 
        `off-peaky-usage-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      
      // Export data
      if (options.format === 'csv') {
        // CSV export logic would go here
        console.log('🚧 CSV export not yet implemented');
      } else {
        // JSON export
        const allUsageData = usageTracker.getAllUsageData();
        const claudeUsageData = await claudeIntegration.getAllClaudeUsage();
        
        const exportData = {
          exportedAt: new Date().toISOString(),
          version: '2.0.0',
          totalEntries: allUsageData.length + claudeUsageData.length,
          usage: [...allUsageData, ...claudeUsageData]
        };
        
        require('fs').writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
        console.log(`✅ Usage data exported to: ${outputPath}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'SecureError') {
        console.error(`❌ ${error.message}`);
        process.exit(1);
      }
      console.error('❌ Failed to export usage data');
      process.exit(1);
    }
  });

program
  .command('import-usage')
  .description('Import usage data from JSON file')
  .argument('<file>', 'Path to usage export file')
  .action(async (filePath) => {
    try {
      const usageTracker = new UsageTracker();
      const claudeIntegration = new ClaudeIntegration();
      
      if (!require('fs').existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
      }
      
      // Import data
      await claudeIntegration.importUsageData(filePath);
      
      console.log('✅ Usage data imported successfully');
      console.log('   Run "npm run usage" to see updated statistics');
    } catch (error) {
      if (error instanceof Error && error.name === 'SecureError') {
        console.error(`❌ ${error.message}`);
        process.exit(1);
      }
      console.error('❌ Failed to import usage data');
      process.exit(1);
    }
  });

// Add help command
program
  .command('help')
  .description('Display help information')
  .action(() => {
    console.log('🎯 Off-Peaky Claudsters v2.0 - Claude Optimization Tool');
    console.log('');
    console.log('📋 Available Commands:');
    console.log('   status           - Show current peak/off-peak status');
    console.log('   predict          - Show 24-hour timing predictions');
    console.log('   usage            - Track Claude API usage and costs');
    console.log('   claude-integration - Check Claude app integration');
    console.log('   timezone-check   - Compare global timezones');
    console.log('   export-usage     - Export usage data');
    console.log('   import-usage     - Import usage data');
    console.log('   help             - Show this help');
    console.log('   version          - Show version');
    console.log('');
    console.log('💡 Quick Start:');
    console.log('   1. Set Claude API key: export CLAUDE_API_KEY=your_key');
    console.log('   2. Check status: npm run status');
    console.log('   3. Check integration: npm run claude-integration');
    console.log('   4. Track usage: npm run usage');
    console.log('');
    console.log('🔧 Environment Variables:');
    console.log('   CLAUDE_API_KEY      - Your Claude API key');
    console.log   '   TZ                  - Your timezone (e.g., Europe/Sofia)');
    console.log('   NODE_ENV            - Development/production mode');
    console.log('');
    console.log('🌐 Documentation: https://github.com/nKOxxx/Off-Peaky-Claudsters');
    console.log('🤔 Issues: https://github.com/nKOxxx/Off-Peaky-Claudsters/issues');
  });

// Default command - show status
program.action(async () => {
  try {
    const peakTracker = new PeakTracker();
    const status = peakTracker.getCurrentStatus();
    peakTracker.displayStatus(status);
  } catch (error) {
    if (error instanceof Error && error.name === 'SecureError') {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
    console.error('❌ Failed to get status');
    process.exit(1);
  }
});

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (error) {
  if (error instanceof Error && error.name === 'SecureError') {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
  
  console.error('❌ Unexpected error occurred');
  if (process.env.NODE_ENV === 'development') {
    console.error('Debug info:', error);
  }
  process.exit(1);
}

export { program };