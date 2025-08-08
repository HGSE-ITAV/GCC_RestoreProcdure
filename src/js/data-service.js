// Data Service - Handles all data operations for GCC Restore Procedure
// Supports both Firebase (production) and localStorage (development/testing)

class DataService {
    constructor() {
        this.isFirebaseEnabled = false;
        this.db = null;
        this.storageKey = 'gcc_requests_data';
        
        console.log('🔧 DataService initializing...');
        this.initializeService();
    }

    async initializeService() {
        try {
            // Try to initialize Firebase
            if (typeof firebase !== 'undefined' && !this.isFirebaseEnabled) {
                // Import Firebase configuration
                const { firebaseConfig } = await import('../config/firebase-config.js');
                
                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                }
                
                this.db = firebase.database();
                this.isFirebaseEnabled = true;
                console.log('🔥 Firebase initialized successfully');
                
                // Test Firebase connection
                await this.testConnection();
            }
        } catch (error) {
            console.warn('⚠️ Firebase initialization failed, using localStorage:', error.message);
            this.isFirebaseEnabled = false;
            this.initializeLocalStorage();
        }
        
        if (!this.isFirebaseEnabled) {
            this.initializeLocalStorage();
        }
    }

    initializeLocalStorage() {
        console.log('💾 Using localStorage for data persistence');
        
        if (!localStorage.getItem(this.storageKey)) {
            const initialData = {
                requests: {},
                metadata: {
                    lastUpdated: Date.now(),
                    totalRequests: 0
                }
            };
            localStorage.setItem(this.storageKey, JSON.stringify(initialData));
        }
    }

    async testConnection() {
        if (this.isFirebaseEnabled) {
            try {
                const testRef = this.db.ref('.info/connected');
                const snapshot = await testRef.once('value');
                console.log('🔥 Firebase connection test:', snapshot.val() ? 'Connected' : 'Disconnected');
                return snapshot.val();
            } catch (error) {
                console.error('❌ Firebase connection test failed:', error);
                return false;
            }
        }
        return true; // localStorage is always "connected"
    }

    // === USER REQUEST OPERATIONS ===

    async submitRequest(requestData) {
        try {
            const request = {
                id: this.generateRequestId(),
                userName: requestData.userName,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                browserInfo: this.getBrowserInfo(),
                status: 'pending',
                token: requestData.token || null,
                ...requestData
            };

            if (this.isFirebaseEnabled) {
                await this.db.ref(`requests/${request.id}`).set(request);
                await this.db.ref('metadata/lastUpdated').set(Date.now());
                await this.db.ref('metadata/totalRequests').transaction((count) => (count || 0) + 1);
            } else {
                const data = this.getLocalData();
                data.requests[request.id] = request;
                data.metadata.lastUpdated = Date.now();
                data.metadata.totalRequests = Object.keys(data.requests).length;
                localStorage.setItem(this.storageKey, JSON.stringify(data));
            }

            console.log('✅ Request submitted:', request.id);
            return { success: true, requestId: request.id, request };
        } catch (error) {
            console.error('❌ Error submitting request:', error);
            return { success: false, error: error.message };
        }
    }

    async getRequestStatus(requestId) {
        try {
            if (this.isFirebaseEnabled) {
                const snapshot = await this.db.ref(`requests/${requestId}`).once('value');
                const request = snapshot.val();
                return {
                    status: request ? request.status : null,
                    found: !!request,
                    request: request || null
                };
            } else {
                const data = this.getLocalData();
                const request = data.requests[requestId];
                return {
                    status: request ? request.status : null,
                    found: !!request,
                    request: request || null
                };
            }
        } catch (error) {
            console.error('❌ Error getting request status:', error);
            return { status: null, found: false, request: null };
        }
    }

    async subscribeToRequestStatus(requestId, callback) {
        if (this.isFirebaseEnabled) {
            const requestRef = this.db.ref(`requests/${requestId}`);
            const unsubscribe = requestRef.on('value', (snapshot) => {
                const request = snapshot.val();
                callback({
                    status: request ? request.status : null,
                    found: !!request,
                    request: request || null
                });
            });
            
            return () => requestRef.off('value', unsubscribe);
        } else {
            // For localStorage, we'll poll for changes
            const pollInterval = setInterval(async () => {
                const result = await this.getRequestStatus(requestId);
                callback(result);
            }, 2000); // Poll every 2 seconds
            
            return () => clearInterval(pollInterval);
        }
    }

    // === ADMIN OPERATIONS ===

    async getPendingRequests() {
        try {
            if (this.isFirebaseEnabled) {
                const snapshot = await this.db.ref('requests').once('value');
                const requests = snapshot.val() || {};
                
                // Filter and format requests for admin dashboard
                const requestList = Object.values(requests)
                    .filter(request => this.shouldShowInDashboard(request))
                    .sort((a, b) => b.timestamp - a.timestamp);
                
                return requestList;
            } else {
                const data = this.getLocalData();
                const requests = Object.values(data.requests)
                    .filter(request => this.shouldShowInDashboard(request))
                    .sort((a, b) => b.timestamp - a.timestamp);
                
                return requests;
            }
        } catch (error) {
            console.error('❌ Error getting pending requests:', error);
            return [];
        }
    }

    shouldShowInDashboard(request) {
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        
        // Show pending requests
        if (request.status === 'pending') return true;
        
        // Show approved/granted requests
        if (request.status === 'approved' || request.status === 'granted') return true;
        
        // Show recently denied requests (for 5 minutes)
        if (request.status === 'denied') {
            return request.processedAt && request.processedAt > fiveMinutesAgo;
        }
        
        return false;
    }

    async processRequest(requestId, status, adminInfo = {}) {
        try {
            const updateData = {
                status: status,
                processedAt: Date.now(),
                processedBy: adminInfo.adminId || 'operator',
                ...adminInfo
            };

            if (this.isFirebaseEnabled) {
                await this.db.ref(`requests/${requestId}`).update(updateData);
                await this.db.ref('metadata/lastUpdated').set(Date.now());
                
                // Log admin action for audit
                await this.logAdminAction(requestId, status, adminInfo);
            } else {
                const data = this.getLocalData();
                if (data.requests[requestId]) {
                    Object.assign(data.requests[requestId], updateData);
                    data.metadata.lastUpdated = Date.now();
                    localStorage.setItem(this.storageKey, JSON.stringify(data));
                }
            }

            console.log(`✅ Request ${requestId} processed as ${status}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error processing request:', error);
            return { success: false, error: error.message };
        }
    }

    async subscribeToRequests(callback) {
        if (this.isFirebaseEnabled) {
            const requestsRef = this.db.ref('requests');
            const unsubscribe = requestsRef.on('value', async () => {
                const requests = await this.getPendingRequests();
                callback(requests);
            });
            
            return () => requestsRef.off('value', unsubscribe);
        } else {
            // For localStorage, poll for changes
            const pollInterval = setInterval(async () => {
                const requests = await this.getPendingRequests();
                callback(requests);
            }, 3000); // Poll every 3 seconds
            
            return () => clearInterval(pollInterval);
        }
    }

    async clearAllRequests() {
        try {
            if (this.isFirebaseEnabled) {
                await this.db.ref('requests').remove();
                await this.db.ref('metadata').update({
                    lastUpdated: Date.now(),
                    totalRequests: 0
                });
            } else {
                const emptyData = {
                    requests: {},
                    metadata: {
                        lastUpdated: Date.now(),
                        totalRequests: 0
                    }
                };
                localStorage.setItem(this.storageKey, JSON.stringify(emptyData));
            }
            
            console.log('🗑️ All requests cleared');
            return { success: true };
        } catch (error) {
            console.error('❌ Error clearing requests:', error);
            return { success: false, error: error.message };
        }
    }

    // === AUDIT LOGGING ===

    async logAdminAction(requestId, action, adminInfo) {
        if (this.isFirebaseEnabled) {
            const logEntry = {
                timestamp: Date.now(),
                requestId,
                action,
                adminId: adminInfo.adminId || 'operator',
                details: adminInfo
            };
            
            await this.db.ref('audit_log').push(logEntry);
        }
        // For localStorage, we could implement this too if needed
    }

    async getAuditLog(limit = 50) {
        if (this.isFirebaseEnabled) {
            const snapshot = await this.db.ref('audit_log')
                .orderByChild('timestamp')
                .limitToLast(limit)
                .once('value');
            
            const logs = snapshot.val() || {};
            return Object.values(logs).reverse(); // Most recent first
        }
        return []; // Not implemented for localStorage
    }

    // === UTILITY METHODS ===

    generateRequestId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `req_${timestamp}_${random}`;
    }

    getBrowserInfo() {
        return {
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            vendor: navigator.vendor,
            userAgent: navigator.userAgent.substring(0, 200) // Truncate for storage
        };
    }

    getLocalData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : { requests: {}, metadata: { lastUpdated: 0, totalRequests: 0 } };
        } catch (error) {
            console.error('❌ Error parsing local data:', error);
            return { requests: {}, metadata: { lastUpdated: 0, totalRequests: 0 } };
        }
    }

    // === TESTING UTILITIES ===

    async generateTestRequest() {
        const testNames = [
            'John Smith', 'Sarah Johnson', 'Mike Brown', 'Emily Davis', 
            'Chris Wilson', 'Amanda Miller', 'David Garcia', 'Lisa Martinez'
        ];
        
        const randomName = testNames[Math.floor(Math.random() * testNames.length)];
        
        const testRequest = {
            userName: randomName,
            token: 'test_token_' + Math.random().toString(36).substr(2, 9)
        };

        return await this.submitRequest(testRequest);
    }

    // === STATUS METHODS ===

    getServiceStatus() {
        return {
            backend: this.isFirebaseEnabled ? 'Firebase' : 'localStorage',
            connected: this.isFirebaseEnabled ? 'Yes' : 'Local',
            storageKey: this.storageKey
        };
    }
}

// Create global instance
window.dataService = new DataService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataService;
}
