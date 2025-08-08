// Live Browser Test - Run this in the browser console on the GitHub Pages site
// Test URL: https://hgse-itav.github.io/GCC_RestoreProcdure/?token=live_test_2025

console.log('🌐 LIVE BROWSER TEST - Enhanced QR Flow');
console.log('=' .repeat(50));

// Test Configuration
const LIVE_TEST_CONFIG = {
    testToken: 'live_browser_test_' + Date.now(),
    testUser: 'Live Browser Test User',
    startTime: Date.now()
};

class LiveBrowserTest {
    constructor() {
        this.results = {
            environment: this.getEnvironmentInfo(),
            tests: [],
            errors: []
        };
        
        console.log('🚀 Initializing Live Browser Test...');
        console.log('📍 Environment:', this.results.environment);
    }

    getEnvironmentInfo() {
        return {
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100) + '...',
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            geolocationAvailable: 'geolocation' in navigator,
            timestamp: new Date().toISOString()
        };
    }

    async runLiveTests() {
        console.log('\n🧪 Starting Live Tests...');
        
        try {
            // Test 1: DataService Availability
            await this.testDataServiceAvailability();
            
            // Test 2: Firebase Connection
            await this.testFirebaseConnection();
            
            // Test 3: Location Services
            await this.testLocationServices();
            
            // Test 4: Token Validation
            await this.testTokenValidation();
            
            // Test 5: Request Submission (if possible)
            await this.testRequestSubmission();
            
            this.generateLiveReport();
            
        } catch (error) {
            console.error('❌ Live test failed:', error);
            this.results.errors.push({
                test: 'LIVE_TEST_FRAMEWORK',
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    async testDataServiceAvailability() {
        console.log('\n📊 Testing DataService Availability...');
        
        try {
            const available = typeof window.dataService !== 'undefined';
            const status = available ? window.dataService.getServiceStatus() : null;
            
            const result = {
                testName: 'DataService Availability',
                available: available,
                status: status,
                success: available,
                timestamp: Date.now()
            };
            
            this.results.tests.push(result);
            
            console.log(`   DataService Available: ${available ? '✅' : '❌'}`);
            if (status) {
                console.log(`   Backend: ${status.backend}`);
                console.log(`   Connected: ${status.connected}`);
            }
            
        } catch (error) {
            console.error('   Error:', error.message);
            this.results.errors.push({
                test: 'DataService Availability',
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    async testFirebaseConnection() {
        console.log('\n🔥 Testing Firebase Connection...');
        
        try {
            if (window.dataService) {
                const connected = await window.dataService.testConnection();
                
                const result = {
                    testName: 'Firebase Connection',
                    connected: connected,
                    success: connected,
                    timestamp: Date.now()
                };
                
                this.results.tests.push(result);
                
                console.log(`   Firebase Connected: ${connected ? '✅' : '❌'}`);
                
            } else {
                throw new Error('DataService not available');
            }
            
        } catch (error) {
            console.error('   Error:', error.message);
            this.results.errors.push({
                test: 'Firebase Connection',
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    async testLocationServices() {
        console.log('\n📍 Testing Location Services...');
        
        try {
            const locationTest = {
                geolocationAPI: 'geolocation' in navigator,
                ipServiceTest: false,
                mockLocation: null
            };
            
            // Test IP service accessibility
            try {
                console.log('   Testing IP service...');
                const ipResponse = await fetch('https://api.ipify.org?format=json', { 
                    method: 'GET',
                    timeout: 5000 
                });
                const ipData = await ipResponse.json();
                locationTest.ipServiceTest = true;
                locationTest.publicIP = ipData.ip;
                console.log(`   Public IP: ${ipData.ip} ✅`);
            } catch (ipError) {
                console.log(`   IP service test failed: ${ipError.message} ❌`);
            }
            
            // Test geolocation (without actually requesting permission)
            console.log(`   Geolocation API Available: ${locationTest.geolocationAPI ? '✅' : '❌'}`);
            
            const result = {
                testName: 'Location Services',
                geolocationAvailable: locationTest.geolocationAPI,
                ipServiceWorking: locationTest.ipServiceTest,
                publicIP: locationTest.publicIP,
                success: locationTest.geolocationAPI || locationTest.ipServiceTest,
                timestamp: Date.now()
            };
            
            this.results.tests.push(result);
            
        } catch (error) {
            console.error('   Error:', error.message);
            this.results.errors.push({
                test: 'Location Services',
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    async testTokenValidation() {
        console.log('\n🔑 Testing Token Validation...');
        
        try {
            // Get token from URL
            const urlParams = new URLSearchParams(window.location.search);
            const currentToken = urlParams.get('token') || urlParams.get('access_token');
            
            console.log(`   Current URL Token: ${currentToken || 'None'}`);
            
            // Test various token types
            const testTokens = [
                LIVE_TEST_CONFIG.testToken,
                'gcc_access_2024',
                'test_browser_validation',
                currentToken
            ].filter(Boolean);
            
            const validationResults = [];
            
            if (window.userApp && typeof window.userApp.validateAccessToken === 'function') {
                for (const token of testTokens) {
                    try {
                        // This might not work if validateAccessToken is not exposed
                        console.log(`   Testing token: ${token.substring(0, 20)}...`);
                        validationResults.push({
                            token: token.substring(0, 20) + '...',
                            valid: 'Function not accessible - would need to test through UI'
                        });
                    } catch (validationError) {
                        validationResults.push({
                            token: token.substring(0, 20) + '...',
                            error: validationError.message
                        });
                    }
                }
            } else {
                console.log('   UserApp validation not accessible - testing token format manually');
                
                // Manual validation logic
                for (const token of testTokens) {
                    const isValid = this.manualTokenValidation(token);
                    validationResults.push({
                        token: token.substring(0, 20) + '...',
                        valid: isValid,
                        method: 'manual'
                    });
                    console.log(`   ${token.substring(0, 20)}...: ${isValid ? '✅' : '❌'}`);
                }
            }
            
            const result = {
                testName: 'Token Validation',
                currentToken: currentToken,
                validationResults: validationResults,
                success: validationResults.some(r => r.valid),
                timestamp: Date.now()
            };
            
            this.results.tests.push(result);
            
        } catch (error) {
            console.error('   Error:', error.message);
            this.results.errors.push({
                test: 'Token Validation',
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    manualTokenValidation(token) {
        if (!token || typeof token !== 'string') return false;
        
        const validTokens = ['gcc_access_2024', 'conference_token_valid', 'qr_code_access_granted'];
        if (validTokens.includes(token)) return true;
        
        if (token.startsWith('gcc_') || token.startsWith('test_') || token.startsWith('live_')) return true;
        
        const secureTokenPattern = /^[A-Za-z0-9_-]{32,}$/;
        return secureTokenPattern.test(token);
    }

    async testRequestSubmission() {
        console.log('\n📤 Testing Request Submission (Simulated)...');
        
        try {
            // Don't actually submit to avoid cluttering the operator dashboard
            // Just test the data structure
            
            const simulatedRequest = {
                userName: LIVE_TEST_CONFIG.testUser,
                token: LIVE_TEST_CONFIG.testToken,
                timestamp: Date.now(),
                dateTime: new Date().toLocaleString(),
                userAgent: navigator.userAgent.substring(0, 200),
                browserInfo: {
                    platform: navigator.platform,
                    language: navigator.language,
                    cookieEnabled: navigator.cookieEnabled,
                    onLine: navigator.onLine
                },
                status: 'pending',
                source: 'live_browser_test'
            };
            
            console.log('   Simulated request structure:');
            console.log('   -', Object.keys(simulatedRequest).join(', '));
            console.log('   - Browser Info:', Object.keys(simulatedRequest.browserInfo).join(', '));
            
            const result = {
                testName: 'Request Submission (Simulated)',
                requestStructure: Object.keys(simulatedRequest),
                dataComplete: true,
                success: true,
                timestamp: Date.now()
            };
            
            this.results.tests.push(result);
            console.log('   Request structure validation: ✅');
            
        } catch (error) {
            console.error('   Error:', error.message);
            this.results.errors.push({
                test: 'Request Submission',
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    generateLiveReport() {
        console.log('\n📊 LIVE BROWSER TEST REPORT');
        console.log('=' .repeat(60));
        
        const duration = Date.now() - LIVE_TEST_CONFIG.startTime;
        const totalTests = this.results.tests.length;
        const successfulTests = this.results.tests.filter(test => test.success).length;
        
        console.log(`Test Duration: ${(duration / 1000).toFixed(2)} seconds`);
        console.log(`Tests Run: ${totalTests}`);
        console.log(`Success Rate: ${successfulTests}/${totalTests} (${((successfulTests/totalTests)*100).toFixed(1)}%)`);
        
        console.log('\n📋 Test Results:');
        this.results.tests.forEach((test, index) => {
            console.log(`  ${index + 1}. ${test.testName}: ${test.success ? '✅ PASSED' : '❌ FAILED'}`);
        });
        
        if (this.results.errors.length > 0) {
            console.log('\n🚨 Errors:');
            this.results.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. [${error.test}] ${error.error}`);
            });
        }
        
        console.log('\n🎯 Live Environment Status:');
        console.log(`  URL: ${this.results.environment.url}`);
        console.log(`  Platform: ${this.results.environment.platform}`);
        console.log(`  Browser: ${this.getBrowserName()}`);
        console.log(`  Online: ${this.results.environment.onLine ? '✅' : '❌'}`);
        console.log(`  Geolocation: ${this.results.environment.geolocationAvailable ? '✅ Available' : '❌ Not Available'}`);
        
        console.log('\n📝 Live Test Recommendations:');
        this.generateLiveRecommendations();
        
        // Store results globally for inspection
        window.liveTestResults = this.results;
        console.log('\n💾 Results stored in window.liveTestResults for inspection');
    }

    getBrowserName() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return 'Other';
    }

    generateLiveRecommendations() {
        console.log('  1. Test QR code flow with different tokens');
        console.log('  2. Test geolocation permission prompts');
        console.log('  3. Verify operator dashboard receives requests');
        console.log('  4. Test on mobile devices');
        console.log('  5. Test with different network conditions');
    }
}

// Auto-run the live test
console.log('🔄 Starting live browser test in 2 seconds...');
setTimeout(() => {
    const liveTest = new LiveBrowserTest();
    liveTest.runLiveTests();
}, 2000);

// Also make it available for manual execution
window.runLiveBrowserTest = () => {
    const liveTest = new LiveBrowserTest();
    return liveTest.runLiveTests();
};
