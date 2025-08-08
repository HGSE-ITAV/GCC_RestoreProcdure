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
                console.log('🔍 Attempting Firebase initialization...');
                
                // Import Firebase configuration
                const { firebaseConfig } = await import('../config/firebase-config.js');
                
                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                    console.log('🔥 Firebase app initialized');
                }
                
                this.db = firebase.database();
                this.isFirebaseEnabled = true;
                console.log('🔥 Firebase database connected');
                
                // Test Firebase connection and permissions
                const connectionResult = await this.testConnection();
                if (!connectionResult) {
                    console.warn('⚠️ Firebase connection/permission test failed, falling back to localStorage');
                    this.isFirebaseEnabled = false;
                }
            }
        } catch (error) {
            console.warn('⚠️ Firebase initialization failed, using localStorage:', error.message);
            this.isFirebaseEnabled = false;
            this.initializeLocalStorage();
        }
        
        if (!this.isFirebaseEnabled) {
            this.initializeLocalStorage();
        }
        
        console.log(`🎯 DataService initialized - Using: ${this.isFirebaseEnabled ? 'Firebase' : 'localStorage'}`);
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
                // Test basic connection
                const testRef = this.db.ref('.info/connected');
                const snapshot = await testRef.once('value');
                const isConnected = snapshot.val();
                
                // Test write permissions to actual application paths that should be allowed
                try {
                    // Test writing to metadata path (which should be allowed)
                    const testWriteRef = this.db.ref('metadata/connectionTest');
                    await testWriteRef.set(Date.now());
                    await testWriteRef.remove(); // Clean up
                    console.log('🔥 Firebase: Connected with proper write permissions');
                    return true;
                } catch (permissionError) {
                    console.warn('⚠️ Firebase: Connected but no write permissions to metadata - will use localStorage fallback');
                    console.warn('Permission error:', permissionError.message);
                    this.isFirebaseEnabled = false; // Disable Firebase to force localStorage
                    return false;
                }
                
            } catch (error) {
                console.log('🔥 Firebase connection test: Offline or permission denied');
                console.warn('Connection error:', error.message);
                this.isFirebaseEnabled = false; // Disable Firebase to force localStorage
                return false;
            }
        }
        return true; // localStorage is always "connected"
    }

    // === USER REQUEST OPERATIONS ===

    async submitRequest(requestData) {
        try {
            console.log('📍 Gathering location and IP information...');
            
            // Collect enhanced user information
            const enhancedInfo = await this.collectEnhancedUserInfo();
            
            const request = {
                id: this.generateRequestId(),
                userName: requestData.userName,
                timestamp: Date.now(),
                dateTime: new Date().toLocaleString(),
                userAgent: navigator.userAgent,
                browserInfo: this.getBrowserInfo(),
                status: 'pending',
                token: requestData.token || null,
                ipAddress: enhancedInfo.ipAddress || 'Unknown',
                geolocation: enhancedInfo.geolocation || null,
                locationDetails: enhancedInfo.locationDetails || null,
                networkInfo: enhancedInfo.networkInfo || null,
                source: requestData.source || 'qr_code',
                ...requestData
            };

            console.log('📊 Complete request data:', request);

            // Sanitize request data to remove undefined values for Firebase
            const sanitizedRequest = this.removeUndefinedValues(request);

            if (this.isFirebaseEnabled) {
                try {
                    // TEMPORARY: Store requests under metadata path until Firebase rules are updated
                    // This is because requests/ path doesn't have write permissions yet
                    await this.db.ref(`metadata/requests/${sanitizedRequest.id}`).set(sanitizedRequest);
                    await this.db.ref('metadata/lastUpdated').set(Date.now());
                    await this.db.ref('metadata/totalRequests').transaction((count) => (count || 0) + 1);
                    console.log('✅ Request submitted to Firebase (metadata path):', sanitizedRequest.id);
                    return { success: true, requestId: sanitizedRequest.id, request: sanitizedRequest };
                } catch (firebaseError) {
                    console.warn('⚠️ Firebase submission failed, falling back to localStorage:', firebaseError.message);
                    
                    // Fall back to localStorage if Firebase fails
                    this.isFirebaseEnabled = false;
                    const data = this.getLocalData();
                    data.requests[sanitizedRequest.id] = sanitizedRequest;
                    data.metadata.lastUpdated = Date.now();
                    data.metadata.totalRequests = Object.keys(data.requests).length;
                    localStorage.setItem(this.storageKey, JSON.stringify(data));
                    
                    console.log('✅ Request submitted to localStorage (fallback):', sanitizedRequest.id);
                    return { success: true, requestId: sanitizedRequest.id, request: sanitizedRequest, mode: 'localStorage_fallback' };
                }
            } else {
                const data = this.getLocalData();
                data.requests[sanitizedRequest.id] = sanitizedRequest;
                data.metadata.lastUpdated = Date.now();
                data.metadata.totalRequests = Object.keys(data.requests).length;
                localStorage.setItem(this.storageKey, JSON.stringify(data));
                console.log('✅ Request submitted to localStorage:', sanitizedRequest.id);
                return { success: true, requestId: sanitizedRequest.id, request: sanitizedRequest, mode: 'localStorage' };
            }
        } catch (error) {
            console.error('❌ Error submitting request:', error);
            return { success: false, error: error.message };
        }
    }

    async getRequestStatus(requestId) {
        try {
            if (this.isFirebaseEnabled) {
                // TEMPORARY: Read from metadata/requests path
                const snapshot = await this.db.ref(`metadata/requests/${requestId}`).once('value');
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
            // TEMPORARY: Subscribe to metadata/requests path
            const requestRef = this.db.ref(`metadata/requests/${requestId}`);
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
                console.log('🔍 DEBUG: Fetching requests from Firebase (metadata/requests path)...');
                // TEMPORARY: Read from metadata/requests path
                const snapshot = await this.db.ref('metadata/requests').once('value');
                const requests = snapshot.val() || {};
                
                console.log('📊 DEBUG: Raw Firebase requests:', requests);
                console.log('📊 DEBUG: Request count:', Object.keys(requests).length);
                
                // Filter and format requests for admin dashboard
                const requestList = Object.values(requests)
                    .filter(request => this.shouldShowInDashboard(request))
                    .sort((a, b) => b.timestamp - a.timestamp);
                
                console.log('📊 DEBUG: Filtered dashboard requests:', requestList);
                console.log('📊 DEBUG: Dashboard request count:', requestList.length);
                
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
        
        console.log(`🔍 DEBUG: Checking request ${request.id} - Status: ${request.status}, Timestamp: ${request.timestamp}`);
        
        // Show pending requests
        if (request.status === 'pending') {
            console.log(`✅ DEBUG: Showing pending request ${request.id}`);
            return true;
        }
        
        // Show approved/granted requests
        if (request.status === 'approved' || request.status === 'granted') {
            console.log(`✅ DEBUG: Showing approved/granted request ${request.id}`);
            return true;
        }
        
        // Show recently denied requests (for 5 minutes)
        if (request.status === 'denied') {
            const show = request.processedAt && request.processedAt > fiveMinutesAgo;
            console.log(`${show ? '✅' : '❌'} DEBUG: Recently denied request ${request.id} - Show: ${show}`);
            return show;
        }
        
        console.log(`❌ DEBUG: Hiding request ${request.id} - Status: ${request.status}`);
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
                // TEMPORARY: Update request in metadata/requests path
                await this.db.ref(`metadata/requests/${requestId}`).update(updateData);
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
            // TEMPORARY: Subscribe to metadata/requests path
            const requestsRef = this.db.ref('metadata/requests');
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

    async collectEnhancedUserInfo() {
        const info = {
            ipAddress: null,
            geolocation: null,
            locationDetails: null,
            networkInfo: null
        };

        try {
            // Get public IP address
            console.log('🌐 Fetching public IP address...');
            const ipPromise = this.getPublicIP();
            
            // Get geolocation (with user permission)
            console.log('📍 Requesting geolocation...');
            const locationPromise = this.getGeolocation();
            
            // Get network connection info
            const networkInfo = this.getNetworkInfo();
            
            // Wait for all async operations
            const [ipData, geoData] = await Promise.allSettled([ipPromise, locationPromise]);
            
            if (ipData.status === 'fulfilled') {
                info.ipAddress = ipData.value.ip;
                info.locationDetails = ipData.value.location;
                console.log('✅ IP address obtained:', ipData.value.ip);
            } else {
                console.warn('⚠️ Failed to get IP address:', ipData.reason);
            }
            
            if (geoData.status === 'fulfilled') {
                info.geolocation = geoData.value;
                console.log('✅ Geolocation obtained:', geoData.value);
            } else {
                console.warn('⚠️ Failed to get geolocation:', geoData.reason);
            }
            
            info.networkInfo = networkInfo;
            
        } catch (error) {
            console.error('❌ Error collecting enhanced user info:', error);
        }

        return info;
    }

    async getPublicIP() {
        try {
            // Try multiple IP services for reliability
            const ipServices = [
                'https://api.ipify.org?format=json',
                'https://ipapi.co/json/',
                'https://ip-api.com/json/'
            ];
            
            for (const service of ipServices) {
                try {
                    const response = await fetch(service, { timeout: 5000 });
                    const data = await response.json();
                    
                    // Different services return IP in different fields
                    const ip = data.ip || data.query;
                    if (ip) {
                        return {
                            ip: ip,
                            location: {
                                country: data.country || data.country_name || null,
                                region: data.region || data.regionName || null,
                                city: data.city || null,
                                timezone: data.timezone || null,
                                isp: data.isp || data.org || null
                            }
                        };
                    }
                } catch (serviceError) {
                    console.warn(`⚠️ IP service ${service} failed:`, serviceError.message);
                    continue;
                }
            }
            
            throw new Error('All IP services failed');
        } catch (error) {
            console.error('❌ Error getting public IP:', error);
            throw error;
        }
    }

    async getGeolocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    });
                },
                (error) => {
                    console.warn('⚠️ Geolocation error:', error.message);
                    reject(error);
                },
                options
            );
        });
    }

    getNetworkInfo() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (connection) {
            return {
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt,
                saveData: connection.saveData
            };
        }
        
        return null;
    }

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
            userName: `DEBUG: ${randomName}`,
            token: 'debug_test_token_' + Math.random().toString(36).substr(2, 9),
            debugMode: true,
            timestamp: Date.now()
        };

        console.log('🧪 DEBUG: Creating test request:', testRequest);
        const result = await this.submitRequest(testRequest);
        console.log('🧪 DEBUG: Test request result:', result);
        
        return result;
    }

    // === STATUS METHODS ===

    getServiceStatus() {
        return {
            backend: this.isFirebaseEnabled ? 'Firebase' : 'localStorage',
            connected: this.isFirebaseEnabled ? 'Yes' : 'Local',
            storageKey: this.storageKey
        };
    }
    
    // Remove undefined values recursively from an object for Firebase compatibility
    removeUndefinedValues(obj) {
        if (obj === null || obj === undefined) {
            return null;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.removeUndefinedValues(item)).filter(item => item !== undefined);
        }
        
        if (typeof obj === 'object' && obj.constructor === Object) {
            const cleaned = {};
            for (const [key, value] of Object.entries(obj)) {
                const cleanedValue = this.removeUndefinedValues(value);
                if (cleanedValue !== undefined) {
                    cleaned[key] = cleanedValue;
                }
            }
            return cleaned;
        }
        
        return obj;
    }
}

// Create global instance
window.dataService = new DataService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataService;
}
