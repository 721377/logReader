const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// Ensure log directory exists
const logDir = path.join(__dirname, 'log');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Store logs in memory (will be populated from files)
let allLogs = [];

/**
 * Clean up logs older than 7 days
 * Removes logs from files where the oldest log entry is more than 7 days old
 * @returns {Object} Cleanup summary with deleted files count
 */
function cleanupOldLogs() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    let deletedFiles = [];

    try {
        if (fs.existsSync(logDir)) {
            const files = fs.readdirSync(logDir);
            
            files.forEach(file => {
                if (file.endsWith('.json')) {
                    const filePath = path.join(logDir, file);
                    try {
                        const fileContent = fs.readFileSync(filePath, 'utf-8');
                        const logs = JSON.parse(fileContent);
                        
                        // Get logs array
                        let logArray = Array.isArray(logs) ? logs : [logs];
                        
                        if (logArray.length > 0) {
                            // Find the oldest log by sorting timestamps
                            const oldestLog = logArray.reduce((oldest, current) => {
                                const currentTime = new Date(current.timestamp);
                                const oldestTime = new Date(oldest.timestamp);
                                return currentTime < oldestTime ? current : oldest;
                            });

                            const oldestTime = new Date(oldestLog.timestamp);
                            
                            // If the oldest log is older than 7 days, delete the file
                            if (oldestTime < sevenDaysAgo) {
                                fs.unlinkSync(filePath);
                                deletedCount++;
                                deletedFiles.push(file);
                                console.log(`[Cleanup] Deleted old log file: ${file} (oldest log: ${oldestLog.timestamp})`);
                            }
                        }
                    } catch (error) {
                        console.error(`Error processing file ${file} during cleanup:`, error.message);
                    }
                }
            });

            console.log(`[Cleanup] Cleanup complete: Deleted ${deletedCount} files older than 7 days`);
            return {
                success: true,
                deletedCount,
                deletedFiles,
                message: `Deleted ${deletedCount} log files older than 7 days`
            };
        }
    } catch (error) {
        console.error('Error during log cleanup:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Load existing logs from files on startup
function loadLogsFromFiles() {
    try {
        if (fs.existsSync(logDir)) {
            const files = fs.readdirSync(logDir);
            allLogs = [];
            
            files.forEach(file => {
                if (file.endsWith('.json')) {
                    const filePath = path.join(logDir, file);
                    try {
                        const fileContent = fs.readFileSync(filePath, 'utf-8');
                        const logs = JSON.parse(fileContent);
                        
                        // Handle both array and object formats
                        if (Array.isArray(logs)) {
                            allLogs.push(...logs);
                        } else if (logs && typeof logs === 'object') {
                            allLogs.push(logs);
                        }
                    } catch (error) {
                        console.error(`Error reading file ${file}:`, error.message);
                    }
                }
            });
            
            // Sort logs by timestamp (newest first)
            allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
    } catch (error) {
        console.error('Error loading logs from files:', error);
    }
}

// Load logs on startup and run cleanup
loadLogsFromFiles();
cleanupOldLogs();

// Setup periodic cleanup (runs every 24 hours)
setInterval(() => {
    console.log('[Scheduler] Running scheduled log cleanup...');
    cleanupOldLogs();
    loadLogsFromFiles(); // Reload logs after cleanup
}, 24 * 60 * 60 * 1000); // 24 hours

// Parse JSON body from request
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = body ? JSON.parse(body) : {};
                resolve(data);
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

// Serve static files
function serveStaticFile(filePath, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'File not found' }));
            return;
        }
        
        const ext = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json'
        }[ext] || 'text/plain';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// Create the HTTP server
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    try {
        // GET /api/logs - Retrieve all logs
        if (req.method === 'GET' && pathname === '/api/logs') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(allLogs));
            return;
        }
        
        // GET /api/logs/list - List all log files
        if (req.method === 'GET' && pathname === '/api/logs/list') {
            const files = fs.readdirSync(logDir);
            const logFiles = files.filter(f => f.endsWith('.json'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                count: logFiles.length,
                files: logFiles 
            }));
            return;
        }
        
        // GET /api/logs/:fileName - Retrieve a specific log file
        if (req.method === 'GET' && pathname.startsWith('/api/logs/')) {
            const fileName = pathname.replace('/api/logs/', '');
            if (fileName && fileName !== 'list') {
                const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
                const filePath = path.join(logDir, `${sanitizedFileName}.json`);
                
                // Security check: ensure file is in log directory
                if (!filePath.startsWith(logDir)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Access denied' }));
                    return;
                }
                
                if (!fs.existsSync(filePath)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Log file not found' }));
                    return;
                }
                
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(fileContent);
                return;
            }
        }
        
        // POST /api/logs/save - Save a single log or multiple logs
        if (req.method === 'POST' && pathname === '/api/logs/save') {
            const body = await parseBody(req);
            const { logData, fileName } = body;
            
            if (!logData) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'logData is required' }));
                return;
            }
            
            if (!fileName) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'fileName is required' }));
                return;
            }
            
            const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
            const filePath = path.join(logDir, `${sanitizedFileName}.json`);
            
            let dataToSave = logData;
            if (typeof logData === 'string') {
                try {
                    dataToSave = JSON.parse(logData);
                } catch (e) {
                    dataToSave = { raw: logData };
                }
            }
            
            fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
            
            if (Array.isArray(dataToSave)) {
                allLogs.push(...dataToSave);
            } else {
                allLogs.push(dataToSave);
            }
            
            allLogs.sort((a, b) => {
                const aTime = new Date(a.timestamp || 0).getTime();
                const bTime = new Date(b.timestamp || 0).getTime();
                return bTime - aTime;
            });

            // Run cleanup check after saving new logs
            cleanupOldLogs();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                message: 'Log saved successfully',
                filePath: filePath,
                fileName: `${sanitizedFileName}.json`
            }));
            return;
        }
        
        // DELETE /api/logs/:fileName - Delete a log file
        if (req.method === 'DELETE' && pathname.startsWith('/api/logs/')) {
            const fileName = pathname.replace('/api/logs/', '');
            const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
            const filePath = path.join(logDir, `${sanitizedFileName}.json`);
            
            // Security check: ensure file is in log directory
            if (!filePath.startsWith(logDir)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Access denied' }));
                return;
            }
            
            if (!fs.existsSync(filePath)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Log file not found' }));
                return;
            }
            
            fs.unlinkSync(filePath);
            loadLogsFromFiles();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                message: 'Log file deleted successfully' 
            }));
            return;
        }

        // POST /api/logs/cleanup - Manually trigger cleanup of old logs (older than 7 days)
        if (req.method === 'POST' && pathname === '/api/logs/cleanup') {
            console.log('[API] Manual cleanup triggered');
            const cleanupResult = cleanupOldLogs();
            loadLogsFromFiles(); // Reload logs after cleanup
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(cleanupResult));
            return;
        }

        // POST /api/logs/upload - Upload and process JSON logs from file
        if (req.method === 'POST' && pathname === '/api/logs/upload') {
            const body = await parseBody(req);
            const { logsData } = body;
            
            if (!logsData) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'logsData is required' }));
                return;
            }
            
            try {
                // Parse logs data (can be array or single object)
                let logsArray = Array.isArray(logsData) ? logsData : [logsData];
                
                // Validate that we have actual logs
                if (logsArray.length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'No valid logs found in data' }));
                    return;
                }
                
                // Add logs to in-memory storage
                allLogs.push(...logsArray);
                
                // Sort logs by timestamp (newest first)
                allLogs.sort((a, b) => {
                    const aTime = new Date(a.timestamp || 0).getTime();
                    const bTime = new Date(b.timestamp || 0).getTime();
                    return bTime - aTime;
                });
                
                // Save uploaded logs to a file
                const uploadFileName = `uploaded_${Date.now()}`;
                const sanitizedFileName = uploadFileName.replace(/[^a-zA-Z0-9_-]/g, '_');
                const filePath = path.join(logDir, `${sanitizedFileName}.json`);
                fs.writeFileSync(filePath, JSON.stringify(logsArray, null, 2), 'utf-8');
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: `Successfully uploaded ${logsArray.length} logs`,
                    count: logsArray.length,
                    fileName: `${sanitizedFileName}.json`
                }));
                return;
            } catch (error) {
                console.error('Error processing upload:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Error processing logs', 
                    details: error.message 
                }));
                return;
            }
        }
        
        // Serve static files
        if (pathname === '/') {
            serveStaticFile(path.join(__dirname, 'index.html'), res);
            return;
        }
        
        if (pathname.match(/\.(html|css|js)$/)) {
            serveStaticFile(path.join(__dirname, pathname), res);
            return;
        }
        
        // 404 - Not found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        
    } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error', details: error.message }));
    }
});

// Start the server
server.listen(PORT, () => {
    console.log(`Log Dashboard server running at http://localhost:${PORT}`);
    console.log(`Logs are stored in: ${logDir}`);
});