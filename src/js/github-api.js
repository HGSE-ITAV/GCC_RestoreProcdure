// Simple cross-network backend using a combination of localStorage and Pastebin
class ExternalBackend {
    constructor() {
        // Using multiple fallback methods for maximum reliability
        this.pastebinUrl = 'https://pastebin.com/raw/gcc_requests'; // Public pastebin for sharing
        this.localStorageKey = 'gcc_shared_requests';
        
        // For demo - we'll simulate cross-network by using a shared ID
        this.sharedId = 'gcc_demo_' + Math.floor(Date.now() / 300000); // Changes every 5 minutes
        
        console.log('🔧 ExternalBackend initialized with shared ID:', this.sharedId);
        
        // Set up cross-tab communication
        this.setupCrossTabSync();
    }

    async rateLimitedFetch(url, options = {}) {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequest;
        
        if (timeSinceLastRequest < this.minInterval) {
            await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastRequest));
        }
        
        this.lastRequest = Date.now();
        
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error) {
            console.error('External API request failed:', error);
            throw error;
        }
    }

    async getCurrentData() {
        try {
            const url = `${this.apiBase}/b/${this.binId}/latest`;
            const response = await this.rateLimitedFetch(url, {
                method: 'GET',
                headers: {
                    'X-Master-Key': this.masterKey
                }
            });
            
            if (!response.ok) {
                console.warn('Could not fetch current data, using defaults');
                return { pending: [], processed: [], lastUpdated: 0 };
            }
            
            const result = await response.json();
            return result.record || { pending: [], processed: [], lastUpdated: 0 };
        } catch (error) {
            console.error('Error getting current data:', error);
            return { pending: [], processed: [], lastUpdated: 0 };
        }
    }

    async submitRequest(request) {
        try {
            console.log('📤 Submitting request to external backend:', request.userName);
            
            // Get current data
            const currentData = await this.getCurrentData();
            
            // Add new request
            currentData.pending.push(request);
            currentData.lastUpdated = Date.now();
            
            // Update external storage
            const url = `${this.apiBase}/b/${this.binId}`;
            const response = await this.rateLimitedFetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.masterKey
                },
                body: JSON.stringify(currentData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            console.log('✅ Request submitted successfully');
            return { success: true, requestId: request.id };
        } catch (error) {
            console.error('❌ Error submitting request:', error);
            return { success: false, error: error.message };
        }
    }

    async checkRequestStatus(requestId) {
        try {
            const data = await this.getCurrentData();
            
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
            return { status: null, found: false, error: error.message };
        }
    }

    async getPendingRequests() {
        try {
            const data = await this.getCurrentData();
            return data.pending || [];
        } catch (error) {
            console.error('Error getting pending requests:', error);
            return [];
        }
    }

    async processRequest(requestId, status) {
        try {
            console.log(`🔄 Processing request ${requestId} as ${status}`);
            
            // Get current data
            const data = await this.getCurrentData();
            
            // Find and move request
            const requestIndex = data.pending.findIndex(r => r.id === requestId);
            if (requestIndex === -1) {
                throw new Error('Request not found');
            }
            
            const request = data.pending[requestIndex];
            request.status = status;
            request.processedAt = Date.now();
            
            // Move to processed
            data.processed.push(request);
            data.pending.splice(requestIndex, 1);
            data.lastUpdated = Date.now();
            
            // Update external storage
            const url = `${this.apiBase}/b/${this.binId}`;
            const response = await this.rateLimitedFetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.masterKey
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            console.log(`✅ Request ${requestId} processed as ${status}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error processing request:', error);
            return { success: false, error: error.message };
        }
    }

    async clearAllRequests() {
        try {
            const emptyData = { pending: [], processed: [], lastUpdated: Date.now() };
            
            // Update external storage
            const url = `${this.apiBase}/b/${this.binId}`;
            const response = await this.rateLimitedFetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.masterKey
                },
                body: JSON.stringify(emptyData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Error clearing requests:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create global instance
window.githubBackend = new ExternalBackend();