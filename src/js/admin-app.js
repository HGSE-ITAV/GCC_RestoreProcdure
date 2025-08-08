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

        const testModeBtn = document.getElementById('test-mode-btn');
        if (testModeBtn) {
            testModeBtn.addEventListener('click', () => this.generateTestRequest());
        }

        const clearAllBtn = document.getElementById('clear-all-btn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllRequests());
        }

        const importBtn = document.getElementById('import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importShareCode());
        }

        // Share code input enter key
        const shareCodeInput = document.getElementById('share-code-input');
        if (shareCodeInput) {
            shareCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.importShareCode();
                }
            });
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const operatorCode = document.getElementById('operator-code').value;
        const errorElement = document.getElementById('operator-auth-error');
        
        try {
            const isValid = await this.validateOperatorCode(operatorCode);
            
            if (isValid) {
                this.isAuthenticated = true;
                this.adminId = this.getAdminIdFromCode(operatorCode);
                
                console.log('✅ Operator authenticated:', this.adminId);
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

    handleLogout() {
        this.isAuthenticated = false;
        this.adminId = null;
        this.stopRequestsMonitoring();
        
        // Clear form
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
            return;
        }

        noRequestsElement.style.display = 'none';
        
        requestsList.innerHTML = requests.map(request => {
            return this.createRequestCard(request);
        }).join('');
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

    async generateTestRequest() {
        try {
            console.log('🧪 Generating test request...');
            const result = await window.dataService.generateTestRequest();
            
            if (result.success) {
                console.log('✅ Test request generated:', result.requestId);
                // Requests will be automatically updated via subscription
            } else {
                throw new Error(result.error || 'Failed to generate test request');
            }
        } catch (error) {
            console.error('❌ Error generating test request:', error);
            alert(`Failed to generate test request: ${error.message}`);
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

    importShareCode() {
        const shareCodeInput = document.getElementById('share-code-input');
        const shareCode = shareCodeInput.value.trim();
        
        if (!shareCode) {
            alert('Please enter a share code');
            return;
        }
        
        try {
            // This would need to be implemented in DataService
            console.log('📥 Importing share code:', shareCode);
            alert('Share code import feature coming soon!');
            shareCodeInput.value = '';
        } catch (error) {
            console.error('❌ Error importing share code:', error);
            alert(`Import failed: ${error.message}`);
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
