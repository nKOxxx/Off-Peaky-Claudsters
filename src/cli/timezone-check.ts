import { DateTime } from 'luxon';
import { PeakTracker } from '../tracker/PeakTracker';
import { program } from 'commander';

// 70+ major world cities with their timezones
const MAJOR_TIMEZONES = [
  // North America
  { city: 'New York', timezone: 'America/New_York', country: 'USA' },
  { city: 'Los Angeles', timezone: 'America/Los_Angeles', country: 'USA' },
  { city: 'Chicago', timezone: 'America/Chicago', country: 'USA' },
  { city: 'Toronto', timezone: 'America/Toronto', country: 'Canada' },
  { city: 'Vancouver', timezone: 'America/Vancouver', country: 'Canada' },
  { city: 'Mexico City', timezone: 'America/Mexico_City', country: 'Mexico' },
  
  // South America
  { city: 'São Paulo', timezone: 'America/Sao_Paulo', country: 'Brazil' },
  { city: 'Buenos Aires', timezone: 'America/Argentina/Buenos_Aires', country: 'Argentina' },
  { city: 'Lima', timezone: 'America/Lima', country: 'Peru' },
  { city: 'Bogotá', timezone: 'America/Bogota', country: 'Colombia' },
  { city: 'Santiago', timezone: 'America/Santiago', country: 'Chile' },
  
  // Europe
  { city: 'London', timezone: 'Europe/London', country: 'UK' },
  { city: 'Paris', timezone: 'Europe/Paris', country: 'France' },
  { city: 'Berlin', timezone: 'Europe/Berlin', country: 'Germany' },
  { city: 'Madrid', timezone: 'Europe/Madrid', country: 'Spain' },
  { city: 'Rome', timezone: 'Europe/Rome', country: 'Italy' },
  { city: 'Amsterdam', timezone: 'Europe/Amsterdam', country: 'Netherlands' },
  { city: 'Brussels', timezone: 'Europe/Brussels', country: 'Belgium' },
  { city: 'Vienna', timezone: 'Europe/Vienna', country: 'Austria' },
  { city: 'Zurich', timezone: 'Europe/Zurich', country: 'Switzerland' },
  { city: 'Stockholm', timezone: 'Europe/Stockholm', country: 'Sweden' },
  { city: 'Copenhagen', timezone: 'Europe/Copenhagen', country: 'Denmark' },
  { city: 'Oslo', timezone: 'Europe/Oslo', country: 'Norway' },
  { city: 'Helsinki', timezone: 'Europe/Helsinki', country: 'Finland' },
  { city: 'Warsaw', timezone: 'Europe/Warsaw', country: 'Poland' },
  { city: 'Prague', timezone: 'Europe/Prague', country: 'Czech Republic' },
  { city: 'Budapest', timezone: 'Europe/Budapest', country: 'Hungary' },
  { city: 'Athens', timezone: 'Europe/Athens', country: 'Greece' },
  { city: 'Lisbon', timezone: 'Europe/Lisbon', country: 'Portugal' },
  { city: 'Dublin', timezone: 'Europe/Dublin', country: 'Ireland' },
  
  // Eastern Europe & Balkans
  { city: 'Sofia', timezone: 'Europe/Sofia', country: 'Bulgaria' },
  { city: 'Bucharest', timezone: 'Europe/Bucharest', country: 'Romania' },
  { city: 'Belgrade', timezone: 'Europe/Belgrade', country: 'Serbia' },
  { city: 'Zagreb', timezone: 'Europe/Zagreb', country: 'Croatia' },
  { city: 'Ljubljana', timezone: 'Europe/Ljubljana', country: 'Slovenia' },
  { city: 'Skopje', timezone: 'Europe/Skopje', country: 'North Macedonia' },
  { city: 'Podgorica', timezone: 'Europe/Podgorica', country: 'Montenegro' },
  { city: 'Sarajevo', timezone: 'Europe/Sarajevo', country: 'Bosnia' },
  { city: 'Tirana', timezone: 'Europe/Tirana', country: 'Albania' },
  { city: 'Pristina', timezone: 'Europe/Pristina', country: 'Kosovo' },
  { city: 'Istanbul', timezone: 'Europe/Istanbul', country: 'Turkey' },
  { city: 'Ankara', timezone: 'Europe/Istanbul', country: 'Turkey' },
  
  // Middle East
  { city: 'Dubai', timezone: 'Asia/Dubai', country: 'UAE' },
  { city: 'Abu Dhabi', timezone: 'Asia/Dubai', country: 'UAE' },
  { city: 'Riyadh', timezone: 'Asia/Riyadh', country: 'Saudi Arabia' },
  { city: 'Jeddah', timezone: 'Asia/Riyadh', country: 'Saudi Arabia' },
  { city: 'Kuwait City', timezone: 'Asia/Kuwait', country: 'Kuwait' },
  { city: 'Doha', timezone: 'Asia/Qatar', country: 'Qatar' },
  { city: 'Manama', timezone: 'Asia/Bahrain', country: 'Bahrain' },
  { city: 'Muscat', timezone: 'Asia/Muscat', country: 'Oman' },
  { city: 'Tel Aviv', timezone: 'Asia/Jerusalem', country: 'Israel' },
  { city: 'Jerusalem', timezone: 'Asia/Jerusalem', country: 'Israel' },
  { city: 'Beirut', timezone: 'Asia/Beirut', country: 'Lebanon' },
  { city: 'Damascus', timezone: 'Asia/Damascus', country: 'Syria' },
  { city: 'Amman', timezone: 'Asia/Amman', country: 'Jordan' },
  { city: 'Baghdad', timezone: 'Asia/Baghdad', country: 'Iraq' },
  { city: 'Tehran', timezone: 'Asia/Tehran', country: 'Iran' },
  
  // Asia
  { city: 'Moscow', timezone: 'Europe/Moscow', country: 'Russia' },
  { city: 'St. Petersburg', timezone: 'Europe/Moscow', country: 'Russia' },
  { city: 'Mumbai', timezone: 'Asia/Kolkata', country: 'India' },
  { city: 'Delhi', timezone: 'Asia/Kolkata', country: 'India' },
  { city: 'Bangalore', timezone: 'Asia/Kolkata', country: 'India' },
  { city: 'Beijing', timezone: 'Asia/Shanghai', country: 'China' },
  { city: 'Shanghai', timezone: 'Asia/Shanghai', country: 'China' },
  { city: 'Hong Kong', timezone: 'Asia/Hong_Kong', country: 'China' },
  { city: 'Tokyo', timezone: 'Asia/Tokyo', country: 'Japan' },
  { city: 'Osaka', timezone: 'Asia/Tokyo', country: 'Japan' },
  { city: 'Seoul', timezone: 'Asia/Seoul', country: 'South Korea' },
  { city: 'Bangkok', timezone: 'Asia/Bangkok', country: 'Thailand' },
  { city: 'Singapore', timezone: 'Asia/Singapore', country: 'Singapore' },
  { city: 'Kuala Lumpur', timezone: 'Asia/Kuala_Lumpur', country: 'Malaysia' },
  { city: 'Jakarta', timezone: 'Asia/Jakarta', country: 'Indonesia' },
  { city: 'Manila', timezone: 'Asia/Manila', country: 'Philippines' },
  { city: 'Hanoi', timezone: 'Asia/Ho_Chi_Minh', country: 'Vietnam' },
  { city: 'Ho Chi Minh City', timezone: 'Asia/Ho_Chi_Minh', country: 'Vietnam' },
  
  // Oceania
  { city: 'Sydney', timezone: 'Australia/Sydney', country: 'Australia' },
  { city: 'Melbourne', timezone: 'Australia/Melbourne', country: 'Australia' },
  { city: 'Brisbane', timezone: 'Australia/Brisbane', country: 'Australia' },
  { city: 'Perth', timezone: 'Australia/Perth', country: 'Australia' },
  { city: 'Auckland', timezone: 'Pacific/Auckland', country: 'New Zealand' },
  { city: 'Wellington', timezone: 'Pacific/Auckland', country: 'New Zealand' },
  
  // Africa
  { city: 'Cairo', timezone: 'Africa/Cairo', country: 'Egypt' },
  { city: 'Lagos', timezone: 'Africa/Lagos', country: 'Nigeria' },
  { city: 'Johannesburg', timezone: 'Africa/Johannesburg', country: 'South Africa' },
  { city: 'Cape Town', timezone: 'Africa/Johannesburg', country: 'South Africa' },
  { city: 'Nairobi', timezone: 'Africa/Nairobi', country: 'Kenya' },
  { city: 'Lusaka', timezone: 'Africa/Lusaka', country: 'Zambia' },
  { city: 'Harare', timezone: 'Africa/Harare', country: 'Zimbabwe' },
  { city: 'Addis Ababa', timezone: 'Africa/Addis_Ababa', country: 'Ethiopia' },
  { city: 'Casablanca', timezone: 'Africa/Casablanca', country: 'Morocco' },
  { city: 'Tunis', timezone: 'Africa/Tunis', country: 'Tunisia' },
  { city: 'Algiers', timezone: 'Africa/Algiers', country: 'Algeria' },
  { city: 'Tripoli', timezone: 'Africa/Tripoli', country: 'Libya' },
  { city: 'Khartoum', timezone: 'Africa/Khartoum', country: 'Sudan' },
  { city: 'Dakar', timezone: 'Africa/Dakar', country: 'Senegal' },
  { city: 'Abidjan', timezone: 'Africa/Abidjan', country: 'Ivory Coast' },
  { city: 'Accra', timezone: 'Africa/Accra', country: 'Ghana' }
];

async function main() {
  try {
    console.log('🌍 Global Timezone Comparison - 70+ Major Cities');
    console.log('─'.repeat(70));

    // Get current time
    const now = DateTime.now();
    
    // Initialize PeakTracker for Bulgaria (main focus)
    const peakTracker = new PeakTracker();
    const bulgariaStatus = peakTracker.getCurrentStatus();

    console.log(`🎯 Current Time: ${now.toLocaleString(DateTime.DATETIME_FULL)} (UTC)`);
    console.log(`🇧🇬 Bulgaria Status: ${bulgariaStatus.isPeak ? '⚠️ PEAK HOURS' : '✅ OFF-PEAK HOURS'}`);
    console.log('');

    // Create timezone data
    const timezoneData = MAJOR_TIMEZONES.map(tz => {
      const localTime = now.setZone(tz.timezone);
      const hour = localTime.hour;
      
      // Determine peak/off-peak (simplified: 9-17 and 19-22 are peak)
      const isPeak = (hour >= 9 && hour <= 17) || (hour >= 19 && hour <= 22);
      const status = isPeak ? '⚠️ PEAK' : '✅ OPTIMAL';
      
      // Calculate time difference from Bulgaria
      const bulgariaTime = now.setZone('Europe/Sofia');
      const timeDiff = localTime.diff(bulgariaTime, 'hours').hours;
      
      return {
        ...tz,
        localTime: localTime.toFormat('HH:mm'),
        date: localTime.toFormat('yyyy-MM-dd'),
        dayOfWeek: localTime.toFormat('cccc'),
        hour,
        isPeak,
        status,
        timeDiff: Math.round(timeDiff),
        diffDisplay: timeDiff > 0 ? `+${timeDiff}h` : `${timeDiff}h`
      };
    });

    // Sort by time difference from Bulgaria
    timezoneData.sort((a, b) => a.timeDiff - b.timeDiff);

    // Find Bulgaria data for reference
    const bulgariaData = timezoneData.find(tz => tz.city === 'Sofia');

    console.log('📊 Global Timezone Analysis:');
    console.log('');

    // Display regions
    const regions = {
      'Bulgaria & Balkans': ['Sofia', 'Bucharest', 'Belgrade', 'Athens', 'Istanbul', 'Ankara'],
      'Western Europe': ['London', 'Paris', 'Berlin', 'Madrid', 'Rome', 'Amsterdam'],
      'Eastern Europe': ['Warsaw', 'Prague', 'Budapest', 'Vienna', 'Bratislava'],
      'Middle East & Gulf': ['Dubai', 'Abu Dhabi', 'Riyadh', 'Doha', 'Kuwait City', 'Tel Aviv'],
      'Asia-Pacific': ['Mumbai', 'Beijing', 'Tokyo', 'Singapore', 'Sydney', 'Auckland'],
      'Americas': ['New York', 'Los Angeles', 'Toronto', 'Mexico City', 'São Paulo', 'Buenos Aires']
    };

    Object.entries(regions).forEach(([region, cities]) => {
      console.log(`🌎 ${region}:`);
      
      cities.forEach(city => {
        const data = timezoneData.find(tz => tz.city === city);
        if (data) {
          const flag = data.country === 'Bulgaria' ? '🇧🇬' : 
                     data.country === 'USA' ? '🇺🇸' : 
                     data.country === 'UK' ? '🇬🇧' : 
                     data.country === 'UAE' ? '🇦🇪' : 
                     data.country === 'Saudi Arabia' ? '🇸🇦' : 
                     data.country === 'India' ? '🇮🇳' : 
                     data.country === 'China' ? '🇨🇳' : 
                     data.country === 'Japan' ? '🇯🇵' : 
                     data.country === 'Australia' ? '🇦🇺' : '🌍';
          
          const optimalColor = data.city === 'Sofia' ? (data.status === '✅ OPTIMAL' ? '🟢' : '🔴') :
                            data.status === '✅ OPTIMAL' ? '🟢' : '🔴';
          
          console.log(`   ${flag} ${data.city.padEnd(12)} ${data.localTime} (${data.diffDisplay}) ${optimalColor} ${data.status}`);
        }
      });
      console.log('');
    });

    // Statistics
    const optimalCities = timezoneData.filter(tz => tz.status === '✅ OPTIMAL').length;
    const peakCities = timezoneData.filter(tz => tz.status === '⚠️ PEAK').length;
    const percentageOptimal = Math.round((optimalCities / timezoneData.length) * 100);

    console.log('📈 Global Statistics:');
    console.log(`   Total Cities: ${timezoneData.length}`);
    console.log(`   Optimal for Claude: ${optimalCities} (${percentageOptimal}%)`);
    console.log(`   Peak Hours: ${peakCities} (${100 - percentageOptimal}%)`);
    console.log('');

    // Show cities with same/similar time as Bulgaria
    console.log('⏰ Cities Similar to Bulgaria Time:');
    const similarTime = timezoneData.filter(tz => Math.abs(tz.timeDiff) <= 2);
    similarTime.forEach(tz => {
      const flag = tz.city === 'Sofia' ? '🇧🇬' : '🌍';
      console.log(`   ${flag} ${tz.city.padEnd(15)} ${tz.localTime} (${tz.diffDisplay}) ${tz.status}`);
    });
    console.log('');

    // Show best times for global coordination
    console.log('🌐 Best Times for Global Coordination:');
    const globallyOptimal = timezoneData.filter(tz => tz.status === '✅ OPTIMAL');
    
    // Group by UTC offset to find optimal windows
    const offsetGroups = globallyOptimal.reduce((acc, tz) => {
      const offset = tz.timeDiff;
      if (!acc[offset]) acc[offset] = [];
      acc[offset].push(tz);
      return acc;
    }, {} as Record<number, typeof timezoneData>);

    const bestOffsets = Object.entries(offsetGroups)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 3);

    bestOffsets.forEach(([offset, cities]) => {
      const bulgariaHour = (now.setZone('Europe/Sofia').hour + parseInt(offset) + 24) % 24;
      console.log(`   🌍 ${offset > 0 ? `+${offset}` : offset}h offset: ${cities.length} cities`);
      console.log(`      ${cities.slice(0, 5).map(c => c.city).join(', ')}${cities.length > 5 ? '...' : ''}`);
      console.log(`      Bulgaria time: ${bulgariaHour}:00`);
    });

    console.log('');
    console.log('💡 Scheduling Recommendations:');
    console.log('   • For Bulgaria users: Focus on off-peak hours (18:00-09:00)');
    console.log('   • Global meetings: 14:00-16:00 Bulgaria time covers most regions');
    console.log('   • Heavy API tasks: 22:00-06:00 Bulgaria time (globally optimal)');
    console.log('   • Real-time collaboration: Check multiple timezones before scheduling');

    console.log('');
    console.log('🔧 Available Commands:');
    console.log('   npm run status           - Bulgaria peak/off-peak status');
    console.log('   npm run predict          - 24-hour timing predictions');
    console.log('   npm run timezone-check   - Global timezone comparison');
    console.log('   npm run usage            - API usage tracking');
    console.log('   npm run claude-integration - Claude app detection');

  } catch (error) {
    console.error('❌ Failed to generate timezone comparison');
    if (process.env.NODE_ENV === 'development') {
      console.error('Debug info:', error);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  program
    .name('timezone-check')
    .description('Compare 70+ global timezones for optimal Claude usage timing')
    .action(main);
    
  program.parse();
} else {
  // If not main module, export main function
  module.exports = main;
}