import { DateTime } from 'luxon';
import { PeakConfig, TimeWindow } from '../types';

export class PeakTracker {
  private config: PeakConfig;

  constructor(config: PeakConfig) {
    this.config = config;
  }

  /**
   * Check if current time is in peak hours
   */
  isPeakNow(time?: DateTime): boolean {
    const now = time || DateTime.now().setZone(this.config.timezone);
    
    // Check if it's a weekday
    if (!this.config.weekdays.includes(now.weekday)) {
      return false;
    }

    // Parse peak hours
    const [peakStartHour, peakStartMinute] = this.config.peakHours.start.split(':').map(Number);
    const [peakEndHour, peakEndMinute] = this.config.peakHours.end.split(':').map(Number);

    const currentHour = now.hour;
    const currentMinute = now.minute;
    const currentTime = currentHour * 60 + currentMinute;
    const peakStartTime = peakStartHour * 60 + peakStartMinute;
    const peakEndTime = peakEndHour * 60 + peakEndMinute;

    // Handle overnight peaks (e.g., 22:00 to 06:00)
    if (peakEndTime < peakStartTime) {
      return currentTime >= peakStartTime || currentTime < peakEndTime;
    }

    // Normal peak hours
    return currentTime >= peakStartTime && currentTime < peakEndTime;
  }

  /**
   * Get current status with time window
   */
  getCurrentStatus(): { isPeak: boolean; currentWindow: TimeWindow; nextWindow: TimeWindow } {
    const now = DateTime.now().setZone(this.config.timezone);
    const isPeak = this.isPeakNow(now);

    const currentWindow = this.getCurrentWindow(now, isPeak);
    const nextWindow = this.getNextWindow(now, isPeak);

    return {
      isPeak,
      currentWindow,
      nextWindow
    };
  }

  /**
   * Get current time window
   */
  private getCurrentWindow(now: DateTime, isPeak: boolean): TimeWindow {
    const [peakStartHour, peakStartMinute] = this.config.peakHours.start.split(':').map(Number);
    const [peakEndHour, peakEndMinute] = this.config.peakHours.end.split(':').map(Number);

    let start: DateTime;
    let end: DateTime;

    if (isPeak) {
      // Find when this peak window started
      start = this.findWindowStart(now, true);
      end = now.set({ hour: peakEndHour, minute: peakEndMinute });
      
      // If end is before start, it's overnight
      if (end < start) {
        end = end.plus({ days: 1 });
      }
    } else {
      // Find when this off-peak window started
      start = this.findWindowStart(now, false);
      
      // Find when this off-peak window ends
      if (now.hour * 60 + now.minute < peakStartHour * 60 + peakStartMinute) {
        // Before peak hours - off-peak ends when peak starts
        end = now.set({ hour: peakStartHour, minute: peakStartMinute });
      } else {
        // After peak hours - off-peak ends when peak starts tomorrow
        end = now.set({ hour: peakStartHour, minute: peakStartMinute }).plus({ days: 1 });
      }
    }

    return { start, end, isPeak };
  }

  /**
   * Find when the current window started
   */
  private findWindowStart(now: DateTime, isPeak: boolean): DateTime {
    const [peakStartHour, peakStartMinute] = this.config.peakHours.start.split(':').map(Number);
    const [peakEndHour, peakEndMinute] = this.config.peakHours.end.split(':').map(Number);

    if (isPeak) {
      // Peak window started at peak start time today
      let start = now.set({ hour: peakStartHour, minute: peakStartMinute });
      
      // If current time is before peak start, it started yesterday
      if (now < start) {
        start = start.minus({ days: 1 });
      }
      
      return start;
    } else {
      // Off-peak window started at peak end time
      let start = now.set({ hour: peakEndHour, minute: peakEndMinute });
      
      // If current time is before peak end, it started yesterday
      if (now < start) {
        start = start.minus({ days: 1 });
      }
      
      return start;
    }
  }

  /**
   * Get next time window
   */
  private getNextWindow(now: DateTime, currentIsPeak: boolean): TimeWindow {
    const currentWindow = this.getCurrentWindow(now, currentIsPeak);
    const nextIsPeak = !currentIsPeak;

    let start = currentWindow.end;
    let end: DateTime;

    const [peakStartHour, peakStartMinute] = this.config.peakHours.start.split(':').map(Number);
    const [peakEndHour, peakEndMinute] = this.config.peakHours.end.split(':').map(Number);

    if (nextIsPeak) {
      end = start.set({ hour: peakEndHour, minute: peakEndMinute });
      if (end < start) {
        end = end.plus({ days: 1 });
      }
    } else {
      end = start.set({ hour: peakStartHour, minute: peakStartMinute });
      if (end < start) {
        end = end.plus({ days: 1 });
      }
    }

    return { start, end, isPeak: nextIsPeak };
  }

  /**
   * Format time window for display
   */
  formatWindow(window: TimeWindow): string {
    const duration = window.end.diff(window.start).shiftTo('hours', 'minutes');
    const type = window.isPeak ? 'Peak' : 'Off-Peak';
    const startTime = window.start.toFormat('HH:mm');
    const endTime = window.end.toFormat('HH:mm');
    
    return `${type} (${startTime} - ${endTime}, ${duration.hours}h ${duration.minutes}m)`;
  }

  /**
   * Get next windows for the next 24 hours
   */
  getNext24Hours(): TimeWindow[] {
    const now = DateTime.now().setZone(this.config.timezone);
    const windows: TimeWindow[] = [];
    
    let current = this.getCurrentWindow(now, this.isPeakNow(now));
    windows.push(current);

    // Generate next 6 windows (covers 24+ hours)
    for (let i = 0; i < 6; i++) {
      const next = this.getNextWindow(current.start, current.isPeak);
      windows.push(next);
      current = next;
    }

    return windows.slice(0, 6); // Return first 6 windows
  }
}