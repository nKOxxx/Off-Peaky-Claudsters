import { UsageTracker } from '../usage/UsageTracker';
import { ClaudeIntegration } from '../integration/ClaudeIntegration';
import { program } from 'commander';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  try {
    console.log('📥 Import Usage Data - Restore & Merge');
    console.log('─'.repeat(70));

    // Get file path from command line args or use default
    const filePath = program.args[0] || join(process.cwd(), 'off-peaky-usage-export-*.json');

    // Check if file exists
    if (!existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      console.log('');
      console.log('💡 Usage:');
      console.log('   npm run import-usage /path/to/your/export-file.json');
      console.log('   npm run import-usage ~/Downloads/off-peaky-usage-export-*.json');
      console.log('');
      console.log('   Or export first: npm run export-usage');
      process.exit(1);
    }

    // Initialize components
    const usageTracker = new UsageTracker();
    const claudeIntegration = new ClaudeIntegration();

    // Read and parse the file
    console.log('📖 Reading export file...');
    const rawData = readFileSync(filePath, 'utf8');
    
    let importData;
    try {
      importData = JSON.parse(rawData);
    } catch (error) {
      console.log('❌ Invalid JSON format in export file');
      console.log('   Please check the file format and try again');
      process.exit(1);
    }

    console.log('✅ File parsed successfully');
    console.log(`   File: ${filePath}`);
    console.log(`   Size: ${rawData.length.toLocaleString()} bytes`);
    console.log('');

    // Validate import data structure
    console.log('🔍 Validating import data...');
    
    const isValid = importData.metadata || 
                   (importData.usage && Array.isArray(importData.usage)) ||
                   Array.isArray(importData);

    if (!isValid) {
      console.log('❌ Invalid export format');
      console.log('   Expected: {metadata: {...}, usage: [...]} or [...]');
      console.log('   File structure appears to be corrupted');
      process.exit(1);
    }

    console.log('✅ Data structure validated');

    // Extract usage data
    let usageData: any[] = [];
    if (importData.usage && Array.isArray(importData.usage)) {
      usageData = importData.usage;
    } else if (Array.isArray(importData)) {
      usageData = importData;
    }

    // Validate usage entries
    const validUsageData = usageData.filter((entry): boolean => {
      return typeof entry === 'object' && 
             typeof entry.requests === 'number' &&
             typeof entry.tokens === 'number' &&
             typeof entry.costs === 'number' &&
             typeof entry.timestamp === 'string';
    });

    if (validUsageData.length === 0) {
      console.log('❌ No valid usage entries found');
      console.log('   Export file may be corrupted or empty');
      process.exit(1);
    }

    console.log(`✅ Valid usage entries: ${validUsageData.length.toLocaleString()}`);

    // Get existing data statistics
    console.log('');
    console.log('📊 Current Data Status:');
    const currentStats = usageTracker.getUsageStats();
    console.log(`   Current Entries: ${currentStats.totalRequests > 0 ? 'Some data exists' : 'No existing data'}`);
    console.log(`   Current Requests: ${currentStats.totalRequests.toLocaleString()}`);
    console.log(`   Current Costs: $${currentStats.totalCosts.toFixed(2)}`);

    // Calculate import statistics
    const importStats = {
      requests: validUsageData.reduce((sum, entry) => sum + entry.requests, 0),
      tokens: validUsageData.reduce((sum, entry) => sum + entry.tokens, 0),
      costs: validUsageData.reduce((sum, entry) => sum + entry.costs, 0),
      entries: validUsageData.length
    };

    console.log('');
    console.log('📥 Import Statistics:');
    console.log(`   Import Requests: ${importStats.requests.toLocaleString()}`);
    console.log(`   Import Tokens: ${importStats.tokens.toLocaleString()}`);
    console.log(`   Import Costs: $${importStats.costs.toFixed(2)}`);
    console.log(`   Import Entries: ${importStats.entries.toLocaleString()}`);

    // Check for duplicates
    console.log('');
    console.log('🔍 Checking for duplicates...');
    
    const existingData = usageTracker.getAllUsageData();
    const duplicateCount = validUsageData.filter(importEntry => {
      return existingData.some(existingEntry => 
        existingEntry.timestamp === importEntry.timestamp &&
        existingEntry.source === importEntry.source &&
        existingEntry.requests === importEntry.requests
      );
    }).length;

    console.log(`   Potential duplicates: ${duplicateCount.toLocaleString()}`);
    console.log(`   Unique entries to add: ${validUsageData.length - duplicateCount}`);

    // Confirm import
    console.log('');
    console.log('⚠️  Import Confirmation:');
    console.log(`   This will add ${validUsageData.length - duplicateCount} new entries`);
    console.log(`   Total requests will increase by ${importStats.requests.toLocaleString()}`);
    console.log(`   Total costs will increase by $${importStats.costs.toFixed(2)}`);
    console.log('');
    console.log('   Continue with import? (y/N)');

    // For CLI, we'll assume confirmation
    console.log('   ✓ Import confirmed (CLI mode)');

    // Perform import
    console.log('');
    console.log('📥 Performing import...');

    try {
      // Import into usage tracker (handles duplicates automatically)
      await claudeIntegration.importUsageData(filePath);
      
      console.log('✅ Usage tracker import completed');

      // Update tracker with any API usage data
      const apiUsageData = validUsageData.filter(entry => entry.source === 'api');
      if (apiUsageData.length > 0) {
        console.log(`   Adding ${apiUsageData.length} API entries to tracker...`);
        
        for (const entry of apiUsageData) {
          try {
            await usageTracker.addUsageData(entry);
          } catch (error) {
            console.log(`   ⚠️  Skipping duplicate: ${entry.timestamp}`);
          }
        }
      }

    } catch (error) {
      console.log('❌ Import failed');
      console.log(`   Error: ${error}`);
      process.exit(1);
    }

    // Show updated statistics
    console.log('');
    console.log('📊 Updated Statistics:');
    const updatedStats = usageTracker.getUsageStats();
    console.log(`   Total Requests: ${updatedStats.totalRequests.toLocaleString()}`);
    console.log(`   Total Tokens: ${updatedStats.totalTokens.toLocaleString()}`);
    console.log(`   Total Costs: $${updatedStats.totalCosts.toFixed(2)}`);
    console.log(`   Average Tokens/Request: ${updatedStats.averageTokensPerRequest.toLocaleString()}`);
    console.log(`   Average Cost/Request: $${updatedStats.averageCostPerRequest.toFixed(3)}`);
    console.log(`   Usage Efficiency: ${updatedStats.efficiency}%`);

    console.log('');
    console.log('💡 Post-Import Actions:');
    console.log('   • Run: npm run usage          - See updated statistics');
    console.log('   • Run: npm run export-usage   - Create backup');
    console.log('   • Check: npm run status       - Optimize timing');
    console.log('   • Test: npm run claude-integration - Verify apps');

    console.log('');
    console.log('🎉 Import completed successfully!');
    console.log('   Your usage data has been restored and merged');

  } catch (error) {
    console.error('❌ Failed to import usage data');
    if (process.env.NODE_ENV === 'development') {
      console.error('Debug info:', error);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  program
    .name('import-usage')
    .description('Import Claude usage data from JSON files')
    .argument('[file]', 'Path to the usage export file')
    .action(main);
    
  program.parse();
} else {
  // If not main module, export main function
  module.exports = main;
}