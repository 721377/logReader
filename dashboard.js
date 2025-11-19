// Global variables
let allLogs = [];
let filteredLogs = [];
let refreshInterval;

// Normalize log data from various formats
function normalizeLogData(logData) {
    // If it's already in the expected format, return as-is
    if (logData.userName !== undefined && logData.companyId !== undefined) {
        return logData;
    }
    
    let parsedAdditionalData = null;
    
    if (logData.additionalData) {
        try {
            if (typeof logData.additionalData === 'string') {
                parsedAdditionalData = JSON.parse(logData.additionalData);
            } else if (typeof logData.additionalData === 'object') {
                parsedAdditionalData = logData.additionalData;
            }
        } catch (e) {
            parsedAdditionalData = logData.additionalData;
        }
    }
    
    // Map from the provided JSON format to dashboard format
    return {
        timestamp: logData.timestamp,
        userName: logData.user?.name || 'unknown_user',
        companyId: logData.agency?.id || 'unknown_company',
        companyName: logData.agency?.name || 'unknown_agency',
        event: logData.event,
        details: logData.details,
        level: logData.level,
        userAction: logData.userAction,
        additionalData: parsedAdditionalData,
        additionalDataRaw: logData.additionalData
    };
}

// DOM elements
const logsContent = document.getElementById('logs-content');
const totalLogsElement = document.getElementById('total-logs');
const filteredLogsElement = document.getElementById('filtered-logs');
const lastUpdateElement = document.getElementById('last-update');
const refreshSpinner = document.getElementById('refresh-spinner');
const logModal = document.getElementById('log-modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.getElementById('close-modal');

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Load logs from local storage
    loadLogsFromStorage();
    
    // Set up event listeners
    setupEventListeners();
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Fetch initial logs
    fetchLogs();
});

// Set up event listeners
function setupEventListeners() {
    // Filter buttons
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('clear-filters').addEventListener('click', clearFilters);
    document.getElementById('search-btn').addEventListener('click', applyFilters);
    
    // Action buttons
    document.getElementById('refresh-btn').addEventListener('click', fetchLogs);
    document.getElementById('export-btn').addEventListener('click', exportLogs);
    document.getElementById('upload-btn').addEventListener('click', handleFileUpload);
    
    // Modal close
    closeModal.addEventListener('click', () => {
        logModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === logModal) {
            logModal.style.display = 'none';
        }
    });
    
    // Apply filters on Enter key in search inputs
    document.getElementById('search').addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            applyFilters();
        }
    });
}

// Load logs from browser storage
function loadLogsFromStorage() {
    const storedLogs = localStorage.getItem('applicationLogs');
    if (storedLogs) {
        allLogs = JSON.parse(storedLogs);
        updateStats();
        renderLogs(allLogs);
    }
}

// Save logs to browser storage
function saveLogsToStorage() {
    localStorage.setItem('applicationLogs', JSON.stringify(allLogs));
}

// Fetch logs from API
async function fetchLogs() {
    refreshSpinner.style.display = 'inline-block';
    
    try {
     
        const response = await fetch('/api/logs');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const newLogs = await response.json();
        
        // Merge with existing logs, avoiding duplicates
        mergeLogs(newLogs);
        
        // Save to storage
        // saveLogsToStorage();
        
        // Update display
        updateStats();
        applyFilters();
        
        // Update last update time
        lastUpdateElement.textContent = new Date().toLocaleTimeString();
        
    } catch (error) {
        console.error('Error fetching logs:', error);
        // For demo purposes, we'll generate mock data if the API is not available
        // generateMockData();
    } finally {
        refreshSpinner.style.display = 'none';
    }
}

// Merge new logs with existing logs, avoiding duplicates
function mergeLogs(newLogs) {
    // Create a Set of existing log timestamps for quick lookup
    const existingTimestamps = new Set(allLogs.map(log => log.timestamp));
    
    // Normalize and filter out logs that already exist
    const uniqueNewLogs = newLogs
        .map(log => normalizeLogData(log))
        .filter(log => !existingTimestamps.has(log.timestamp));
    
    // Add unique logs to the beginning of the array (newest first)
    allLogs = [...uniqueNewLogs, ...allLogs];
}

// Apply filters to logs
function applyFilters() {
    const userFilter = document.getElementById('user-filter').value.toLowerCase();
    const companyFilter = document.getElementById('company-filter').value.toLowerCase();
    const levelFilter = document.getElementById('level-filter').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const searchText = document.getElementById('search').value.toLowerCase();
    
    filteredLogs = allLogs.filter(log => {
        // Filter by user name
        if (userFilter && !log.userName.toLowerCase().includes(userFilter)) {
            return false;
        }
        
        // Filter by company ID
        if (companyFilter && !log.companyId.toLowerCase().includes(companyFilter)) {
            return false;
        }
        
        // Filter by log level
        if (levelFilter && log.level !== levelFilter) {
            return false;
        }
        
        // Filter by date range
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        if (dateFrom && logDate < dateFrom) {
            return false;
        }
        if (dateTo && logDate > dateTo) {
            return false;
        }
        
        // Filter by search text in event or details
        if (searchText && 
            !log.event.toLowerCase().includes(searchText) && 
            !log.details.toLowerCase().includes(searchText)) {
            return false;
        }
        
        return true;
    });
    
    updateStats();
    renderLogs(filteredLogs);
}

// Clear all filters
function clearFilters() {
    document.getElementById('user-filter').value = '';
    document.getElementById('company-filter').value = '';
    document.getElementById('level-filter').value = '';
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';
    document.getElementById('search').value = '';
    
    applyFilters();
}

// Render logs to the table
function renderLogs(logs) {
    if (logs.length === 0) {
        logsContent.innerHTML = `
            <div class="no-logs">
                <i class="fas fa-inbox"></i>
                <p>No logs match the current filters.</p>
            </div>
        `;
        return;
    }
    
    // Group logs by date
    const groupedLogs = groupLogsByDate(logs);
    
    let html = '<table class="logs-table">';
    
    // Add table headers
    html += `
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Company</th>
                <th>Event</th>
                <th>Level</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    // Add logs grouped by date
    for (const [date, dateLogs] of Object.entries(groupedLogs)) {
        html += `<tr class="date-header"><td colspan="6">${formatDateHeader(date)}</td></tr>`;
        
        dateLogs.forEach(log => {
            html += `
                <tr>
                    <td>${formatTimestamp(log.timestamp)}</td>
                    <td>${log.userName}</td>
                    <td>${log.companyId}</td>
                    <td>${log.event}</td>
                    <td><span class="badge badge-${log.level}">${log.level}</span></td>
                    <td>
                        <button class="expand-btn" onclick="showLogDetails('${log.timestamp}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    
    html += '</tbody></table>';
    logsContent.innerHTML = html;
}

// Group logs by date
function groupLogsByDate(logs) {
    const grouped = {};
    
    logs.forEach(log => {
        const date = new Date(log.timestamp).toISOString().split('T')[0];
        
        if (!grouped[date]) {
            grouped[date] = [];
        }
        
        grouped[date].push(log);
    });
    
    // Sort dates in descending order
    return Object.keys(grouped)
        .sort((a, b) => new Date(b) - new Date(a))
        .reduce((acc, date) => {
            // Sort logs within each date by timestamp descending
            acc[date] = grouped[date].sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            return acc;
        }, {});
}

// Show log details in modal
function showLogDetails(timestamp) {
    const log = allLogs.find(l => l.timestamp === timestamp);
    
    if (!log) return;
    
    let additionalDataHtml = '';
    
    if (log.userAction) {
        additionalDataHtml += `
        <div class="log-detail">
            <label>User Action</label>
            <div class="value">${log.userAction}</div>
        </div>`;
    }
    
    if (log.additionalData) {
        additionalDataHtml += `
        <div class="log-detail">
            <label>Additional Data</label>
            <div class="value additional-data-table">`;
        
        if (typeof log.additionalData === 'object' && log.additionalData !== null) {
            additionalDataHtml += '<table style="width: 100%; border-collapse: collapse;">';
            for (const [key, value] of Object.entries(log.additionalData)) {
                const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
                additionalDataHtml += `
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 8px; font-weight: bold; width: 30%; word-break: break-word;">${escapeHtml(key)}</td>
                        <td style="padding: 8px; word-break: break-word;">${escapeHtml(displayValue)}</td>
                    </tr>`;
            }
            additionalDataHtml += '</table>';
        } else {
            additionalDataHtml += `<pre>${escapeHtml(JSON.stringify(log.additionalData, null, 2))}</pre>`;
        }
        
        additionalDataHtml += `
            </div>
        </div>`;
    }
    
    modalBody.innerHTML = `
        <div class="log-detail">
            <label>Timestamp</label>
            <div class="value">${formatTimestamp(log.timestamp)}</div>
        </div>
        <div class="log-detail">
            <label>User Name</label>
            <div class="value">${log.userName}</div>
        </div>
        <div class="log-detail">
            <label>Company ID</label>
            <div class="value">${log.companyId}</div>
        </div>
        <div class="log-detail">
            <label>Company Name</label>
            <div class="value">${log.companyName}</div>
        </div>
        <div class="log-detail">
            <label>Event</label>
            <div class="value">${log.event}</div>
        </div>
        <div class="log-detail">
            <label>Details</label>
            <div class="value">${log.details}</div>
        </div>
        <div class="log-detail">
            <label>Level</label>
            <div class="value"><span class="badge badge-${log.level}">${log.level}</span></div>
        </div>
        ${additionalDataHtml}
    `;
    
    logModal.style.display = 'flex';
}

// Helper function to escape HTML special characters
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Update statistics
function updateStats() {
    totalLogsElement.textContent = allLogs.length;
    filteredLogsElement.textContent = filteredLogs.length || allLogs.length;
}

// Export logs as JSON or CSV
function exportLogs() {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : allLogs;
    
    if (logsToExport.length === 0) {
        alert('No logs to export.');
        return;
    }
    
    // Create a JSON blob
    const dataStr = JSON.stringify(logsToExport, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.download = `logs-${new Date().toISOString().split('T')[0]}.json`;
    downloadLink.href = URL.createObjectURL(dataBlob);
    downloadLink.click();
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(downloadLink.href), 100);
}

// Handle file upload
function handleFileUpload() {
    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];
    const statusDiv = document.getElementById('upload-status');
    
    if (!file) {
        statusDiv.innerHTML = '<span style="color: orange;"><i class="fas fa-exclamation-triangle"></i> Please select a file</span>';
        return;
    }
    
    if (!file.name.endsWith('.json')) {
        statusDiv.innerHTML = '<span style="color: red;"><i class="fas fa-times-circle"></i> Please select a valid JSON file</span>';
        return;
    }
    
    statusDiv.innerHTML = '<span style="color: blue;"><i class="fas fa-spinner fa-spin"></i> Uploading...</span>';
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const fileContent = event.target.result;
            const jsonData = JSON.parse(fileContent);
            
            uploadLogs(jsonData);
        } catch (error) {
            statusDiv.innerHTML = `<span style="color: red;"><i class="fas fa-times-circle"></i> Error parsing JSON: ${error.message}</span>`;
            console.error('JSON parse error:', error);
        }
    };
    
    reader.onerror = () => {
        statusDiv.innerHTML = '<span style="color: red;"><i class="fas fa-times-circle"></i> Error reading file</span>';
    };
    
    reader.readAsText(file);
}

// Upload logs to server
async function uploadLogs(jsonData) {
    const statusDiv = document.getElementById('upload-status');
    
    try {
        const response = await fetch('/api/logs/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ logsData: jsonData })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            statusDiv.innerHTML = `<span style="color: green;"><i class="fas fa-check-circle"></i> Successfully uploaded ${result.count} logs</span>`;
            
            // Clear the file input
            document.getElementById('file-upload').value = '';
            
            // Reload logs after a short delay to ensure they're saved
            setTimeout(() => {
                fetchLogs();
            }, 500);
        } else {
            statusDiv.innerHTML = `<span style="color: red;"><i class="fas fa-times-circle"></i> Error: ${result.error || 'Upload failed'}</span>`;
        }
    } catch (error) {
        statusDiv.innerHTML = `<span style="color: red;"><i class="fas fa-times-circle"></i> Error uploading logs: ${error.message}</span>`;
        console.error('Upload error:', error);
    }
}

// Start auto-refresh
function startAutoRefresh() {
    // Refresh every 15 seconds
    refreshInterval = setInterval(fetchLogs, 15000);
}

// Format timestamp for display
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Format date header
function formatDateHeader(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
}

// Generate mock data for demonstration
// function generateMockData() {
//     const mockLogs = [
//         {
//             "timestamp": "2025-11-05T14:23:45Z",
//             "userName": "john_doe",
//             "companyId": "COMP-1234",
//             "event": "User logged in",
//             "details": "Login via email",
//             "level": "info"
//         },
//         {
//             "timestamp": "2025-11-05T13:15:22Z",
//             "userName": "jane_smith",
//             "companyId": "COMP-5678",
//             "event": "File uploaded",
//             "details": "Uploaded quarterly_report.pdf",
//             "level": "info"
//         },
//         {
//             "timestamp": "2025-11-05T12:05:33Z",
//             "userName": "robert_brown",
//             "companyId": "COMP-1234",
//             "event": "Payment failed",
//             "details": "Credit card declined for transaction TXN-789",
//             "level": "error"
//         },
//         {
//             "timestamp": "2025-11-04T16:45:12Z",
//             "userName": "alice_williams",
//             "companyId": "COMP-9012",
//             "event": "Password changed",
//             "details": "User changed their password",
//             "level": "info"
//         },
//         {
//             "timestamp": "2025-11-04T11:30:05Z",
//             "userName": "michael_johnson",
//             "companyId": "COMP-5678",
//             "event": "API rate limit exceeded",
//             "details": "User exceeded API call limit of 1000/hour",
//             "level": "warning"
//         },
//         {
//             "timestamp": "2025-11-03T09:12:47Z",
//             "userName": "sarah_davis",
//             "companyId": "COMP-3456",
//             "event": "Account created",
//             "details": "New user account created with email verification",
//             "level": "info"
//         },
//         {
//             "timestamp": "2025-11-03T08:05:19Z",
//             "userName": "david_wilson",
//             "companyId": "COMP-1234",
//             "event": "Database connection error",
//             "details": "Failed to connect to primary database, using backup",
//             "level": "error"
//         }
//     ];
    
//     mergeLogs(mockLogs);
//     // saveLogsToStorage();
//     updateStats();
//     applyFilters();
    
//     // Update last update time
//     lastUpdateElement.textContent = new Date().toLocaleTimeString();
// }