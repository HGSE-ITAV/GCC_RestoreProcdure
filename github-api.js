// GitHub API service for GCC Restore approval system
class GitHubBackend {
    constructor() {
        this.owner = 'HGSE-ITAV';
        this.repo = 'GCC_RestoreProcdure';
        this.dataPath = 'data/requests.json';
        this.apiBase = 'https://api.github.com';
        
        // Rate limiting
        this.lastRequest = 0;
        this.minInterval = 2000; // 2 seconds between requests
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
            console.error('GitHub API request failed:', error);
            throw error;
        }
    }

    async getCurrentData() {
        try {
            const url = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/master/${this.dataPath}?t=${Date.now()}`;
            const response = await this.rateLimitedFetch(url);
            
            if (!response.ok) {
                console.warn('Could not fetch current data, using defaults');
                return { pending: [], processed: [], lastUpdated: 0 };
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error getting current data:', error);
            return { pending: [], processed: [], lastUpdated: 0 };
        }
    }

    async submitRequest(request) {
        try {
            console.log('📤 Submitting request to GitHub backend:', request.userName);
            
            // Get current data
            const currentData = await this.getCurrentData();
            
            // Add new request
            currentData.pending.push(request);
            currentData.lastUpdated = Date.now();
            
            // For now, we'll simulate storage by using localStorage as fallback
            // In production, this would require a GitHub token and commit API
            localStorage.setItem('gcc_github_requests', JSON.stringify(currentData));
            
            console.log('✅ Request submitted successfully');
            return { success: true, requestId: request.id };
        } catch (error) {
            console.error('❌ Error submitting request:', error);
            return { success: false, error: error.message };
        }
    }

    async checkRequestStatus(requestId) {
        try {
            // For demo purposes, check localStorage first, then fallback to GitHub
            const localData = JSON.parse(localStorage.getItem('gcc_github_requests') || 'null');
            
            if (localData) {
                const processed = localData.processed.find(r => r.id === requestId);
                if (processed) {
                    return { status: processed.status, found: true };
                }
                
                const pending = localData.pending.find(r => r.id === requestId);
                if (pending) {
                    return { status: 'pending', found: true };
                }
            }
            
            // Fallback to GitHub data
            const githubData = await this.getCurrentData();
            const processed = githubData.processed.find(r => r.id === requestId);
            if (processed) {
                return { status: processed.status, found: true };
            }
            
            const pending = githubData.pending.find(r => r.id === requestId);
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
            // Check localStorage first for real-time updates
            const localData = JSON.parse(localStorage.getItem('gcc_github_requests') || 'null');
            if (localData) {
                return localData.pending || [];
            }
            
            // Fallback to GitHub
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
            const localData = JSON.parse(localStorage.getItem('gcc_github_requests') || 'null') || await this.getCurrentData();
            
            // Find and move request
            const requestIndex = localData.pending.findIndex(r => r.id === requestId);
            if (requestIndex === -1) {
                throw new Error('Request not found');
            }
            
            const request = localData.pending[requestIndex];
            request.status = status;
            request.processedAt = Date.now();
            
            // Move to processed
            localData.processed.push(request);
            localData.pending.splice(requestIndex, 1);
            localData.lastUpdated = Date.now();
            
            // Save locally for immediate updates
            localStorage.setItem('gcc_github_requests', JSON.stringify(localData));
            
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
            localStorage.setItem('gcc_github_requests', JSON.stringify(emptyData));
            return { success: true };
        } catch (error) {
            console.error('Error clearing requests:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create global instance
window.githubBackend = new GitHubBackend();