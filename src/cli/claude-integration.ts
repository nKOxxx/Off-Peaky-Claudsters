import { ClaudeIntegration } from '../integration/ClaudeIntegration';

async function main() {
  try {
    console.log('🤖 Claude Integration - Desktop & Code CLI Detection');
    console.log('─'.repeat(70));

    // Initialize Claude integration
    const claudeIntegration = new ClaudeIntegration();

    // Get comprehensive integration report
    const report = await claudeIntegration.getIntegrationReport();

    // Display Claude Desktop info
    console.log('📱 Claude Desktop Application:');
    console.log(`   Status: ${report.desktop.installed ? '✅ Installed' : '❌ Not Installed'}`);
    if (report.desktop.installed) {
      console.log(`   Path: ${report.desktop.path}`);
      console.log(`   Config: ${report.desktop.configPath}`);
      console.log(`   Usage Data: ${report.desktop.usagePath}`);
    }
    console.log('');

    // Display Claude Code CLI info
    console.log('💻 Claude Code CLI:');
    console.log(`   Status: ${report.code.installed ? '✅ Installed' : '❌ Not Installed'}`);
    if (report.code.installed) {
      console.log(`   Path: ${report.code.path}`);
      console.log(`   Config: ${report.code.configPath}`);
      console.log(`   Usage Data: ${report.code.usagePath}`);
    }
    console.log('');

    // Display usage summary
    console.log('📊 Combined Usage Summary:');
    if (report.usage.length === 0) {
      console.log('   No usage data found');
      console.log('   💡 Start using Claude Desktop or Claude Code CLI to see usage here');
    } else {
      const totalRequests = report.usage.reduce((sum, entry) => sum + entry.requests, 0);
      const totalTokens = report.usage.reduce((sum, entry) => sum + entry.tokens, 0);
      const totalCosts = report.usage.reduce((sum, entry) => sum + entry.costs, 0);

      console.log(`   Total Requests: ${totalRequests.toLocaleString()}`);
      console.log(`   Total Tokens: ${totalTokens.toLocaleString()}`);
      console.log(`   Total Costs: $${totalCosts.toFixed(2)}`);
      console.log(`   Usage Entries: ${report.usage.length}`);

      // Show breakdown by source
      const sourceBreakdown = report.usage.reduce((acc, entry) => {
        if (!acc[entry.source]) {
          acc[entry.source] = { requests: 0, tokens: 0, costs: 0, entries: 0 };
        }
        acc[entry.source].requests += entry.requests;
        acc[entry.source].tokens += entry.tokens;
        acc[entry.source].costs += entry.costs;
        acc[entry.source].entries += 1;
        return acc;
      }, {} as Record<string, { requests: number; tokens: number; costs: number; entries: number }>);

      console.log('');
      console.log('📈 Usage by Source:');
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

    // Display recommendations
    console.log('💡 Recommendations & Insights:');
    report.recommendations.forEach((rec, index) => {
      const prefix = index === 0 ? '🎯' : '📝';
      console.log(`   ${prefix} ${rec}`);
    });

    // Display available commands
    console.log('');
    console.log('🛠️  Available Commands:');
    console.log('   npm run claude-integration  - Show this integration report');
    console.log('   npm run usage              - API usage tracking (with API key)');
    console.log('   npm run status             - Peak/off-peak status');
    console.log('   npm run predict            - Timing predictions');
    console.log('   npm run timezone-check     - Compare timezones');

    if (report.usage.length > 0) {
      console.log('   npm run export-usage       - Export usage data to JSON');
      console.log('   npm run import-usage       - Import usage data from JSON');
    }

    console.log('');
    console.log('🔧 Setup Instructions:');

    if (!report.desktop.installed && !report.code.installed) {
      console.log('   1. Install Claude Code CLI: npm install -g @anthropic-ai/claude-cli');
      console.log('   2. Start using: claude (in terminal)');
      console.log('   3. Run integration: npm run claude-integration');
    } else {
      console.log('   1. Use your Claude applications (Desktop and/or Code CLI)');
      console.log('   2. Check integration: npm run claude-integration');
      console.log('   3. Add API key: echo "CLAUDE_API_KEY=your_key" >> .env');
      console.log('   4. Track usage: npm run usage');
    }

    console.log('');
    console.log('🎯 Perfect Terminal Workflow:');
    console.log('   Terminal 1: claude (for chatting)');
    console.log('   Terminal 2: npm run status (for timing)');
    console.log('   Terminal 2: npm run usage (for tracking)');
    console.log('   Result: Optimized API usage with cost savings');

  } catch (error) {
    console.error('❌ Failed to get Claude integration report');
    if (process.env.NODE_ENV === 'development') {
      console.error('Debug info:', error);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} else {
  // If not main module, make sure main is called when imported
  main();
}