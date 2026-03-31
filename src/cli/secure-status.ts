#!/usr/bin/env ts-node

import { PeakTracker } from '../tracker/PeakTracker';
import { ConfigManager } from '../config/ConfigManager';
import { createError, wrapError, wrapAsyncError } from '../utils/errors';

async function main() {
  try {
    // Initialize config with security validation
    const config = ConfigManager.getInstance();
    await config.initialize();

    // Get validated peak configuration
    const peakConfig = await config.getPeakConfig();

    // Create tracker with validated config
    const tracker = new PeakTracker(peakConfig);

    // Get status with error handling
    const status = wrapError(() => {
      return tracker.getCurrentStatus();
    }, 'Failed to get peak status');

    const now = status.currentWindow.start;
    
    // Calculate time until next window
    const timeUntilNext = status.nextWindow.start.diffNow().shiftTo('hours', 'minutes');
    const currentDuration = status.currentWindow.end.diff(status.currentWindow.start).shiftTo('hours', 'minutes');
    
    console.log('🕐 Off-Peaky Claudsters Status');
    console.log('─'.repeat(50));
    console.log(`Current Time: ${now.toFormat('yyyy-MM-dd HH:mm:ss ZZZZ')}`);
    console.log(`Current Status: ${status.isPeak ? '⚡ PEAK HOURS' : '🌙 OFF-PEAK HOURS'}`);
    console.log(`Current Window: ${tracker.formatWindow(status.currentWindow)}`);
    console.log(`Next ${status.nextWindow.isPeak ? 'Peak' : 'Off-Peak'}: ${status.nextWindow.start.toFormat('yyyy-MM-dd HH:mm:ss ZZZZ')} (in ${Math.abs(timeUntilNext.hours)}h ${Math.abs(timeUntilNext.minutes)}m)`);
    console.log(`Duration: ${currentDuration.hours}h ${currentDuration.minutes}m`);
    
    // Recommendation
    if (status.isPeak) {
      console.log('\n🎯 Recommended: Quick fixes only - schedule heavy tasks for off-peak hours');
    } else {
      console.log('\n🎯 Recommended: Great time for heavy tasks, refactors, and large PRs');
    }
    
    // Show next 24 hours
    console.log('\n📅 Next 24 Hours:');
    const next24Hours = wrapError(() => {
      return tracker.getNext24Hours();
    }, 'Failed to get window predictions');

    next24Hours.forEach((window, index) => {
      if (index === 0) return; // Skip current window
      const day = window.start.weekdayShort;
      const timeUntil = window.start.diffNow().shiftTo('hours', 'minutes');
      const isFuture = window.start > now;
      
      if (isFuture) {
        console.log(`  ${day} ${window.start.toFormat('HH:mm')} - ${window.end.toFormat('HH:mm')} (${window.isPeak ? 'Peak' : 'Off-Peak'})`);
      }
    });
    
  } catch (error) {
    if (error instanceof Error && error.name === 'SecureError') {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
    
    console.error('❌ An unexpected error occurred');
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
}