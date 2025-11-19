# User Action Logging Guide

This guide explains how to use the new user action logging system to log user actions throughout the day and automatically clean up old logs.

## Overview

The logging system is designed to:
- **Log high-frequency user actions** (100+ actions per day)
- **Batch send actions** to the server efficiently
- **Automatically delete old logs** (older than 7 days)
- **Support manual cleanup triggers**

---

## How It Works

### 1. **Client-Side Logging** (logClient.js)

The `LogClient` class provides methods to send user actions to the server.

#### Single Log (Immediate)
```javascript
// Initialize the client
const logClient = new LogClient('http://localhost:3000', {
    fileName: 'my_app_log'
});

// Send a single log immediately
await logClient.logAction(
    'button_click',           // event
    'john_doe',              // userName
    'COMP-1234',            // companyId
    'User clicked submit button',  // details
    'info',                 // level
    'my_app_log'           // fileName
);
```

#### Batch Logging (Queued)
For high-frequency events (like every click), use batch mode:

```javascript
// Events are queued and sent in batches
// Batch is sent when:
// - 10 actions are queued (default batchSize)
// - OR 5 seconds have passed (default batchTimeoutMs)

await logClient.queueAction(
    {
        userName: 'john_doe',
        companyId: 'COMP-1234',
        event: 'user_scroll',
        details: 'User scrolled page',
        level: 'info'
    },
    'my_app_log'
);

// After queuing some events, manually flush if needed
await logClient.flushQueue();
```

### 2. **Automatic Cleanup** (server-side)

The server automatically manages old logs:

#### When Cleanup Happens:
- **On Server Start**: Checks and removes files with old logs
- **Every 24 Hours**: Scheduled cleanup runs periodically
- **After Saving New Logs**: Quick cleanup check

#### Cleanup Logic:
- Examines each log file
- Finds the **oldest log entry** in that file
- If the oldest entry is **older than 7 days**, the entire file is deleted
- Logs console messages about deleted files

---

## Usage Examples

### Example 1: Track User Login
```javascript
const logClient = new LogClient('http://localhost:3000');

document.getElementById('loginBtn').addEventListener('click', async () => {
    await logClient.logAction(
        'user_login',
        document.getElementById('userName').value,
        'COMP-1234',
        'User logged in via email',
        'info',
        'user_session_log'
    );
});
```

### Example 2: Track Multiple Actions in Real-Time (100+ per day)
```javascript
const logClient = new LogClient('http://localhost:3000', {
    batchSize: 20,           // Send every 20 actions
    batchTimeoutMs: 3000,    // Or every 3 seconds
    fileName: 'app_actions'
});

// Track button clicks
document.addEventListener('click', async (e) => {
    if (e.target.tagName === 'BUTTON') {
        await logClient.queueAction(
            {
                userName: 'john_doe',
                companyId: 'COMP-1234',
                event: 'button_click',
                details: `Clicked: ${e.target.textContent}`,
                level: 'info'
            },
            'app_actions'
        );
    }
});

// Ensure remaining actions are sent on page unload
window.addEventListener('beforeunload', () => {
    logClient.flushQueue();
});
```

### Example 3: Track Page Views and Navigation
```javascript
const logClient = new LogClient('http://localhost:3000');

// Track page views
document.addEventListener('DOMContentLoaded', async () => {
    await logClient.logAction(
        'page_view',
        'john_doe',
        'COMP-1234',
        `Viewed: ${window.location.pathname}`,
        'info',
        'page_views'
    );
});

// Track navigation
window.addEventListener('hashchange', async () => {
    await logClient.logAction(
        'navigation',
        'john_doe',
        'COMP-1234',
        `Navigated to: ${window.location.hash}`,
        'info',
        'navigation_log'
    );
});
```

### Example 4: Error Tracking
```javascript
const logClient = new LogClient('http://localhost:3000');

// Track JavaScript errors
window.addEventListener('error', async (e) => {
    await logClient.logAction(
        'javascript_error',
        'john_doe',
        'COMP-1234',
        `Error: ${e.message}`,
        'error',
        'error_log'
    );
});

// Track API errors
fetch('/api/data')
    .catch(async (error) => {
        await logClient.logAction(
            'api_error',
            'john_doe',
            'COMP-1234',
            `API Error: ${error.message}`,
            'error',
            'api_errors'
        );
    });
```

### Example 5: Automatic Event Tracking
```javascript
const logClient = new LogClient('http://localhost:3000', {
    autoTrack: true,
    userName: 'john_doe',
    companyId: 'COMP-1234',
    fileName: 'auto_tracked_events'
});

// This automatically tracks:
// - Page views
// - Button clicks
// - Form submissions
// - Page unload (flushes remaining queued actions)
```

---

## API Reference

### LogClient Methods

#### `sendLog(logData, fileName)`
Send a single log immediately.
```javascript
await logClient.sendLog({
    userName: 'john_doe',
    companyId: 'COMP-1234',
    event: 'login',
    details: 'User logged in',
    level: 'info'
}, 'login_log');
```

#### `queueAction(actionData, fileName)`
Queue an action for batch sending.
```javascript
await logClient.queueAction({
    userName: 'john_doe',
    companyId: 'COMP-1234',
    event: 'click',
    details: 'Button clicked',
    level: 'info'
}, 'actions_log');
```

#### `flushQueue()`
Send all queued actions immediately.
```javascript
await logClient.flushQueue();
```

#### `logAction(event, userName, companyId, details, level, fileName)`
Convenience method to queue an action.
```javascript
await logClient.logAction('click', 'john', 'COMP-1', 'Button', 'info', 'app_log');
```

#### `getAllLogs()`
Retrieve all logs from server.
```javascript
const logs = await logClient.getAllLogs();
```

#### `getLogFile(fileName)`
Retrieve logs from a specific file.
```javascript
const logs = await logClient.getLogFile('my_app_log');
```

#### `deleteLogFile(fileName)`
Delete a specific log file.
```javascript
await logClient.deleteLogFile('my_app_log');
```

#### `cleanupOldLogs()`
Manually trigger cleanup of logs older than 7 days.
```javascript
await logClient.cleanupOldLogs();
```

---

## Server-Side API Endpoints

### Logging Endpoints

#### GET `/api/logs`
Get all logs.
```
curl http://localhost:3000/api/logs
```

#### GET `/api/logs/list`
List all log files.
```
curl http://localhost:3000/api/logs/list
```

#### GET `/api/logs/:fileName`
Get logs from a specific file.
```
curl http://localhost:3000/api/logs/my_app_log
```

#### POST `/api/logs/save`
Save new logs.
```
curl -X POST http://localhost:3000/api/logs/save \
  -H "Content-Type: application/json" \
  -d '{
    "logData": {"userName":"john","companyId":"COMP-1","event":"login","details":"Logged in","level":"info"},
    "fileName": "my_log"
  }'
```

#### DELETE `/api/logs/:fileName`
Delete a log file.
```
curl -X DELETE http://localhost:3000/api/logs/my_app_log
```

#### POST `/api/logs/cleanup`
Manually trigger cleanup of logs older than 7 days.
```
curl -X POST http://localhost:3000/api/logs/cleanup
```

---

## Log Structure

Each log entry must have this structure:
```javascript
{
    timestamp: "2025-01-15T14:23:45.123Z",  // ISO 8601 format (auto-added by client)
    userName: "john_doe",                    // User identifier
    companyId: "COMP-1234",                  // Company identifier
    event: "button_click",                   // Event type
    details: "User clicked submit",          // Event details
    level: "info"                            // info, warning, or error
}
```

---

## Configuration Options

When initializing LogClient:

```javascript
const logClient = new LogClient('http://localhost:3000', {
    batchSize: 10,              // Number of actions before auto-flush (default: 10)
    batchTimeoutMs: 5000,       // Milliseconds before timeout flush (default: 5000)
    fileName: 'default_log',    // Default log file name
    autoTrack: false,           // Auto-track user interactions
    userName: 'anonymous',      // For autoTrack
    companyId: 'unknown'        // For autoTrack
});
```

---

## Best Practices

### 1. **Use Batch Mode for High-Frequency Events**
```javascript
// ✓ Good: Queue clicks to send in batches
await logClient.queueAction({...}, 'clicks_log');

// ✗ Avoid: Sending every click individually
await logClient.sendLog({...}, 'clicks_log');
```

### 2. **Flush Before Page Unload**
```javascript
window.addEventListener('beforeunload', () => {
    logClient.flushQueue();
});
```

### 3. **Use Different Files for Different Event Types**
```javascript
// Separate files for different log types
await logClient.logAction(..., 'user_actions');    // Clicks, form submissions
await logClient.logAction(..., 'api_errors');      // API errors
await logClient.logAction(..., 'page_views');      // Page views
```

### 4. **Let Automatic Cleanup Handle Old Logs**
The server automatically deletes files where the oldest log is > 7 days old. No manual intervention needed.

### 5. **Monitor Logs in Dashboard**
Visit `http://localhost:3000` to view and filter all logs in real-time.

---

## Cleanup Details

### When Do Logs Get Deleted?

A log file is deleted if:
1. The file contains at least one log entry
2. The **oldest** log entry in the file is **more than 7 days old**

### Cleanup Schedule

- **On server startup**: Immediate cleanup
- **Every 24 hours**: Scheduled cleanup
- **After saving logs**: Opportunistic cleanup (non-blocking)

### Manual Cleanup

To manually trigger cleanup:
```javascript
const result = await logClient.cleanupOldLogs();
console.log(result);
// {
//   success: true,
//   deletedCount: 3,
//   deletedFiles: ['old_log.json', 'archive.json', 'backup.json'],
//   message: 'Deleted 3 log files older than 7 days'
// }
```

---

## Monitoring and Debugging

### Check Server Logs

The server logs cleanup operations:
```
[Cleanup] Deleted old log file: my_app_log.json (oldest log: 2025-01-08T10:00:00Z)
[Cleanup] Cleanup complete: Deleted 1 files older than 7 days
[Scheduler] Running scheduled log cleanup...
[API] Manual cleanup triggered
```

### Browser Console

Check the browser console for any client-side errors:
```javascript
// Enable detailed logging
logClient.logAction(...);  // Logs successful sends
```

### Dashboard Statistics

Visit the dashboard to see:
- Total number of logs
- Logs filtered by criteria
- Last update time
- All log details with timestamps

---

## Example: Complete App Integration

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App</title>
</head>
<body>
    <button id="submitBtn">Submit</button>
    
    <script src="logClient.js"></script>
    <script>
        // Initialize logger
        const logClient = new LogClient('http://localhost:3000', {
            batchSize: 15,
            batchTimeoutMs: 3000,
            fileName: 'myapp_logs'
        });

        // Track button clicks
        document.getElementById('submitBtn').addEventListener('click', async () => {
            await logClient.queueAction({
                userName: 'user123',
                companyId: 'COMP-456',
                event: 'submit_clicked',
                details: 'User clicked submit button',
                level: 'info'
            });
        });

        // Track page view
        document.addEventListener('DOMContentLoaded', async () => {
            await logClient.logAction(
                'page_view',
                'user123',
                'COMP-456',
                'User visited myapp',
                'info'
            );
        });

        // Flush on page unload
        window.addEventListener('beforeunload', () => {
            logClient.flushQueue();
        });
    </script>
</body>
</html>
```

---

## Summary

✅ **Client-side**: Send user actions individually or in batches  
✅ **Server-side**: Automatically delete logs older than 7 days  
✅ **Dashboard**: View and filter all logs in real-time  
✅ **API**: Full REST API for programmatic access  

Start logging user actions today and let the system automatically manage old logs!