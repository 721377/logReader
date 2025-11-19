# Quick Start - User Action Logging

## ⚡ 5-Minute Setup

### Step 1: Start Your Server
```bash
npm start
# Server runs on http://localhost:3000
```

### Step 2: Copy This Into Your HTML
```html
<!DOCTYPE html>
<html>
<head>
    <title>My App</title>
</head>
<body>
    <button id="myButton">Click Me</button>

    <script src="http://localhost:3000/logClient.js"></script>
    <script>
        // Initialize
        const logClient = new LogClient('http://localhost:3000');

        // Track button click
        document.getElementById('myButton').addEventListener('click', async () => {
            await logClient.sendLog({
                userName: 'john_doe',
                companyId: 'COMP-1234',
                event: 'button_clicked',
                details: 'User clicked the button',
                level: 'info'
            }, 'my_app_log');
        });

        // Flush on page unload
        window.addEventListener('beforeunload', () => {
            logClient.flushQueue();
        });
    </script>
</body>
</html>
```

### Step 3: View Your Logs
Visit: **http://localhost:3000**

---

## 🎯 Common Tasks

### Log a User Action
```javascript
await logClient.sendLog({
    userName: 'john_doe',
    companyId: 'COMP-1234',
    event: 'user_login',
    details: 'User logged in via email',
    level: 'info'
}, 'login_events');
```

### Queue Multiple Actions (Efficient)
```javascript
// These are queued and sent in batches automatically
await logClient.queueAction({
    userName: 'john_doe',
    companyId: 'COMP-1234',
    event: 'page_scroll',
    details: 'User scrolled page',
    level: 'info'
}, 'user_interactions');
```

### Track All Clicks
```javascript
document.addEventListener('click', async (e) => {
    await logClient.queueAction({
        userName: 'john_doe',
        companyId: 'COMP-1234',
        event: 'button_click',
        details: `Clicked: ${e.target.text}`,
        level: 'info'
    }, 'click_events');
});
```

### Track Form Submissions
```javascript
document.getElementById('myForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Log the submission
    await logClient.sendLog({
        userName: 'john_doe',
        companyId: 'COMP-1234',
        event: 'form_submitted',
        details: 'User submitted contact form',
        level: 'info'
    }, 'form_events');
    
    // Now submit the form
    // ... your form submission code
});
```

### Track Page Views
```javascript
window.addEventListener('load', async () => {
    await logClient.sendLog({
        userName: 'john_doe',
        companyId: 'COMP-1234',
        event: 'page_view',
        details: `User viewed: ${window.location.pathname}`,
        level: 'info'
    }, 'page_views');
});
```

### Handle High-Frequency Events (100+ per day)
```javascript
// Use batch mode with optimized settings
const logClient = new LogClient('http://localhost:3000', {
    batchSize: 25,           // Send every 25 actions
    batchTimeoutMs: 5000,    // Or every 5 seconds
    fileName: 'user_actions'
});

// Queue all clicks - they'll auto-batch
document.addEventListener('click', async (e) => {
    await logClient.queueAction({
        userName: 'john_doe',
        companyId: 'COMP-1234',
        event: 'user_click',
        details: `Clicked: ${e.target.text}`,
        level: 'info'
    });
});

// Ensure remaining queued actions are sent
window.addEventListener('beforeunload', () => {
    logClient.flushQueue();
});
```

---

## 🔧 Configuration

```javascript
const logClient = new LogClient('http://localhost:3000', {
    batchSize: 10,              // Default: 10 - number of actions before auto-send
    batchTimeoutMs: 5000,       // Default: 5000 - milliseconds before auto-send
    fileName: 'default_log',    // Default file name for logs
    autoTrack: false,           // Auto-track page views, clicks, forms
    userName: 'user',           // For autoTrack feature
    companyId: 'company'        // For autoTrack feature
});
```

**Tuning Tips:**
- **High-frequency events (100+ clicks/day)?** → Increase `batchSize` to 25-50
- **Few events per day?** → Can use `sendLog()` directly
- **Need immediate logs?** → Decrease `batchTimeoutMs` to 1000-2000

---

## 📊 Cleanup Happens Automatically

The server automatically deletes log files where the **oldest log is older than 7 days**.

- ✅ Runs on server startup
- ✅ Runs every 24 hours
- ✅ Runs after saving new logs

**No action needed - it just works!**

---

## 🧪 Quick Test

Open this file in your browser: **http://localhost:3000/test-logging.html**

Or test in browser console:
```javascript
const logClient = new LogClient('http://localhost:3000');

// Test single log
await logClient.sendLog({
    userName: 'test',
    companyId: 'TEST',
    event: 'test_event',
    details: 'Test',
    level: 'info'
}, 'test_log');

// Test batch (queue 5)
for (let i = 0; i < 5; i++) {
    await logClient.queueAction({
        userName: 'test',
        companyId: 'TEST',
        event: `test_${i}`,
        details: `Test ${i}`,
        level: 'info'
    }, 'test_batch');
}

// Flush
await logClient.flushQueue();

// View all logs
const logs = await logClient.getAllLogs();
console.log(logs);
```

---

## 🎨 API Methods Quick Reference

| Method | Use Case | Example |
|--------|----------|---------|
| `sendLog()` | Send immediately | Important events |
| `queueAction()` | Queue for batch | High-frequency |
| `flushQueue()` | Force send queued | Page unload |
| `logAction()` | Shorthand queue | Simple tracking |
| `getAllLogs()` | Fetch all logs | Dashboard |
| `getLogFile()` | Fetch specific | Specific file |
| `cleanupOldLogs()` | Trigger cleanup | Manual cleanup |

---

## 📱 Complete Example App

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App with Logging</title>
    <style>
        button { padding: 10px 20px; margin: 10px; }
    </style>
</head>
<body>
    <h1>My App</h1>
    <button id="btn1">Action 1</button>
    <button id="btn2">Action 2</button>
    <button id="btn3">View Logs</button>

    <script src="http://localhost:3000/logClient.js"></script>
    <script>
        // Initialize with batch settings
        const logClient = new LogClient('http://localhost:3000', {
            batchSize: 10,
            batchTimeoutMs: 3000,
            fileName: 'myapp_events'
        });

        // Track button 1
        document.getElementById('btn1').addEventListener('click', async () => {
            await logClient.queueAction({
                userName: 'user123',
                companyId: 'COMP-1',
                event: 'action_1',
                details: 'User performed action 1',
                level: 'info'
            });
            console.log('Action 1 logged');
        });

        // Track button 2
        document.getElementById('btn2').addEventListener('click', async () => {
            await logClient.queueAction({
                userName: 'user123',
                companyId: 'COMP-1',
                event: 'action_2',
                details: 'User performed action 2',
                level: 'info'
            });
            console.log('Action 2 logged');
        });

        // View logs button
        document.getElementById('btn3').addEventListener('click', async () => {
            const logs = await logClient.getAllLogs();
            console.log('Total logs:', logs.length);
            console.log('Logs:', logs);
            window.open('http://localhost:3000', '_blank');
        });

        // Flush on unload
        window.addEventListener('beforeunload', () => {
            logClient.flushQueue();
        });

        // Log page view
        window.addEventListener('load', async () => {
            await logClient.sendLog({
                userName: 'user123',
                companyId: 'COMP-1',
                event: 'page_view',
                details: 'User visited the app',
                level: 'info'
            }, 'page_views');
        });
    </script>
</body>
</html>
```

---

## 🚨 Troubleshooting

### Logs not appearing?
1. Check browser console for errors
2. Verify server is running: `http://localhost:3000`
3. Check network tab to see if requests are being sent
4. Ensure `beforeunload` event listener is set

### Too many requests?
1. Increase `batchSize`: `batchSize: 30`
2. Increase `batchTimeoutMs`: `batchTimeoutMs: 10000`

### Cleanup not working?
1. Check server console for cleanup messages
2. Verify log files have timestamps in ISO format
3. Check if oldest log is actually > 7 days old

---

## 📚 More Information

- **Full Documentation**: `USER_ACTION_LOGGING_GUIDE.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **All Changes**: `CHANGES_MADE.md`
- **Interactive Test**: `test-logging.html`

---

## ✅ You're Ready!

```javascript
// 1. Add to your HTML
<script src="http://localhost:3000/logClient.js"></script>

// 2. Initialize
const logClient = new LogClient('http://localhost:3000');

// 3. Log actions
await logClient.queueAction({...});

// 4. View in dashboard
// http://localhost:3000
```

**That's it! Your logging system is working.** 🚀

Logs older than 7 days will be automatically deleted. Enjoy!