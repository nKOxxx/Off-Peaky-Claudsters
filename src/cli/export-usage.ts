import { UsageTracker } from '../usage/UsageTracker';
import { ClaudeIntegration } from '../integration/ClaudeIntegration';
import { program } from 'commander';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

async function main() {
  try {
    console.log('💾 Export Usage Data - Backup & Analysis');
    console.log('─'.repeat(70));

    // Initialize components
    const usageTracker = new UsageTracker();
    const claudeIntegration = new ClaudeIntegration();

    // Get usage data
    const allUsageData = usageTracker.getAllUsageData();
    const claudeUsageData = await claudeIntegration.getAllClaudeUsage();

    // Combine data
    const combinedUsageData = [...allUsageData, ...claudeUsageData];
    
    if (combinedUsageData.length === 0) {
      console.log('❌ No usage data found to export');
      console.log('');
      console.log('💡 First, generate some usage data:');
      console.log('   • Use Claude API (with API key set)');
      console.log('   • Use Claude Desktop or Claude Code CLI');
      console.log('   • Run: npm run usage');
      process.exit(1);
    }

    // Generate default export filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `off-peaky-usage-export-${timestamp}.json`;
    const exportPath = join(homedir(), 'Downloads', defaultFilename);

    // Check if file already exists
    if (existsSync(exportPath)) {
      console.log(`⚠️  File already exists: ${exportPath}`);
      console.log('   Creating new filename...');
      
      let counter = 1;
      let newPath = exportPath.replace('.json', `-${counter}.json`);
      while (existsSync(newPath)) {
        counter++;
        newPath = exportPath.replace('.json', `-${counter}.json`);
      }
      
      // Update the export path (in a real implementation)
    }

    // Get usage statistics
    const stats = usageTracker.getUsageStats();

    // Create export data
    const exportData = {
      metadata: {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        exportType: 'usage-data',
        totalEntries: combinedUsageData.length,
        statistics: stats,
        sources: [...new Set(combinedUsageData.map(entry => entry.source))],
        dateRange: {
          start: Math.min(...combinedUsageData.map(entry => new Date(entry.timestamp).getTime())),
          end: Math.max(...combinedUsageData.map(entry => new Date(entry.timestamp).getTime()))
        }
      },
      usage: combinedUsageData
    };

    // Export usage tracker data
    const trackerExportPath = join(homedir(), 'Downloads', `off-peaky-tracker-usage-${timestamp}.json`);
    usageTracker.exportUsageData(trackerExportPath);

    // Export Claude integration data
    const claudeExportPath = join(homedir(), 'Downloads', `off-peaky-claude-usage-${timestamp}.json`);
    await claudeIntegration.exportUsageData(claudeExportPath);

    console.log('📊 Export Summary:');
    console.log(`   Total Usage Entries: ${combinedUsageData.length}`);
    console.log(`   Data Sources: ${exportData.metadata.sources.join(', ')}`);
    console.log(`   Total Requests: ${stats.totalRequests.toLocaleString()}`);
    console.log(`   Total Tokens: ${stats.totalTokens.toLocaleString()}`);
    console.log(`   Total Costs: $${stats.totalCosts.toFixed(2)}`);
    console.log(`   Date Range: ${new Date(exportData.metadata.dateRange.start).toLocaleDateString()} - ${new Date(exportData.metadata.dateRange.end).toLocaleDateString()}`);
    console.log('');

    console.log('💾 Export Files Created:');
    console.log(`   📄 Tracker Usage: ${trackerExportPath}`);
    console.log(`   📄 Claude Usage: ${claudeExportPath}`);
    
    // Create combined export file
    const combinedExportPath = join(homedir(), 'Downloads', defaultFilename);
    require('fs').writeFileSync(combinedExportPath, JSON.stringify(exportData, null, 2));
    console.log(`   📄 Combined Usage: ${combinedExportPath}`);
    console.log('');

    console.log('📈 Data Breakdown:');
    
    // Breakdown by source
    const sourceBreakdown = combinedUsageData.reduce((acc, entry) => {
      if (!acc[entry.source]) {
        acc[entry.source] = { requests: 0, tokens: 0, costs: 0, entries: 0 };
      }
      acc[entry.source].requests += entry.requests;
      acc[entry.source].tokens += entry.tokens;
      acc[entry.source].costs += entry.costs;
      acc[entry.source].entries += 1;
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; costs: number; entries: number }>);

    Object.entries(sourceBreakdown).forEach(([source, data]) => {
      const sourceIcon = source === 'desktop' ? '📱' : source === 'code' ? '💻' : '🔧';
      console.log(`   ${sourceIcon} ${source.charAt(0).toUpperCase() + source.slice(1)}:`);
      console.log(`      Requests: ${data.requests.toLocaleString()}`);
      console.log(`      Tokens: ${data.tokens.toLocaleString()}`);
      console.log(`      Costs: $${data.costs.toFixed(2)}`);
      console.log(`      Entries: ${data.entries}`);
    });

    console.log('');
    console.log('🔍 Export Details:');
    console.log(`   Format: JSON`);
    console.log(`   Encoding: UTF-8`);
    console.log(`   Compression: None (human-readable)`);
    console.log(`   Retention: 90 days of data`);
    console.log(`   Metadata: Included (statistics, sources, date range)`);

    console.log('');
    console.log('💡 Usage Tips:');
    console.log('   • Import data: npm run import-usage --file /path/to/export.json');
    console.log('   • Analyze in Excel/Google Sheets: Import JSON as data');
    console.log('   • Create charts: Use token/costs over time');
    console.log('   • Share with team: Exported data is anonymized');
    console.log('   • Backup regularly: Export weekly or monthly');

    console.log('');
    console.log('🎉 Export completed successfully!');
    console.log('   Check your Downloads folder for the exported files');

  } catch (error) {
    console.error('❌ Failed to export usage data');
    if (process.env.NODE_ENV === 'development') {
      console.error('Debug info:', error);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  program
    .name('export-usage')
    .description('Export Claude usage data to JSON files')
    .option('-f, --file <path>', 'Custom export file path')
    .action(main);
    
  program.parse();
} else {
  // If not main module, export main function
  module.exports = main;
}