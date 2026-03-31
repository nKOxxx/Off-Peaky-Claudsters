#!/usr/bin/env ts-node

import { Command } from 'commander';
import { statusCommand } from './cli/status';
import { predictCommand } from './cli/predict';

const program = new Command();

program
  .name('off-peaky')
  .description('Claude API peak/off-peak tracker with scheduling and alerts')
  .version('1.0.0');

program
  .command('status')
  .description('Show current peak/off-peak status')
  .action(() => {
    require('./cli/status');
  });

program
  .command('predict')
  .description('Show next peak/off-peak predictions')
  .action(() => {
    require('./cli/predict');
  });

program
  .command('schedule')
  .description('Schedule a task for off-peak execution')
  .argument('<command>', 'Command to execute')
  .option('-t, --time <time>', 'Specific time to run (HH:mm)')
  .option('-d, --delay <minutes>', 'Delay execution by minutes')
  .action((command, options) => {
    console.log(`Scheduling: ${command}`);
    console.log('Task scheduling coming soon!');
  });

program
  .command('monitor')
  .description('Start monitoring peak/off-peak changes')
  .action(() => {
    console.log('Starting monitoring...');
    console.log('Real-time monitoring coming soon!');
  });

program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    const { ConfigManager } = require('./config/ConfigManager');
    const config = ConfigManager.getInstance();
    console.log('Current Configuration:');
    console.log(JSON.stringify(config.getConfig(), null, 2));
  });

// Default command is status
if (process.argv.length === 2) {
  program.parse(['node', 'off-peaky', 'status']);
} else {
  program.parse();
}

export { statusCommand, predictCommand };