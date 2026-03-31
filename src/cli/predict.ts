#!/usr/bin/env ts-node

import { PeakTracker } from '../tracker/PeakTracker';
import { ConfigManager } from '../config/ConfigManager';

const config = ConfigManager.getInstance();
const tracker = new PeakTracker(config.getPeakConfig());

function main() {
  try {
    const windows = tracker.getNext24Hours();
    const now = windows[0].start;
    
    console.log('🔮 Off-Peaky Claude Predictions');
    console.log('─'.repeat(50));
    
    windows.forEach((window, index) => {
      const day = window.start.weekdayShort;
      const isCurrent = index === 0;
      const timeUntil = window.start.diffNow().shiftTo('hours', 'minutes');
      const duration = window.end.diff(window.start).shiftTo('hours', 'minutes');
      
      if (isCurrent) {
        console.log(`\n📍 CURRENT: ${tracker.formatWindow(window)}`);
      } else {
        const timeStr = timeUntil.hours > 0 ? `${Math.abs(timeUntil.hours)}h ${Math.abs(timeUntil.minutes)}m` : `${Math.abs(timeUntil.minutes)}m`;
        console.log(`\n${day} ${window.start.toFormat('HH:mm')} → ${window.end.toFormat('HH:mm')} (${window.isPeak ? 'Peak' : 'Off-Peak'})`);
        console.log(`   Starts in: ${timeStr} | Duration: ${duration.hours}h ${duration.minutes}m`);
        
        // Add recommendation
        if (!window.isPeak) {
          console.log(`   💡 Perfect for: Heavy tasks, refactors, large PRs`);
        } else {
          console.log(`   ⚠️  Best for: Quick fixes, small changes`);
        }
      }
    });
    
    // Optimal scheduling suggestions
    const nextOffPeak = windows.find(w => !w.isPeak && w.start > now);
    if (nextOffPeak) {
      const timeUntilOffPeak = nextOffPeak.start.diffNow().shiftTo('hours', 'minutes');
      console.log(`\n🎯 Next Optimal Window:`);
      console.log(`   ${nextOffPeak.start.weekdayShort} ${nextOffPeak.start.toFormat('HH:mm')} - ${nextOffPeak.end.toFormat('HH:mm')}`);
      console.log(`   In: ${Math.abs(timeUntilOffPeak.hours)}h ${Math.abs(timeUntilOffPeak.minutes)}m`);
      console.log(`   📝 Schedule heavy tasks now to run automatically`);
    }
    
  } catch (error) {
    console.error('Error getting predictions:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}