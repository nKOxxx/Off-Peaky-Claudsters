import { ClaudeApiClient } from '../usage/ClaudeApiClient';
import { UsageTracker } from '../usage/UsageTracker';
import { ClaudeIntegration } from '../integration/ClaudeIntegration';
import { program } from 'commander';

async function main() {
  try {
    console.log('📊 Claude Usage Tracking - API Statistics & Cost Analysis');
    console.log('─'.repeat(70));

    // Check for API key
    const apiKey = process.env.CLAUDE_API_KEY;
    
    if (!apiKey) {
      console.log('❌ No Claude API key found');
      console.log('');
      console.log('🔧 Setup Instructions:');
      console.log('   1. Get your API key from: https://console.anthropic.com');
      console.log('   2. Add to environment: CLAUDE_API_KEY=your_key_here');
      console.log('   3. Or add to .env file');
      console.log('');
      console.log('💡 Run this command to test API key:');
      console.log('   echo "CLAUDE_API_KEY=your_key_here" >> .env');
      console.log('   npm run usage');
      process.exit(1);
    }

    // Initialize components
    const apiClient = new ClaudeApiClient(apiKey);
    const usageTracker = new UsageTracker(apiKey);
    const claudeIntegration = new ClaudeIntegration();

    // Test API connection
    console.log('🔌 Testing API connection...');
    const connectionTest = await apiClient.testConnection();
    
    if (!connectionTest) {
      console.log('❌ API connection failed - Invalid API key');
      console.log('   Please check your API key and try again');
      process.exit(1);
    }
    
    console.log('✅ API connection successful');
    console.log('');

    // Get current usage from API
    console.log('📈 Current API Usage:');
    const currentUsage = await apiClient.getUsage();
    
    console.log(`   Requests: ${currentUsage.requests.toLocaleString()}`);
    console.log(`   Input Tokens: ${currentUsage.model ? JSON.parse(currentUsage.model.replace(/[^{}:,0-9""]+/g, '').replace(/{.*input":\s*([^,]+).*/, '$1')) : 0}`);
    console.log(`   Output Tokens: ${currentUsage.model ? JSON.parse(currentUsage.model.replace(/[^{}:,0-9""]+/g, '').replace(/.*output":\s*([^,}]+).*/, '$1')) : 0}`);
    console.log(`   Total Tokens: ${currentUsage.tokens.toLocaleString()}`);
    console.log(`   Costs: $${currentUsage.costs.toFixed(3)}`);
    console.log(`   Model: ${currentUsage.model || 'claude-3-haiku-20240307'}`);
    console.log(`   Timestamp: ${currentUsage.timestamp}`);
    console.log('');

    // Add current usage to tracker
    await usageTracker.addUsageData(currentUsage);
    console.log('✅ Usage data saved');

    // Get comprehensive usage statistics
    console.log('');
    console.log('📊 Usage Statistics:');
    const stats = usageTracker.getUsageStats();
    
    console.log(`   Total Requests: ${stats.totalRequests.toLocaleString()}`);
    console.log(`   Total Tokens: ${stats.totalTokens.toLocaleString()}`);
    console.log(`   Total Costs: $${stats.totalCosts.toFixed(2)}`);
    console.log(`   Average Tokens/Request: ${stats.averageTokensPerRequest.toLocaleString()}`);
    console.log(`   Average Cost/Request: $${stats.averageCostPerRequest.toFixed(3)}`);
    console.log(`   Daily Average Cost: $${stats.dailyAverage.toFixed(2)}`);
    console.log(`   Usage Efficiency: ${stats.efficiency}%`);
    console.log(`   Peak Hours Usage: ${stats.peakHoursUsage.toLocaleString()} entries`);
    console.log(`   Off-Peak Hours Usage: ${stats.offPeakHoursUsage.toLocaleString()} entries`);
    console.log('');

    // Get Claude integration usage
    console.log('🤖 Claude Application Usage:');
    const claudeUsage = await claudeIntegration.getAllClaudeUsage();
    
    if (claudeUsage.length === 0) {
      console.log('   No Claude application usage detected');
      console.log('   💡 Start using Claude Desktop or Claude Code CLI');
    } else {
      const sourceBreakdown = claudeUsage.reduce((acc, entry) => {
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
    }
    console.log('');

    // Get cost estimates
    console.log('💰 Cost Estimates:');
    const allUsageData = usageTracker.getAllUsageData();
    const estimates = apiClient.getEstimatedMonthlyCosts(allUsageData);
    
    console.log(`   Daily Average: $${estimates.daily.toFixed(2)}`);
    console.log(`   Weekly Estimate: $${estimates.weekly.toFixed(2)}`);
    console.log(`   Monthly Estimate: $${estimates.monthly.toFixed(2)}`);
    console.log(`   Recommendation: ${estimates.recommended}`);
    console.log('');

    // Get efficiency analysis
    console.log('⚡ Efficiency Analysis:');
    const efficiency = apiClient.getEfficiencyAnalysis(allUsageData);
    
    console.log(`   Overall Efficiency: ${efficiency.efficiency}%`);
    console.log(`   Average Tokens/Request: ${efficiency.avgTokensPerRequest.toLocaleString()}`);
    console.log(`   Average Cost/Request: $${efficiency.avgCostPerRequest.toFixed(3)}`);
    console.log(`   Peak Hours Entries: ${efficiency.peakHoursUsage.length}`);
    console.log(`   Off-Peak Hours Entries: ${efficiency.offPeakHoursUsage.length}`);
    console.log('');

    if (efficiency.efficiency < 50) {
      console.log('🎯 Optimization Recommendations:');
      console.log('   • Schedule heavy tasks during off-peak hours');
      console.log('   • Use npm run status to check optimal timing');
      console.log('   • Consider longer prompts vs multiple requests');
    } else if (efficiency.efficiency < 75) {
      console.log('✅ Good efficiency, room for improvement');
      console.log('   • Continue monitoring usage patterns');
      console.log('   • Use timing predictions for scheduling');
    } else {
      console.log('🎉 Excellent efficiency and cost optimization!');
    }

    console.log('');
    console.log('🔧 Usage Tracking Commands:');
    console.log('   npm run usage              - Show usage statistics');
    console.log('   npm run export-usage       - Export usage data to JSON');
    console.log('   npm run import-usage       - Import usage data from JSON');
    console.log('   npm run claude-integration - Claude app detection');
    console.log('   npm run status             - Peak/off-peak status');

    console.log('');
    console.log('💾 Data Storage:');
    console.log(`   Usage File: ${usageTracker.getUsageFilePath()}`);
    console.log('   Retention: 90 days');
    console.log('   Format: JSON');

  } catch (error) {
    console.error('❌ Failed to get usage statistics');
    if (process.env.NODE_ENV === 'development') {
      console.error('Debug info:', error);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  program
    .name('usage')
    .description('Track Claude API usage and costs')
    .action(main);
    
  program.parse();
} else {
  // If not main module, export main function
  module.exports = main;
}