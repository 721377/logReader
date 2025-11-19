# Complete Setup Guide

## Prerequisites

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **A code editor** (VS Code recommended)
- **A web browser** (Chrome, Firefox, Safari, Edge)

## Step-by-Step Installation

### Step 1: Navigate to Project Directory

```bash
cd c:\mohamedFlutter\logDashboard
```

### Step 2: Install Dependencies

```bash
npm install
```

**What this does:**
- Installs Express.js web framework
- Installs body-parser for request handling
- Installs nodemon for development (optional)

**Expected output:**
```
added X packages in Xs
```

### Step 3: Start the Server

```bash
npm start
```

**Expected output:**
```
Log Dashboard server running at http://localhost:3000
Logs are stored in: c:\mohamedFlutter\logDashboard\log
replace the 'http://localhost:3000' with the actual URL where the server is running.
```

### Step 4: Access the Dashboard

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the Planner Logs Dashboard with an empty state.

---

## Sending Your First Log

### Method 1: Using the Example App

1. In the same browser, open a new tab
2. Go to: `http://localhost:3000/example-app.html`
3. Fill out the form with:
   - **User Name:** john_doe
   - **Company ID:** COMP-1234
   - **Event:** First Log
   - **Details:** Testing the API
   - **Level:** info
   - **File Name:** first_test_log
4. Click "Send Log"
5. Go back to the dashboard tab and refresh
6. You should see your log in the table!

### Method 2: Using JavaScript/Node.js

```javascript
const LogClient = require('./logClient.js');
const logClient = new LogClient('http://localhost:3000');

(async () => {
  const result = await logClient.sendLog({
    userName: 'test_user',
    companyId: 'COMP-1234',
    event: 'Test Event',
    details: 'Testing from Node.js',
    level: 'info'
  }, 'nodejs_test_log');
  
  console.log(result);
})();
```

### Method 3: Using cURL

```bash
curl -X POST http://localhost:3000/api/logs/save ^
  -H "Content-Type: application/json" ^
  -d "{\"logData\": {\"timestamp\": \"2025-11-05T14:23:45Z\", \"userName\": \"curl_user\", \"companyId\": \"COMP-1234\", \"event\": \"cURL Test\", \"details\": \"Testing from cURL\", \"level\": \"info\"}, \"fileName\": \"curl_test\"}"
```

### Method 4: Using Python

```python
import requests

log_data = {
    'timestamp': '2025-11-05T14:23:45Z',
    'userName': 'python_user',
    'companyId': 'COMP-1234',
    'event': 'Python Test',
    'details': 'Testing from Python',
    'level': 'info'
}

response = requests.post('http://localhost:3000/api/logs/save', json={
    'logData': log_data,
    'fileName': 'python_test_log'
})

print(response.json())
```

---

## Project Files Explained

### Configuration

**package.json**
- Project metadata
- Dependencies list
- NPM scripts

---

## Verification

### Check Server is Running

1. Open browser console (F12)
2. Navigate to `http://localhost:3000`
3. No errors should appear

### Check API Connectivity

```bash
curl http://localhost:3000/api/logs
```

Should return: `[]` or an array of logs

### Check Log Directory

Navigate to: `c:\mohamedFlutter\logDashboard\log`

You should see `.json` files for each log sent.

---

## Configuration

### Change Port

If port 3000 is already in use:

```bash
PORT=8000 npm start
```

### Development Mode with Auto-Reload

```bash
npm run dev
```

This uses nodemon to automatically restart the server when files change.

### Persistent Logging

The server automatically:
- Creates the `log/` directory if it doesn't exist
- Saves each log as a separate JSON file
- Loads all existing logs on startup
- Caches logs in memory for fast retrieval

---



## Common Tasks

### View All Logs

**API Endpoint:**
```bash
GET http://localhost:3000/api/logs
```

**Using JavaScript:**
```javascript
const logs = await logClient.getAllLogs();
```

### Send a Batch of Logs

**API Endpoint:**
```bash
POST http://localhost:3000/api/logs/save
```

**Body:**
```json
{
  "logData": [
    { /* log 1 */ },
    { /* log 2 */ },
    { /* log 3 */ }
  ],
  "fileName": "batch_logs"
}
```

### Delete a Log File

**API Endpoint:**
```bash
DELETE http://localhost:3000/api/logs/filename
```

### List All Log Files

**API Endpoint:**
```bash
GET http://localhost:3000/api/logs/list
```

---

## Troubleshooting

### Issue: npm install fails

**Solution:**
- Ensure Node.js is installed: `node --version`
- Clear npm cache: `npm cache clean --force`
- Try again: `npm install`

### Issue: Port 3000 already in use

**Solution:**
```bash
PORT=3001 npm start
```

Or find and close the process using port 3000.

### Issue: "Cannot find module 'express'"

**Solution:**
```bash
npm install
```

Make sure you're in the correct directory.

### Issue: Logs not appearing in dashboard

**Solution:**
1. Verify server is running (check console for "running at http://localhost:3000")
2. Clear browser cache (Ctrl+Shift+Delete)
3. Refresh the page
4. Check browser console for errors (F12)
5. Check if log file was created in `log/` directory

### Issue: Unable to access API endpoints
**Solution:**
1. Verify server is running: `npm start` in another terminal
2. Check if port 3000 is correct
3. Try accessing `http://localhost:3000/api/logs` directly
4. Check firewall settings

---

## Performance Tips

1. **Batch Operations:** Send multiple logs at once instead of individually
2. **Clean Old Logs:** Periodically delete old log files via API or manually
3. **Disable Auto-Refresh:** If not needed, disable in `dashboard.js` (line 563)
4. **Monitor Memory:** Large log collections will consume memory

---

## Security Notes

- **No Authentication:** Currently no auth required (add in production)
- **Path Protection:** File names are sanitized to prevent directory traversal
- **CORS:** No CORS restrictions (add in production)
- **Rate Limiting:** Not implemented (add in production)



## Resources

- **Node.js Documentation:** https://nodejs.org/docs/
- **Express.js Documentation:** https://expressjs.com/
- **JavaScript Fetch API:** https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

---



**Setup Version:** 1.0.0
**Last Updated:** 2025-11-05