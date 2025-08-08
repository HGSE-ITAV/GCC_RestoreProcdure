// Admin Dashboard Application - Handles operator approval/denial interface
// Integrates with DataService for Firebase/localStorage operations

class AdminApp {
    constructor() {
        this.isAuthenticated = false;
        this.requestsSubscription = null;
        this.refreshInterval = null;
        this.adminId = null;
        
        console.log('🔧 AdminApp initializing...');
        this.initializeApp();
    }

    async initializeApp() {
        // Wait for DataService to be ready
        if (!window.dataService) {
            setTimeout(() => this.initializeApp(), 100);
            return;
        }

        await this.setupEventListeners();
        this.showLoginScreen();
        
        console.log('✅ AdminApp initialized');
    }

    async setupEventListeners() {
        // Operator login
        const loginForm = document.getElementById('operator-login');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('operator-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Dashboard action buttons
        const refreshBtn = document.getElementById('refresh-requests');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadRequests());
        }

        const clearAllBtn = document.getElementById('clear-all-btn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllRequests());
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const operatorCode = document.getElementById('operator-code').value.trim();
        const errorElement = document.getElementById('operator-auth-error');
        
        console.log('🔍 Login attempt with code:', `"${operatorCode}"`, 'Length:', operatorCode.length);
        
        try {
            const isValid = await this.validateOperatorCode(operatorCode);
            
            if (isValid) {
                this.currentOperator = this.getAdminIdFromCode(operatorCode);
                this.isAuthenticated = true;
                
                console.log('✅ Authentication successful for:', this.currentOperator);
                
                // Clear any error messages
                errorElement.style.display = 'none';
                
                // Proceed directly to dashboard
                this.showDashboard();
                await this.loadRequests();
                this.startRequestsMonitoring();
            } else {
                throw new Error('Invalid operator code');
            }
        } catch (error) {
            console.error('❌ Login failed:', error);
            errorElement.textContent = error.message;
            errorElement.style.display = 'block';
        }
    }

    async validateOperatorCode(code) {
        // Simple validation - in production this would be more sophisticated
        const validCodes = [
            'gcc2024', 'operator123', 'admin2024', 'restore_admin',
            'conference_admin', 'itav_operator'
        ];
        
        console.log('🔍 Validating code:', `"${code}"`, 'Valid codes:', validCodes);
        console.log('🔍 Code includes check:', validCodes.includes(code));
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return validCodes.includes(code);
    }

    getAdminIdFromCode(code) {
        const codeMap = {
            'gcc2024': 'gcc_admin',
            'operator123': 'main_operator',
            'admin2024': 'system_admin',
            'restore_admin': 'restore_operator',
            'conference_admin': 'conference_admin',
            'itav_operator': 'itav_admin'
        };
        
        return codeMap[code] || 'unknown_admin';
    }

    // Handle operator logout
    async handleLogout() {
        this.isAuthenticated = false;
        this.currentOperator = null;
        this.stopRequestsMonitoring();
        
        // Clear forms
        document.getElementById('operator-code').value = '';
        document.getElementById('operator-auth-error').style.display = 'none';
        
        this.showLoginScreen();
        console.log('👋 Operator logged out');
    }

    async loadRequests() {
        try {
            console.log('📋 Loading pending requests...');
            const requests = await window.dataService.getPendingRequests();
            this.displayRequests(requests);
            console.log(`📊 Loaded ${requests.length} requests`);
        } catch (error) {
            console.error('❌ Error loading requests:', error);
            this.displayRequests([]);
        }
    }

    displayRequests(requests) {
        const requestsList = document.getElementById('requests-list');
        const noRequestsElement = document.getElementById('no-requests');
        
        if (requests.length === 0) {
            requestsList.innerHTML = '';
            noRequestsElement.style.display = 'block';
            this.updateRequestCountBadge(0);
            return;
        }

        noRequestsElement.style.display = 'none';
        this.updateRequestCountBadge(requests.length);
        
        // Check for new requests and show notifications
        this.checkForNewRequests(requests);
        
        requestsList.innerHTML = requests.map(request => {
            return this.createRequestCard(request);
        }).join('');
    }

    checkForNewRequests(currentRequests) {
        if (!this.lastKnownRequests) {
            this.lastKnownRequests = currentRequests;
            return;
        }
        
        // Find truly new requests (not just updates)
        const newRequests = currentRequests.filter(current => 
            !this.lastKnownRequests.some(last => last.id === current.id)
        );
        
        // Show notification for new requests
        newRequests.forEach(request => {
            this.showNewRequestNotification(request);
            this.playNotificationSound();
        });
        
        this.lastKnownRequests = currentRequests;
    }

    showNewRequestNotification(request) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'new-request-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-bell"></i>
                <strong>New Access Request</strong>
                <p>${request.userName} is requesting access</p>
                <div class="notification-actions">
                    <button onclick="adminApp.approveRequest('${request.id}')" class="mini-approve-btn">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button onclick="adminApp.denyRequest('${request.id}')" class="mini-deny-btn">
                        <i class="fas fa-times"></i> Deny
                    </button>
                </div>
            </div>
        `;
        
        // Add styles if not already added
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .new-request-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(45deg, #2ecc71, #27ae60);
                    color: white;
                    padding: 1rem;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    z-index: 10000;
                    max-width: 320px;
                    animation: slideInRight 0.5s ease-out;
                    font-family: 'Source Code Pro', monospace;
                }
                
                .notification-content strong {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-size: 1.1rem;
                }
                
                .notification-actions {
                    margin-top: 1rem;
                    display: flex;
                    gap: 0.5rem;
                }
                
                .mini-approve-btn, .mini-deny-btn {
                    padding: 4px 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-family: 'Source Code Pro', monospace;
                    transition: all 0.2s ease;
                }
                
                .mini-approve-btn {
                    background: rgba(255,255,255,0.2);
                    color: white;
                }
                
                .mini-deny-btn {
                    background: rgba(231,76,60,0.8);
                    color: white;
                }
                
                .mini-approve-btn:hover {
                    background: rgba(255,255,255,0.3);
                }
                
                .mini-deny-btn:hover {
                    background: rgba(231,76,60,1);
                }
                
                .request-count-badge {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: #e74c3c;
                    color: white;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8rem;
                    font-weight: bold;
                    animation: pulse 2s infinite;
                }
                
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 10000);
    }

    updateRequestCountBadge(count) {
        const header = document.querySelector('.dashboard-header h2');
        if (!header) return;
        
        // Remove existing badge
        const existingBadge = header.querySelector('.request-count-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Add new badge if there are pending requests
        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'request-count-badge';
            badge.textContent = count;
            header.style.position = 'relative';
            header.appendChild(badge);
        }
    }

    playNotificationSound() {
        // Create a simple notification sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('Audio notification not available');
        }
    }

    createRequestCard(request) {
        let actionButtons = this.getActionButtons(request);
        let statusClass = `status-${request.status}`;
        
        // Format geolocation if available
        let locationInfo = '';
        if (request.geolocation) {
            locationInfo = `
                <p><strong>📍 Location:</strong> ${request.geolocation.latitude.toFixed(4)}, ${request.geolocation.longitude.toFixed(4)} (±${request.geolocation.accuracy}m)</p>
            `;
        }
        
        // Format IP location if available
        let ipLocationInfo = '';
        if (request.locationDetails) {
            const loc = request.locationDetails;
            ipLocationInfo = `
                <p><strong>🌐 IP Location:</strong> ${loc.city || 'Unknown'}, ${loc.region || 'Unknown'}, ${loc.country || 'Unknown'}</p>
                ${loc.isp ? `<p><strong>🏢 ISP:</strong> ${loc.isp}</p>` : ''}
                ${loc.timezone ? `<p><strong>🕐 Timezone:</strong> ${loc.timezone}</p>` : ''}
            `;
        }

        // Format network info if available
        let networkInfo = '';
        if (request.networkInfo) {
            const net = request.networkInfo;
            networkInfo = `
                <p><strong>📶 Connection:</strong> ${net.effectiveType || 'Unknown'}</p>
            `;
        }
        
        return `
            <div class="request-card" data-id="${request.id}">
                <div class="request-header">
                    <h3><i class="fas fa-user"></i> ${request.userName}</h3>
                    <span class="request-time">${request.dateTime || new Date(request.timestamp).toLocaleString()}</span>
                </div>
                <div class="request-details">
                    <div class="detail-section">
                        <h4><i class="fas fa-info-circle"></i> Request Info</h4>
                        <p><strong>Status:</strong> <span class="${statusClass}">${request.status.toUpperCase()}</span></p>
                        <p><strong>Request ID:</strong> ${request.id}</p>
                        <p><strong>Source:</strong> ${request.source || 'Unknown'} ${request.qrToken ? '(QR Code)' : ''}</p>
                        <p><strong>Token:</strong> ${request.token || 'None'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h4><i class="fas fa-globe"></i> Network & Location</h4>
                        <p><strong>🌐 IP Address:</strong> ${request.ipAddress || 'Unknown'}</p>
                        ${ipLocationInfo}
                        ${locationInfo}
                        ${networkInfo}
                    </div>
                    
                    <div class="detail-section">
                        <h4><i class="fas fa-desktop"></i> Device Info</h4>
                        <p><strong>Platform:</strong> ${request.browserInfo?.platform || 'Unknown'}</p>
                        <p><strong>Browser:</strong> ${this.getBrowserName(request.userAgent)}</p>
                        <p><strong>Language:</strong> ${request.browserInfo?.language || 'Unknown'}</p>
                    </div>
                    
                    ${request.processedAt ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-history"></i> Processing Info</h4>
                        <p><strong>Processed:</strong> ${new Date(request.processedAt).toLocaleString()}</p>
                        <p><strong>Processed By:</strong> ${request.processedBy}</p>
                    </div>
                    ` : ''}
                </div>
                <div class="request-actions">
                    ${actionButtons}
                </div>
            </div>
        `;
    }

    getBrowserName(userAgent) {
        if (!userAgent) return 'Unknown';
        
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        if (userAgent.includes('Opera')) return 'Opera';
        
        return 'Other';
    }

    getActionButtons(request) {
        switch (request.status) {
            case 'pending':
                return `
                    <button class="approve-btn" onclick="adminApp.approveRequest('${request.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="deny-btn" onclick="adminApp.denyRequest('${request.id}')">
                        <i class="fas fa-times"></i> Deny
                    </button>
                `;
                
            case 'approved':
                return `
                    <div class="status-message">
                        <i class="fas fa-check-circle"></i> Approved - Waiting for procedure access grant
                    </div>
                    <button class="grant-access-btn" onclick="adminApp.grantAccess('${request.id}')">
                        <i class="fas fa-key"></i> Grant Procedure Access
                    </button>
                    <button class="revoke-btn" onclick="adminApp.revokeAccess('${request.id}')">
                        <i class="fas fa-ban"></i> Revoke
                    </button>
                `;
                
            case 'granted':
                return `
                    <div class="status-message granted">
                        <i class="fas fa-unlock"></i> Full Access Granted - User can proceed
                    </div>
                    <button class="revoke-btn" onclick="adminApp.revokeAccess('${request.id}')">
                        <i class="fas fa-ban"></i> Revoke Access
                    </button>
                `;
                
            case 'denied':
                return `
                    <div class="status-message denied">
                        <i class="fas fa-times-circle"></i> Access Denied
                    </div>
                    <button class="reactivate-btn" onclick="adminApp.reactivateRequest('${request.id}')">
                        <i class="fas fa-redo"></i> Reactivate
                    </button>
                `;
                
            default:
                return `<div class="status-message">Unknown status: ${request.status}</div>`;
        }
    }

    async approveRequest(requestId) {
        await this.processRequest(requestId, 'approved', 'Approving request');
    }

    async denyRequest(requestId) {
        if (confirm('Are you sure you want to deny this request?')) {
            await this.processRequest(requestId, 'denied', 'Denying request');
        }
    }

    async grantAccess(requestId) {
        if (confirm('Grant this user full access to the restoration procedure?')) {
            await this.processRequest(requestId, 'granted', 'Granting procedure access');
        }
    }

    async revokeAccess(requestId) {
        if (confirm('Are you sure you want to revoke access for this user?')) {
            await this.processRequest(requestId, 'denied', 'Revoking access');
        }
    }

    async reactivateRequest(requestId) {
        if (confirm('Reactivate this request as pending?')) {
            await this.processRequest(requestId, 'pending', 'Reactivating request');
        }
    }

    async processRequest(requestId, status, actionDescription) {
        try {
            console.log(`🔄 ${actionDescription}:`, requestId);
            
            const adminInfo = {
                adminId: this.adminId,
                action: status,
                timestamp: Date.now()
            };
            
            const result = await window.dataService.processRequest(requestId, status, adminInfo);
            
            if (result.success) {
                console.log(`✅ Request ${requestId} processed as ${status}`);
                // Requests will be automatically updated via subscription
            } else {
                throw new Error(result.error || 'Processing failed');
            }
        } catch (error) {
            console.error('❌ Error processing request:', error);
            alert(`Failed to process request: ${error.message}`);
        }
    }

    startRequestsMonitoring() {
        console.log('👀 Starting requests monitoring...');
        
        this.requestsSubscription = window.dataService.subscribeToRequests(
            (requests) => this.displayRequests(requests)
        );
        
        // Also set up periodic refresh as backup
        this.refreshInterval = setInterval(() => {
            this.loadRequests();
        }, 30000); // Refresh every 30 seconds
    }

    stopRequestsMonitoring() {
        if (this.requestsSubscription) {
            this.requestsSubscription();
            this.requestsSubscription = null;
            console.log('⏹️ Requests monitoring stopped');
        }
        
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    async clearAllRequests() {
        if (confirm('Are you sure you want to clear all requests? This will remove both pending and processed requests.')) {
            try {
                console.log('🗑️ Clearing all requests...');
                const result = await window.dataService.clearAllRequests();
                
                if (result.success) {
                    console.log('✅ All requests cleared');
                    // Requests will be automatically updated via subscription
                } else {
                    throw new Error(result.error || 'Failed to clear requests');
                }
            } catch (error) {
                console.error('❌ Error clearing requests:', error);
                alert(`Failed to clear requests: ${error.message}`);
            }
        }
    }

    // === UI STATE MANAGEMENT ===

    showLoginScreen() {
        document.getElementById('operator-auth').style.display = 'block';
        document.getElementById('operator-dashboard').style.display = 'none';
        
        // Focus on password input
        setTimeout(() => {
            const codeInput = document.getElementById('operator-code');
            if (codeInput) codeInput.focus();
        }, 100);
    }

    showDashboard() {
        document.getElementById('operator-auth').style.display = 'none';
        document.getElementById('operator-mfa').style.display = 'none';
        document.getElementById('operator-dashboard').style.display = 'block';
    }

    // === UTILITY METHODS ===

    getAppStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            adminId: this.adminId,
            hasRequestsSubscription: !!this.requestsSubscription,
            hasRefreshInterval: !!this.refreshInterval,
            dataService: window.dataService ? window.dataService.getServiceStatus() : null
        };
    }

    async getAuditLog() {
        try {
            const auditLog = await window.dataService.getAuditLog();
            console.table(auditLog);
            return auditLog;
        } catch (error) {
            console.error('❌ Error getting audit log:', error);
            return [];
        }
    }
}

// Make adminApp globally available for onclick handlers
window.adminApp = null;

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminApp();
});

// Export for testing/debugging
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminApp;
}
