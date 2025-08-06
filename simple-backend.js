// Ultra-simple cross-network backend using localStorage + display instructions
class SimpleBackend {
    constructor() {
        this.storageKey = 'gcc_demo_requests';
        console.log('🔧 SimpleBackend initialized');
        
        // Initialize empty data if not exists
        if (!localStorage.getItem(this.storageKey)) {
            const initialData = {
                pending: [],
                processed: [],
                lastUpdated: Date.now()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(initialData));
        }
    }

    async submitRequest(request) {
        try {
            console.log('📤 Submitting request:', request.userName);
            
            const data = this.getCurrentData();
            data.pending.push(request);
            data.lastUpdated = Date.now();
            
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            
            // Display instructions to user about sharing the request
            this.showSharingInstructions(request);
            
            console.log('✅ Request submitted successfully');
            return { success: true, requestId: request.id };
        } catch (error) {
            console.error('❌ Error submitting request:', error);
            return { success: false, error: error.message };
        }
    }

    async checkRequestStatus(requestId) {
        try {
            const data = this.getCurrentData();
            
            const processed = data.processed.find(r => r.id === requestId);
            if (processed) {
                return { status: processed.status, found: true };
            }
            
            const pending = data.pending.find(r => r.id === requestId);
            if (pending) {
                return { status: 'pending', found: true };
            }
            
            return { status: null, found: false };
        } catch (error) {
            console.error('Error checking request status:', error);
            return { status: null, found: false };
        }
    }

    async getPendingRequests() {
        try {
            const data = this.getCurrentData();
            // Return requests that need operator visibility:
            // - pending: need approval/denial  
            // - approved: need access grant
            // - granted: show status and allow revocation
            // - denied: show recent denials (last 5 minutes)
            const pending = data.pending || [];
            const processed = data.processed || [];
            
            const now = Date.now();
            const fiveMinutesAgo = now - (5 * 60 * 1000);
            
            const activeRequests = processed.filter(r => {
                if (r.status === 'approved' || r.status === 'granted') {
                    return true;
                }
                if (r.status === 'denied') {
                    // Show denied requests for 5 minutes after processing
                    return r.processedAt && r.processedAt > fiveMinutesAgo;
                }
                return false;
            });
            
            // Combine and sort by timestamp (newest first)
            const allOperatorRequests = [...pending, ...activeRequests];
            allOperatorRequests.sort((a, b) => b.timestamp - a.timestamp);
            
            return allOperatorRequests;
        } catch (error) {
            console.error('Error getting pending requests:', error);
            return [];
        }
    }

    async processRequest(requestId, status) {
        try {
            console.log(`🔄 Processing request ${requestId} as ${status}`);
            
            const data = this.getCurrentData();
            
            // Look for request in pending array first
            let requestIndex = data.pending.findIndex(r => r.id === requestId);
            let request;
            let fromPending = true;
            
            if (requestIndex !== -1) {
                // Found in pending array
                request = data.pending[requestIndex];
            } else {
                // Look in processed array (for already approved requests)
                requestIndex = data.processed.findIndex(r => r.id === requestId);
                if (requestIndex !== -1) {
                    request = data.processed[requestIndex];
                    fromPending = false;
                } else {
                    throw new Error('Request not found');
                }
            }
            
            // Update request status
            request.status = status;
            request.processedAt = Date.now();
            
            // Handle array movement
            if (fromPending) {
                // Moving from pending to processed
                data.processed.push(request);
                data.pending.splice(requestIndex, 1);
            }
            // If already in processed array, just update it in place
            
            data.lastUpdated = Date.now();
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            
            console.log(`✅ Request ${requestId} processed as ${status}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error processing request:', error);
            return { success: false, error: error.message };
        }
    }

    async clearAllRequests() {
        try {
            const emptyData = {
                pending: [],
                processed: [],
                lastUpdated: Date.now()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(emptyData));
            return { success: true };
        } catch (error) {
            console.error('Error clearing requests:', error);
            return { success: false, error: error.message };
        }
    }

    getCurrentData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : { pending: [], processed: [], lastUpdated: 0 };
        } catch (error) {
            console.error('Error parsing stored data:', error);
            return { pending: [], processed: [], lastUpdated: 0 };
        }
    }

    showSharingInstructions(request) {
        // Create a shareable data snippet
        const shareData = {
            id: request.id,
            userName: request.userName,
            timestamp: request.timestamp,
            shareCode: this.generateShareCode(request)
        };
        
        console.log('📋 Share this data with the operator:');
        console.log('Share Code:', shareData.shareCode);
        console.log('User Name:', shareData.userName);
        console.log('Request ID:', shareData.id);
        
        // You could also display this in the UI
    }

    generateShareCode(request) {
        // Generate a simple share code from request data
        const code = btoa(JSON.stringify({
            id: request.id,
            userName: request.userName,
            timestamp: request.timestamp
        })).substring(0, 12);
        return code;
    }

    // For operator dashboard - import request by share code
    importRequestByShareCode(shareCode) {
        try {
            const decoded = JSON.parse(atob(shareCode + '=='.repeat((4 - shareCode.length % 4) % 4)));
            
            const data = this.getCurrentData();
            
            // Check if already exists
            const exists = data.pending.find(r => r.id === decoded.id) || 
                          data.processed.find(r => r.id === decoded.id);
            
            if (!exists) {
                const request = {
                    id: decoded.id,
                    userName: decoded.userName,
                    timestamp: decoded.timestamp,
                    userAgent: 'Imported via share code',
                    browserInfo: 'Shared Request',
                    status: 'pending'
                };
                
                data.pending.push(request);
                data.lastUpdated = Date.now();
                localStorage.setItem(this.storageKey, JSON.stringify(data));
                
                console.log('✅ Request imported successfully');
                return { success: true, request };
            } else {
                return { success: false, error: 'Request already exists' };
            }
        } catch (error) {
            console.error('Error importing request:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create global instance  
window.githubBackend = new SimpleBackend();