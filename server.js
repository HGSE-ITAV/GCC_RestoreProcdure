#!/usr/bin/env node

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Create HTTP server for serving files
const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let filePath = '.' + url.pathname;
    if (filePath === './') filePath = './index.html';
    
    const extname = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store active connections and pending requests
const connections = {
    admins: new Set(),
    users: new Set(),
    requests: new Map() // requestId -> request data
};

// Generate secure access codes
function generateAccessCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate unique request ID
function generateRequestId() {
    return crypto.randomBytes(16).toString('hex');
}

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection from:', req.connection.remoteAddress);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received:', data);
            
            switch (data.type) {
                case 'register_admin':
                    connections.admins.add(ws);
                    ws.clientType = 'admin';
                    ws.send(JSON.stringify({
                        type: 'admin_registered',
                        message: 'Admin dashboard connected'
                    }));
                    
                    // Send pending requests to newly connected admin
                    connections.requests.forEach((request, requestId) => {
                        ws.send(JSON.stringify({
                            type: 'access_request',
                            requestId,
                            ...request
                        }));
                    });
                    break;
                    
                case 'register_user':
                    connections.users.add(ws);
                    ws.clientType = 'user';
                    ws.requestId = data.requestId;
                    ws.send(JSON.stringify({
                        type: 'user_registered',
                        message: 'Connected to access request system'
                    }));
                    break;
                    
                case 'request_access':
                    const requestId = generateRequestId();
                    const request = {
                        timestamp: Date.now(),
                        userInfo: data.userInfo || 'Unknown User',
                        location: req.connection.remoteAddress,
                        status: 'pending'
                    };
                    
                    connections.requests.set(requestId, request);
                    ws.requestId = requestId;
                    
                    // Notify all admins about new request
                    connections.admins.forEach(adminWs => {
                        adminWs.send(JSON.stringify({
                            type: 'access_request',
                            requestId,
                            ...request
                        }));
                    });
                    
                    ws.send(JSON.stringify({
                        type: 'request_submitted',
                        requestId,
                        message: 'Access request sent to administrator. Please wait for approval.'
                    }));
                    break;
                    
                case 'approve_request':
                    const approveRequestId = data.requestId;
                    const accessCode = generateAccessCode();
                    const expiresAt = Date.now() + (30 * 60 * 1000); // 30 minutes
                    
                    if (connections.requests.has(approveRequestId)) {
                        connections.requests.get(approveRequestId).status = 'approved';
                        connections.requests.get(approveRequestId).accessCode = accessCode;
                        connections.requests.get(approveRequestId).expiresAt = expiresAt;
                        
                        // Find user connection and send approval
                        connections.users.forEach(userWs => {
                            if (userWs.requestId === approveRequestId) {
                                userWs.send(JSON.stringify({
                                    type: 'request_approved',
                                    accessCode,
                                    expiresAt,
                                    message: 'Access approved! You have 30 minutes of access.'
                                }));
                            }
                        });
                        
                        // Notify all admins about approval
                        connections.admins.forEach(adminWs => {
                            adminWs.send(JSON.stringify({
                                type: 'request_updated',
                                requestId: approveRequestId,
                                status: 'approved',
                                accessCode
                            }));
                        });
                    }
                    break;
                    
                case 'deny_request':
                    const denyRequestId = data.requestId;
                    
                    if (connections.requests.has(denyRequestId)) {
                        connections.requests.get(denyRequestId).status = 'denied';
                        
                        // Find user connection and send denial
                        connections.users.forEach(userWs => {
                            if (userWs.requestId === denyRequestId) {
                                userWs.send(JSON.stringify({
                                    type: 'request_denied',
                                    message: 'Access request denied by administrator.'
                                }));
                            }
                        });
                        
                        // Notify all admins about denial
                        connections.admins.forEach(adminWs => {
                            adminWs.send(JSON.stringify({
                                type: 'request_updated',
                                requestId: denyRequestId,
                                status: 'denied'
                            }));
                        });
                    }
                    break;
                    
                case 'validate_code':
                    const code = data.code;
                    let isValid = false;
                    
                    // Check if code exists and hasn't expired
                    connections.requests.forEach((request) => {
                        if (request.accessCode === code && 
                            request.status === 'approved' && 
                            Date.now() < request.expiresAt) {
                            isValid = true;
                        }
                    });
                    
                    ws.send(JSON.stringify({
                        type: 'code_validation',
                        valid: isValid,
                        message: isValid ? 'Access code valid' : 'Invalid or expired access code'
                    }));
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });
    
    ws.on('close', () => {
        connections.admins.delete(ws);
        connections.users.delete(ws);
        console.log('WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Clean up expired requests every 5 minutes
setInterval(() => {
    const now = Date.now();
    connections.requests.forEach((request, requestId) => {
        if (request.expiresAt && now > request.expiresAt) {
            connections.requests.delete(requestId);
        }
    });
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`🚀 GCC Access Control Server running on http://localhost:${PORT}`);
    console.log(`📱 Main App: http://localhost:${PORT}/`);
    console.log(`🔧 Admin Dashboard: http://localhost:${PORT}/admin.html`);
    console.log(`🎯 QR Generator: http://localhost:${PORT}/qr-generator.html`);
});