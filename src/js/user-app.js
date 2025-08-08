// Frontend User Application - Handles user authentication and access requests
// Integrates with DataService for Firebase/localStorage operations

class UserApp {
    constructor() {
        this.currentUser = null;
        this.currentRequestId = null;
        this.statusSubscription = null;
        this.waitingTimer = null;
        this.waitingStartTime = null;
        
        console.log('👤 UserApp initializing...');
        this.initializeApp();
    }

    async initializeApp() {
        // Wait for DataService to be ready
        if (!window.dataService) {
            setTimeout(() => this.initializeApp(), 100);
            return;
        }

        await this.setupEventListeners();
        await this.checkURLParameters();
        this.showAuthScreen();
        
        console.log('✅ UserApp initialized');
    }

    async setupEventListeners() {
        // Name form submission
        const nameForm = document.getElementById('name-form');
        if (nameForm) {
            nameForm.addEventListener('submit', (e) => this.handleNameSubmission(e));
        }

        // Cancel request button
        const cancelBtn = document.getElementById('cancel-request-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelRequest());
        }

        // Issue form submission
        const issueForm = document.getElementById('issue-form');
        if (issueForm) {
            issueForm.addEventListener('submit', (e) => this.handleIssueSubmission(e));
        }

        // Navigation buttons
        this.setupNavigationButtons();
    }

    async checkURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token') || urlParams.get('access_token');
        
        if (token) {
            console.log('🔑 Access token found in URL');
            await this.processQRCodeAccess(token);
        }
    }

    async processQRCodeAccess(token) {
        this.showTokenProcessing();
        
        try {
            // Validate token (in a real implementation, this would be server-side)
            console.log('🔍 Validating access token:', token);
            const isValidToken = await this.validateAccessToken(token);
            
            if (isValidToken) {
                console.log('✅ Valid access token - requesting location permission');
                this.accessToken = token;
                
                // Show location permission request screen
                this.showLocationPermissionScreen();
                
            } else {
                throw new Error('Invalid or expired access token');
            }
        } catch (error) {
            console.error('❌ Token validation failed:', error);
            this.showAuthError('Invalid QR code or expired token. Please scan a valid QR code.');
        }
    }
    
    showLocationPermissionScreen() {
        this.hideAllScreens();
        
        // Get or create location permission screen
        let permissionScreen = document.getElementById('location-permission-screen');
        if (!permissionScreen) {
            permissionScreen = document.createElement('div');
            permissionScreen.id = 'location-permission-screen';
            document.getElementById('app').appendChild(permissionScreen);
        }
        
        permissionScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #0D1117;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            padding: 2rem;
        `;
        
        permissionScreen.innerHTML = `
            <div style="background: rgba(0, 0, 0, 0.9); border: 2px solid #f39c12; border-radius: 10px; 
                       padding: 3rem; max-width: 500px; width: 100%; text-align: center; 
                       box-shadow: 0 0 30px rgba(243, 156, 18, 0.3);">
                <h2 style="color: #f39c12; margin-bottom: 1rem; font-size: 1.8rem; font-family: 'Source Code Pro', monospace;">
                    <i class="fas fa-map-marker-alt"></i> Location Access Required
                </h2>
                <p style="color: #33FF33; margin-bottom: 1.5rem; font-family: 'Source Code Pro', monospace; line-height: 1.6;">
                    This application requires access to your current location for security and auditing purposes.
                </p>
                <p style="color: #33FF33; margin-bottom: 2rem; font-family: 'Source Code Pro', monospace; font-size: 0.9rem;">
                    Your location will be used to verify you are physically present at the conference center.
                </p>
                
                <div style="margin: 2rem 0;">
                    <button id="grant-location-btn" type="button" 
                            style="background: linear-gradient(45deg, #27ae60, #2ecc71); color: white; border: none; 
                                   padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 1rem;
                                   font-family: 'Source Code Pro', monospace; margin-right: 1rem;">
                        <i class="fas fa-check"></i> Grant Access
                    </button>
                    <button id="deny-location-btn" type="button" 
                            style="background: linear-gradient(45deg, #c0392b, #e74c3c); color: white; border: none; 
                                   padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 1rem;
                                   font-family: 'Source Code Pro', monospace;">
                        <i class="fas fa-times"></i> Deny
                    </button>
                </div>

                <div id="location-error" style="display: none; color: #e74c3c; margin-top: 1rem; 
                                                font-family: 'Source Code Pro', monospace;"></div>
            </div>
        `;
        
        // Attach event listeners
        const grantBtn = document.getElementById('grant-location-btn');
        const denyBtn = document.getElementById('deny-location-btn');
        
        grantBtn.addEventListener('click', () => this.handleLocationPermission(true));
        denyBtn.addEventListener('click', () => this.handleLocationPermission(false));
        
        console.log('� Location permission screen displayed');
    }

    async handleLocationPermission(granted) {
        const errorEl = document.getElementById('location-error');
        const grantBtn = document.getElementById('grant-location-btn');
        const denyBtn = document.getElementById('deny-location-btn');
        
        if (granted) {
            // Show loading state
            grantBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Requesting Location...';
            grantBtn.disabled = true;
            denyBtn.disabled = true;
            
            try {
                // Test location access
                console.log('📍 Testing location access...');
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 300000
                    });
                });
                
                console.log('✅ Location access granted');
                this.locationGranted = true;
                this.showNameInput();
                
            } catch (error) {
                console.warn('⚠️ Location access failed:', error);
                errorEl.style.display = 'block';
                errorEl.textContent = 'Location access denied. You can still proceed but some features may be limited.';
                
                // Reset buttons
                grantBtn.innerHTML = '<i class="fas fa-check"></i> Grant Access';
                grantBtn.disabled = false;
                denyBtn.disabled = false;
                
                // Allow user to continue anyway after 3 seconds
                setTimeout(() => {
                    const proceedBtn = document.createElement('button');
                    proceedBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Continue Without Location';
                    proceedBtn.style.cssText = `
                        background: linear-gradient(45deg, #f39c12, #e67e22); 
                        color: white; border: none; padding: 12px 24px; border-radius: 5px; 
                        cursor: pointer; font-size: 1rem; font-family: 'Source Code Pro', monospace;
                        margin-top: 1rem; width: 100%;
                    `;
                    proceedBtn.addEventListener('click', () => {
                        this.locationGranted = false;
                        this.showNameInput();
                    });
                    errorEl.appendChild(proceedBtn);
                }, 3000);
            }
        } else {
            // User denied location access
            console.log('❌ User denied location access');
            this.locationGranted = false;
            
            errorEl.style.display = 'block';
            errorEl.innerHTML = `
                <p>Location access denied. You can still proceed but location will not be tracked.</p>
                <button id="continue-without-location" type="button"
                        style="background: linear-gradient(45deg, #f39c12, #e67e22); color: white; border: none; 
                               padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 1rem;
                               font-family: 'Source Code Pro', monospace; margin-top: 1rem;">
                    <i class="fas fa-arrow-right"></i> Continue Without Location
                </button>
            `;
            
            document.getElementById('continue-without-location').addEventListener('click', () => {
                this.showNameInput();
            });
        }
    }

    async validateAccessToken(token) {
        // Enhanced token validation for production
        if (!token || typeof token !== 'string') {
            console.log('❌ Token validation: Invalid token type');
            return false;
        }
        
        console.log('🔍 Validating token:', token);
        
        // Accept predefined tokens for testing
        const validTokens = [
            'gcc_access_2024',
            'conference_token_valid',
            'qr_code_access_granted'
        ];
        
        if (validTokens.includes(token)) {
            console.log('✅ Token validation: Predefined token accepted');
            return true;
        }
        
        // Accept tokens that start with known prefixes
        const validPrefixes = ['gcc_', 'test_', 'name_', 'workflow_', 'live_', 'automated_', 'enhanced_'];
        const hasValidPrefix = validPrefixes.some(prefix => token.startsWith(prefix));
        
        if (hasValidPrefix) {
            console.log('✅ Token validation: Valid prefix token accepted');
            return true;
        }
        
        // Accept cryptographically secure tokens (base64url format, 32+ chars)
        // These are generated by the QR generator
        const secureTokenPattern = /^[A-Za-z0-9_-]{32,}$/;
        if (secureTokenPattern.test(token)) {
            console.log('✅ Token validation: Secure token format validated');
            return true;
        }
        
        console.log('❌ Token validation failed - token format not recognized');
        console.log('   Token:', token);
        console.log('   Length:', token.length);
        console.log('   Valid prefixes: gcc_, test_, name_, workflow_, live_, automated_, enhanced_');
        console.log('   Secure pattern (32+ chars): /^[A-Za-z0-9_-]{32,}$/');
        return false;
    }

    async handleNameSubmission(e) {
        e.preventDefault();
        
        const userNameInput = document.getElementById('user-name');
        const userName = userNameInput.value.trim();
        
        console.log('🔍 DEBUG: Name submission triggered for:', userName);
        
        if (!userName) {
            console.log('❌ DEBUG: No username provided');
            this.showNameError('Please enter your name');
            return;
        }

        if (userName.length < 2) {
            console.log('❌ DEBUG: Username too short');
            this.showNameError('Name must be at least 2 characters');
            return;
        }

        // Show loading state while collecting location data
        this.showRequestProcessing();

        try {
            console.log('📤 DEBUG: Submitting access request for:', userName);
            console.log('🔑 DEBUG: Using token:', this.accessToken);
            
            const requestData = {
                userName: userName,
                token: this.accessToken || 'direct_access',
                source: this.accessToken ? 'qr_code' : 'user_interface',
                qrToken: this.accessToken || null
            };

            console.log('📊 DEBUG: Request data:', requestData);
            const result = await window.dataService.submitRequest(requestData);
            console.log('✅ DEBUG: Submit result:', result);
            
            if (result.success) {
                this.currentUser = userName;
                this.currentRequestId = result.requestId;
                console.log('🎯 DEBUG: Request submitted successfully, ID:', result.requestId);
                console.log('📋 DEBUG: Full request details:', result.request);
                this.showWaitingScreen();
                this.startStatusMonitoring();
            } else {
                throw new Error(result.error || 'Failed to submit request');
            }
        } catch (error) {
            console.error('❌ Error submitting request:', error);
            this.showNameError(`Error submitting request: ${error.message}`);
        }
    }

    startStatusMonitoring() {
        if (!this.currentRequestId) return;
        
        console.log('👀 Starting status monitoring for:', this.currentRequestId);
        
        this.statusSubscription = window.dataService.subscribeToRequestStatus(
            this.currentRequestId,
            (result) => this.handleStatusUpdate(result)
        );
        
        this.startWaitingTimer();
    }

    handleStatusUpdate(result) {
        if (!result.found) {
            console.warn('⚠️ Request not found:', this.currentRequestId);
            return;
        }

        const status = result.status;
        console.log('📊 Status update:', status);
        
        switch (status) {
            case 'pending':
                // Still waiting, no action needed
                break;
                
            case 'approved':
                this.showAccessGranted();
                this.waitForProcedureAccess();
                break;
                
            case 'granted':
                this.redirectToProcedure();
                break;
                
            case 'denied':
                this.showAccessDenied();
                break;
                
            default:
                console.warn('⚠️ Unknown status:', status);
        }
    }

    waitForProcedureAccess() {
        // Continue monitoring for 'granted' status
        console.log('⏳ Waiting for procedure access grant...');
    }

    redirectToProcedure() {
        console.log('🚀 Redirecting to procedure...');
        this.stopStatusMonitoring();
        this.showSurveyScreen();
    }

    showAccessDenied() {
        this.stopStatusMonitoring();
        this.stopWaitingTimer();
        
        // Create access denied screen
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="access-denied-container">
                <h2><i class="fas fa-times-circle"></i> Access Denied</h2>
                <p>Your access request has been denied by the operator.</p>
                <p>If you believe this is an error, please contact the administrator.</p>
                <button onclick="location.reload()" class="submit-btn">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }

    cancelRequest() {
        if (confirm('Are you sure you want to cancel your access request?')) {
            this.stopStatusMonitoring();
            this.stopWaitingTimer();
            this.showNameInput();
        }
    }

    stopStatusMonitoring() {
        if (this.statusSubscription) {
            this.statusSubscription();
            this.statusSubscription = null;
            console.log('⏹️ Status monitoring stopped');
        }
    }

    startWaitingTimer() {
        this.waitingStartTime = Date.now();
        this.updateWaitingTimer();
        
        this.waitingTimer = setInterval(() => {
            this.updateWaitingTimer();
        }, 1000);
    }

    updateWaitingTimer() {
        const timerElement = document.getElementById('waiting-timer');
        if (!timerElement || !this.waitingStartTime) return;
        
        const elapsed = Date.now() - this.waitingStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    stopWaitingTimer() {
        if (this.waitingTimer) {
            clearInterval(this.waitingTimer);
            this.waitingTimer = null;
        }
    }

    // === UI STATE MANAGEMENT ===

    showAuthScreen() {
        this.hideAllScreens();
        document.getElementById('auth-screen').style.display = 'block';
    }

    showTokenProcessing() {
        this.hideAllScreens();
        document.getElementById('auth-screen').style.display = 'block';
        document.getElementById('token-processing').style.display = 'block';
        document.getElementById('token-processing').innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Validating access token...</p>
            </div>
        `;
    }

    showRequestProcessing() {
        // Disable the submit button and show processing state
        const submitBtn = document.querySelector('#name-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i> Processing Request...
            `;
        }
        
        // Clear any existing error
        const errorElement = document.getElementById('name-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    showNameInput() {
        console.log('🔍 DEBUG: showNameInput() called');
        
        // Force hide all screens first
        this.hideAllScreens();
        
        // Get the name input screen element
        const nameInputScreen = document.getElementById('name-input-screen');
        if (!nameInputScreen) {
            console.error('❌ ERROR: name-input-screen element not found!');
            // Create the screen if it doesn't exist
            this.createNameInputScreen();
            return;
        }
        
        // Force display the screen with multiple CSS properties
        nameInputScreen.style.display = 'flex';
        nameInputScreen.style.visibility = 'visible';
        nameInputScreen.style.opacity = '1';
        nameInputScreen.style.position = 'fixed';
        nameInputScreen.style.top = '0';
        nameInputScreen.style.left = '0';
        nameInputScreen.style.width = '100vw';
        nameInputScreen.style.height = '100vh';
        nameInputScreen.style.zIndex = '9999';
        nameInputScreen.style.background = 'var(--background, #0D1117)';
        nameInputScreen.style.justifyContent = 'center';
        nameInputScreen.style.alignItems = 'center';
        
        console.log('🔍 DEBUG: Name input screen display forced');
        
        // Get or create the name container
        let nameContainer = nameInputScreen.querySelector('.name-container');
        if (!nameContainer) {
            nameContainer = document.createElement('div');
            nameContainer.className = 'name-container';
            nameInputScreen.appendChild(nameContainer);
        }
        
        // Set container styles
        nameContainer.style.background = 'rgba(0, 0, 0, 0.9)';
        nameContainer.style.border = '2px solid #2ecc71';
        nameContainer.style.borderRadius = '10px';
        nameContainer.style.padding = '3rem';
        nameContainer.style.maxWidth = '500px';
        nameContainer.style.width = '100%';
        nameContainer.style.textAlign = 'center';
        nameContainer.style.boxShadow = '0 0 30px rgba(46, 204, 113, 0.3)';
        
        // Create the complete form HTML
        nameContainer.innerHTML = `
            <h2 style="color: #2ecc71; margin-bottom: 1rem; font-size: 1.8rem;">
                <i class="fas fa-user"></i> Identify Yourself
            </h2>
            <p style="color: #33FF33; margin-bottom: 2rem;">Please enter your name to request access to the system.</p>
            
            <form id="name-form" style="width: 100%;">
                <div class="input-group" style="margin: 2rem 0;">
                    <label for="user-name" style="display: block; color: #33FF33; margin-bottom: 0.5rem; font-weight: bold;">Your Name:</label>
                    <input type="text" id="user-name" placeholder="Enter your full name" required maxlength="50" 
                           style="width: 100%; max-width: 400px; padding: 12px 15px; background: rgba(0, 0, 0, 0.8); 
                                  border: 2px solid #2ecc71; color: #33FF33; border-radius: 5px; font-size: 1rem;
                                  font-family: 'Source Code Pro', monospace;">
                </div>
                <button type="submit" class="submit-btn" 
                        style="background: linear-gradient(45deg, #2ecc71, #3498db); color: white; border: none; 
                               padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 1rem;
                               font-family: 'Source Code Pro', monospace; margin-top: 1rem;">
                    <i class="fas fa-arrow-right"></i> Request Access
                </button>
            </form>

            <div id="name-error" class="error-message" style="display: none; color: #e74c3c; margin-top: 1rem;"></div>
        `;
        
        console.log('🔍 DEBUG: Form HTML created');
        
        // Re-attach event listener to the form
        const nameForm = document.getElementById('name-form');
        if (nameForm) {
            nameForm.removeEventListener('submit', this.handleNameSubmission);
            nameForm.addEventListener('submit', (e) => this.handleNameSubmission(e));
            console.log('🔍 DEBUG: Form event listener attached');
        }
        
        // Clear any existing errors
        const errorElement = document.getElementById('name-error');
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
        
        // Focus on name input after a short delay
        setTimeout(() => {
            const nameInput = document.getElementById('user-name');
            if (nameInput) {
                nameInput.focus();
                console.log('🔍 DEBUG: Focus set on name input field');
            } else {
                console.error('❌ ERROR: user-name input field not found after rebuild!');
            }
        }, 200);
        
        // Final verification
        setTimeout(() => {
            const isVisible = nameInputScreen.style.display === 'flex';
            const formExists = document.getElementById('name-form') !== null;
            const inputExists = document.getElementById('user-name') !== null;
            
            console.log('🔍 DEBUG: Final verification:');
            console.log(`  - Screen visible: ${isVisible}`);
            console.log(`  - Form exists: ${formExists}`);
            console.log(`  - Input exists: ${inputExists}`);
            
            if (!isVisible || !formExists || !inputExists) {
                console.error('❌ ERROR: Name input screen not properly displayed!');
            } else {
                console.log('✅ SUCCESS: Name input form is ready!');
            }
        }, 500);
    }
    
    createNameInputScreen() {
        console.log('🔧 Creating name input screen from scratch');
        
        const app = document.getElementById('app');
        if (!app) {
            console.error('❌ App container not found');
            return;
        }
        
        const nameInputScreen = document.createElement('div');
        nameInputScreen.id = 'name-input-screen';
        nameInputScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #0D1117;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            padding: 2rem;
        `;
        
        app.appendChild(nameInputScreen);
        console.log('🔧 Name input screen created');
        
        // Now call showNameInput again
        this.showNameInput();
    }

    showWaitingScreen() {
        this.hideAllScreens();
        const waitingScreen = document.getElementById('waiting-screen');
        waitingScreen.style.display = 'block';
        
        // Update user name
        const userNameElement = document.getElementById('waiting-user-name');
        if (userNameElement) {
            userNameElement.textContent = `Hello, ${this.currentUser}`;
        }
        
        // Enhanced waiting animation with better visual feedback
        const waitingAnimation = document.querySelector('.waiting-animation');
        if (waitingAnimation) {
            waitingAnimation.innerHTML = `
                <div class="approval-spinner">
                    <div class="spinner-circle"></div>
                    <div class="spinner-text">
                        <i class="fas fa-hourglass-half"></i>
                        <span>Processing Request...</span>
                    </div>
                </div>
                <div class="status-indicators">
                    <div class="status-step completed">
                        <i class="fas fa-check"></i> Request Submitted
                    </div>
                    <div class="status-step pending">
                        <i class="fas fa-clock"></i> Awaiting Operator Review
                    </div>
                    <div class="status-step waiting">
                        <i class="fas fa-key"></i> Access Decision Pending
                    </div>
                </div>
            `;
        }
        
        const waitingStatus = document.querySelector('.waiting-status');
        if (waitingStatus) {
            waitingStatus.innerHTML = `
                <div class="status-info">
                    <p><i class="fas fa-info-circle"></i> Your request has been sent to the operator</p>
                    <p><i class="fas fa-clock"></i> Waiting time: <span id="waiting-timer">0:00</span></p>
                    <p><i class="fas fa-id-badge"></i> Request ID: ${this.currentRequestId}</p>
                </div>
                <div class="waiting-instructions">
                    <p>Please wait while the operator reviews your access request.</p>
                    <p>You will be automatically notified when a decision is made.</p>
                </div>
            `;
        }
        
        const cancelBtn = document.getElementById('cancel-request-btn');
        if (cancelBtn && !cancelBtn.innerHTML.trim()) {
            cancelBtn.innerHTML = `
                <i class="fas fa-times"></i> Cancel Request
            `;
        }
        
        // Add dynamic styles for the enhanced animation
        if (!document.getElementById('waiting-animation-styles')) {
            const styles = document.createElement('style');
            styles.id = 'waiting-animation-styles';
            styles.textContent = `
                .approval-spinner {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin: 2rem 0;
                }
                
                .spinner-circle {
                    width: 60px;
                    height: 60px;
                    border: 4px solid rgba(46, 204, 113, 0.3);
                    border-top: 4px solid #2ecc71;
                    border-radius: 50%;
                    animation: spin 2s linear infinite;
                    margin-bottom: 1rem;
                }
                
                .spinner-text {
                    color: #2ecc71;
                    font-family: 'Source Code Pro', monospace;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .status-indicators {
                    margin: 2rem 0;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    max-width: 400px;
                    margin-left: auto;
                    margin-right: auto;
                }
                
                .status-step {
                    padding: 0.8rem 1.2rem;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    font-family: 'Source Code Pro', monospace;
                    transition: all 0.3s ease;
                }
                
                .status-step.completed {
                    background: rgba(46, 204, 113, 0.2);
                    border: 1px solid #2ecc71;
                    color: #2ecc71;
                }
                
                .status-step.pending {
                    background: rgba(243, 156, 18, 0.2);
                    border: 1px solid #f39c12;
                    color: #f39c12;
                    animation: pulse 2s infinite;
                }
                
                .status-step.waiting {
                    background: rgba(52, 73, 94, 0.3);
                    border: 1px solid #34495e;
                    color: #7f8c8d;
                }
                
                .status-info {
                    background: rgba(46, 204, 113, 0.1);
                    border: 1px solid #2ecc71;
                    border-radius: 8px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                }
                
                .waiting-instructions {
                    background: rgba(52, 152, 219, 0.1);
                    border: 1px solid #3498db;
                    border-radius: 8px;
                    padding: 1rem;
                    color: #3498db;
                    font-style: italic;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `;
            document.head.appendChild(styles);
        }
    }

    showAccessGranted() {
        this.hideAllScreens();
        const accessScreen = document.getElementById('access-granted-screen');
        accessScreen.style.display = 'block';
        
        // Update user name
        const userNameElement = document.getElementById('access-user-name');
        if (userNameElement) {
            userNameElement.textContent = `Hello, ${this.currentUser}`;
        }
        
        // Update approval timestamp
        const timestampElement = document.getElementById('approval-timestamp');
        if (timestampElement) {
            timestampElement.textContent = new Date().toLocaleString();
        }
        
        // Enhanced success screen with celebration animation
        const accessStatus = document.querySelector('.access-status');
        if (accessStatus) {
            accessStatus.innerHTML = `
                <div class="success-celebration">
                    <div class="checkmark-container">
                        <div class="checkmark-circle">
                            <div class="checkmark"></div>
                        </div>
                    </div>
                    <div class="success-message">
                        <h3>🎉 Access Approved!</h3>
                        <p>Your request has been approved by the operator</p>
                    </div>
                </div>
                <div class="approval-details">
                    <p><i class="fas fa-shield-check"></i> Status: <span class="status-approved">APPROVED</span></p>
                    <p><i class="fas fa-clock"></i> Approved at: <span id="approval-timestamp">${new Date().toLocaleString()}</span></p>
                    <p><i class="fas fa-id-badge"></i> Request ID: ${this.currentRequestId}</p>
                </div>
            `;
        }
        
        const accessInstructions = document.querySelector('.access-instructions');
        if (accessInstructions) {
            accessInstructions.innerHTML = `
                <div class="next-steps">
                    <h4><i class="fas fa-info-circle"></i> Next Steps</h4>
                    <p>Please wait for the operator to grant you access to the restoration procedure.</p>
                    <p>You will automatically proceed when full access is granted.</p>
                </div>
            `;
        }
        
        const accessWaiting = document.querySelector('.access-waiting');
        if (accessWaiting) {
            accessWaiting.innerHTML = `
                <div class="procedure-waiting">
                    <div class="waiting-spinner">
                        <div class="spinner-dots">
                            <span>●</span><span>●</span><span>●</span>
                        </div>
                    </div>
                    <p>Waiting for procedure access...</p>
                </div>
            `;
        }
        
        // Add success animation styles
        if (!document.getElementById('success-animation-styles')) {
            const styles = document.createElement('style');
            styles.id = 'success-animation-styles';
            styles.textContent = `
                .success-celebration {
                    text-align: center;
                    margin: 2rem 0;
                }
                
                .checkmark-container {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 1rem;
                }
                
                .checkmark-circle {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: #2ecc71;
                    position: relative;
                    animation: checkmark-bounce 0.6s ease-in-out;
                }
                
                .checkmark {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 20px;
                    height: 35px;
                    border: solid white;
                    border-width: 0 4px 4px 0;
                    transform: translate(-50%, -60%) rotate(45deg);
                    animation: checkmark-draw 0.4s ease-in-out 0.2s both;
                    opacity: 0;
                }
                
                .success-message h3 {
                    color: #2ecc71;
                    margin: 0.5rem 0;
                    font-size: 1.5rem;
                }
                
                .approval-details {
                    background: rgba(46, 204, 113, 0.1);
                    border: 1px solid #2ecc71;
                    border-radius: 8px;
                    padding: 1.5rem;
                    margin: 1rem 0;
                }
                
                .status-approved {
                    color: #2ecc71;
                    font-weight: bold;
                    font-family: 'Source Code Pro', monospace;
                }
                
                .next-steps {
                    background: rgba(52, 152, 219, 0.1);
                    border: 1px solid #3498db;
                    border-radius: 8px;
                    padding: 1.5rem;
                    color: #3498db;
                }
                
                .next-steps h4 {
                    color: #3498db;
                    margin-top: 0;
                }
                
                .procedure-waiting {
                    text-align: center;
                    padding: 1rem;
                    background: rgba(243, 156, 18, 0.1);
                    border: 1px solid #f39c12;
                    border-radius: 8px;
                    color: #f39c12;
                }
                
                .waiting-spinner {
                    margin-bottom: 1rem;
                }
                
                .spinner-dots span {
                    display: inline-block;
                    animation: dot-pulse 1.5s infinite;
                    margin: 0 2px;
                    font-size: 1.5rem;
                }
                
                .spinner-dots span:nth-child(2) {
                    animation-delay: 0.3s;
                }
                
                .spinner-dots span:nth-child(3) {
                    animation-delay: 0.6s;
                }
                
                @keyframes checkmark-bounce {
                    0% { transform: scale(0); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
                
                @keyframes checkmark-draw {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                
                @keyframes dot-pulse {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
    }

    showSurveyScreen() {
        this.hideAllScreens();
        const surveyScreen = document.getElementById('survey-screen');
        surveyScreen.style.display = 'block';
        
        // Rebuild survey form if needed
        const toggleGroup = document.querySelector('.toggle-group');
        if (!toggleGroup.innerHTML.trim()) {
            toggleGroup.innerHTML = `
                <input type="radio" id="issue-video" name="issue" value="video" required>
                <label for="issue-video">Video Issues (no video, distorted video)</label>

                <input type="radio" id="issue-audio" name="issue" value="audio">
                <label for="issue-audio">Program Audio Issues (no audio, garbled audio)</label>

                <input type="radio" id="issue-touch" name="issue" value="touch">
                <label for="issue-touch">Touch Panel/Control Issues (sluggish controls, no control, flashing controls, projectors won't turn on)</label>

                <input type="radio" id="issue-mic" name="issue" value="mic">
                <label for="issue-mic">Microphone Issues (wireless microphones have a flashing light and won't connect, no audio from podium mic, garbled/distorted audio)</label>
            `;
        }
        
        const disclaimer = document.querySelector('.form-group.disclaimer');
        if (!disclaimer.innerHTML.trim()) {
            disclaimer.innerHTML = `
                <input type="checkbox" id="disclaimer-check" required>
                <label for="disclaimer-check">I understand this procedure impacts the entire conference center and will take approximately 20 minutes.</label>
            `;
        }
    }

    handleIssueSubmission(e) {
        e.preventDefault();
        
        const selectedIssue = document.querySelector('input[name="issue"]:checked');
        const disclaimerCheck = document.getElementById('disclaimer-check');
        
        if (!selectedIssue) {
            alert('Please select an issue type');
            return;
        }
        
        if (!disclaimerCheck.checked) {
            alert('Please acknowledge the disclaimer');
            return;
        }
        
        console.log('🎯 Issue selected:', selectedIssue.value);
        
        // Store the selected issue and proceed to step screen
        this.selectedIssue = selectedIssue.value;
        this.showStepScreen();
    }

    showStepScreen() {
        this.hideAllScreens();
        document.getElementById('step-screen').style.display = 'block';
        
        // Initialize the step procedure (this would load from your existing script.js logic)
        if (window.initializeStepProcedure) {
            window.initializeStepProcedure(this.selectedIssue);
        }
    }

    hideAllScreens() {
        const screens = [
            'auth-screen', 'location-permission-screen', 'name-input-screen', 'waiting-screen', 
            'access-granted-screen', 'survey-screen', 'step-screen', 'summary-screen'
        ];
        
        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) screen.style.display = 'none';
        });
    }

    showAuthError(message) {
        const errorElement = document.getElementById('auth-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        
        this.showAuthScreen();
    }

    showNameError(message) {
        const errorElement = document.getElementById('name-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    setupNavigationButtons() {
        // This would integrate with your existing navigation logic
        // Left as placeholder for now
    }

    // === UTILITY METHODS ===

    getAppStatus() {
        return {
            currentUser: this.currentUser,
            currentRequestId: this.currentRequestId,
            hasStatusSubscription: !!this.statusSubscription,
            dataService: window.dataService ? window.dataService.getServiceStatus() : null
        };
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.userApp = new UserApp();
});

// Export for testing/debugging
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserApp;
}
