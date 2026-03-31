# 🕐 Off-Peaky Claude

Claude API peak/off-peak tracker with scheduling and alerts

## 🎯 Purpose

Optimize your Claude API usage by tracking peak and off-peak windows, allowing you to:

- Schedule heavy tasks (refactors, large PRs) during off-peak hours
- Reserve peak hours for quick fixes only
- Predict optimal usage times
- Execute automated tasks during off-peak windows

## 🚀 Features

### Peak/Off-Peak Detection
- Track Claude API usage patterns
- Detect current peak/off-peak status
- Predict next peak/off-peak windows
- Multiple timezone support

### Smart Scheduling
- Cron job triggers for off-peak execution
- Task queue for heavy operations
- Real-time alerts when peak starts/ends
- Usage analytics and optimization suggestions

### Automation
- Automatic task rescheduling
- Peak-aware development workflows
- Integration with CI/CD pipelines

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/nKOxxx/Off-Peaky-Claude.git
cd Off-Peaky-Claude

# Install dependencies
npm install

# Configure your settings
cp .env.example .env
```

## ⚙️ Configuration

```env
# Timezone (default: UTC)
TZ=America/New_York

# Claude API key (for usage tracking)
CLAUDE_API_KEY=your_api_key_here

# Peak hours (24h format)
PEAK_HOURS_START=09:00
PEAK_HOURS_END=17:00

# Weekday peak (comma-separated)
PEAK_WEEKDAYS=1,2,3,4,5  # Mon-Fri

# Notification settings
SLACK_WEBHOOK=https://hooks.slack.com/services/...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

## 🔄 Usage

### Check Current Status
```bash
npm run status
```

### Predict Next Window
```bash
npm run predict
```

### Schedule Task for Off-Peak
```bash
npm run schedule -- "npm run heavy-task"
```

### Start Monitoring
```bash
npm run monitor
```

### Example Output
```
🕐 Off-Peaky Claude Status
─────────────────────────
Current Time: 2024-03-31 14:45:30 EDT
Current Status: ⚡ PEAK HOURS
Next Off-Peak: 2024-03-31 17:00:00 EDT (in 2h 14m)
Duration: 14 hours (until 09:00 tomorrow)

📊 Today's Usage: 156 requests / 2.3M tokens
🎯 Recommended: Quick fixes only
```

## 🏗️ Architecture

```
Off-Peaky-Claude/
├── src/
│   ├── tracker/           # Peak detection logic
│   ├── scheduler/         # Task scheduling
│   ├── alerts/           # Notification system
│   ├── analytics/        # Usage analytics
│   └── cli/             # Command-line interface
├── config/              # Configuration files
├── scripts/             # Utility scripts
└── examples/            # Usage examples
```

## 📈 API Endpoints

### GET /api/status
Returns current peak/off-peak status

### GET /api/predict
Returns next peak/off-peak predictions

### POST /api/schedule
Schedule a task for off-peak execution

### GET /api/analytics
Usage analytics and optimization suggestions

## 🔧 Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## 📝 License

MIT © Off-Peaky Claude