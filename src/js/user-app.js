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
        console.log('🎯 UserApp.initializeApp() called');
        console.log('🔍 Current URL:', window.location.href);
        console.log('🔍 URL search params:', window.location.search);
        
        // Validate document structure to prevent Quirks Mode
        this.validateDocumentStructure();
        
        // Wait for DataService to be ready
        if (!window.dataService) {
            console.log('⏳ Waiting for DataService...');
            setTimeout(() => this.initializeApp(), 100);
            return;
        }

        console.log('🔧 Setting up event listeners...');
        await this.setupEventListeners();
        
        console.log('🔧 Checking URL parameters...');
        await this.checkURLParameters();
        
        // Only show auth screen if we don't have a token or if checkURLParameters didn't handle it
        const urlParams = new URLSearchParams(window.location.search);
        const hasToken = urlParams.get('token') || urlParams.get('access_token');
        
        if (!hasToken) {
            console.log('🔧 No token found - showing auth screen...');
            this.showAuthScreen();
        } else {
            console.log('🔧 Token found - checkURLParameters should handle the flow...');
        }
        
        console.log('✅ UserApp initialized');
    }

    validateDocumentStructure() {
        // Ensure proper document structure to prevent Quirks Mode
        if (!document.doctype) {
            console.warn('⚠️ Missing DOCTYPE - adding HTML5 DOCTYPE');
            // If DOCTYPE is missing, we can't fix it at runtime, but we can warn
        }
        
        // Ensure proper meta charset
        const metaCharset = document.querySelector('meta[charset]');
        if (!metaCharset) {
            const meta = document.createElement('meta');
            meta.setAttribute('charset', 'UTF-8');
            document.head.insertBefore(meta, document.head.firstChild);
            console.log('✅ Added missing charset meta tag');
        }
        
        // Ensure proper viewport meta tag
        const metaViewport = document.querySelector('meta[name="viewport"]');
        if (!metaViewport) {
            const meta = document.createElement('meta');
            meta.setAttribute('name', 'viewport');
            meta.setAttribute('content', 'width=device-width, initial-scale=1.0');
            document.head.appendChild(meta);
            console.log('✅ Added missing viewport meta tag');
        }
        
        // Ensure app container exists with proper structure
        const app = document.getElementById('app');
        if (!app) {
            console.error('❌ App container missing - this could cause layout issues');
            return;
        }
        
        // Ensure app container has proper attributes to prevent quirks
        if (!app.hasAttribute('role')) {
            app.setAttribute('role', 'main');
        }
        
        console.log('✅ Document structure validated');
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

        // Survey form validation
        const disclaimerCheckbox = document.getElementById('disclaimer-check');
        if (disclaimerCheckbox) {
            disclaimerCheckbox.addEventListener('change', () => {
                const startRecoveryBtn = document.getElementById('start-recovery-btn');
                const selectedIssue = document.querySelector('input[name="issue"]:checked');
                if (startRecoveryBtn) {
                    startRecoveryBtn.disabled = !(disclaimerCheckbox.checked && selectedIssue);
                }
            });
        }
        
        // Radio button change listener for Start Recovery button state
        const issueRadios = document.querySelectorAll('input[name="issue"]');
        issueRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const disclaimerCheckbox = document.getElementById('disclaimer-check');
                const startRecoveryBtn = document.getElementById('start-recovery-btn');
                if (startRecoveryBtn && disclaimerCheckbox) {
                    startRecoveryBtn.disabled = !(disclaimerCheckbox.checked && radio.checked);
                }
            });
        });
        
        // Note: Issue form submission is handled by script.js

        // Navigation buttons
        this.setupNavigationButtons();
    }

    async checkURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token') || urlParams.get('access_token');
        
        console.log('🔍 checkURLParameters called');
        console.log('🔍 URL params found:', Object.fromEntries(urlParams));
        console.log('🔍 Token found:', token);
        
        if (token) {
            console.log('🔑 Access token found in URL - forcing immediate name input');
            
            // Store the token immediately
            this.accessToken = token;
            
            // FORCE name input immediately - bypass everything else
            setTimeout(() => {
                console.log('🚀 FORCE: Calling showNameInput directly');
                this.showNameInput();
            }, 500);
            
            // Also try the normal flow
            await this.processQRCodeAccess(token);
        } else {
            console.log('ℹ️ No token found in URL - showing auth screen');
        }
    }

    async processQRCodeAccess(token) {
        console.log('🚀 processQRCodeAccess called with token:', token);
        this.showTokenProcessing();
        
        try {
            // First, validate token format
            console.log('🔍 Validating access token:', token);
            const isValidToken = await this.validateAccessToken(token);
            
            if (!isValidToken) {
                throw new Error('Invalid or expired access token');
            }
            
            console.log('✅ Valid access token - checking for existing request');
            this.accessToken = token;
            
            // Check if there's already an existing request for this token
            const existingRequest = await window.dataService.getRequestByToken(token);
            
            if (existingRequest.found) {
                console.log('🔍 Found existing request:', existingRequest.request);
                const request = existingRequest.request;
                this.currentRequestId = request.id;
                
                // Navigate based on current status
                switch (request.status) {
                    case 'pending':
                        console.log('📋 Request is pending - showing waiting room');
                        this.showWaitingRoom();
                        this.startStatusMonitoring();
                        break;
                        
                    case 'approved':
                        console.log('✅ Request is approved - showing waiting room with approval message');
                        this.updateWaitingRoomForApproval();
                        this.waitForProcedureAccess();
                        break;
                        
                    case 'granted':
                        console.log('🚀 Request is granted - going directly to survey screen');
                        this.redirectToTroubleshooting();
                        break;
                        
                    case 'denied':
                        console.log('❌ Request was denied - showing access denied');
                        this.showAccessDenied();
                        break;
                        
                    default:
                        console.warn('⚠️ Unknown request status:', request.status);
                        this.showNameInput(); // Fall back to name input
                }
            } else {
                console.log('ℹ️ No existing request - proceeding to name input');
                // No existing request, proceed with normal flow
                this.showNameInput();
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
            'qr_code_access_granted',
            'metadata_path_test'
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
        
        console.log('🔔 DEBUG: statusSubscription type:', typeof this.statusSubscription);
        console.log('🔔 DEBUG: statusSubscription value:', this.statusSubscription);
        
        this.startWaitingTimer();
    }

    handleStatusUpdate(result) {
        console.log('🔍 DEBUG: handleStatusUpdate called with:', result);
        
        if (!result.found) {
            console.warn('⚠️ Request not found:', this.currentRequestId);
            return;
        }

        const status = result.status;
        console.log('📊 Status update:', status);
        console.log('🔍 DEBUG: Current request ID:', this.currentRequestId);
        console.log('🔍 DEBUG: Full result object:', result);
        
        switch (status) {
            case 'pending':
                console.log('🔄 DEBUG: Status is pending - no action needed');
                // Still waiting, no action needed
                break;
                
            case 'approved':
                console.log('✅ DEBUG: Status is approved - updating waiting room');
                // Keep user in waiting room but update message
                this.updateWaitingRoomForApproval();
                this.waitForProcedureAccess();
                break;
                
            case 'granted':
                console.log('🚀 DEBUG: Status is granted - redirecting to survey screen');
                // Go directly to survey screen
                this.redirectToTroubleshooting();
                break;
                
            case 'denied':
                console.log('❌ DEBUG: Status is denied - showing access denied');
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

    updateWaitingRoomForApproval() {
        console.log('✅ Request approved - updating waiting room message');
        
        // Update the waiting screen to show approval status
        const waitingMessage = document.querySelector('.waiting-message');
        if (waitingMessage) {
            waitingMessage.innerHTML = 'Your request has been <span style="color: #2ecc71;">approved</span>! Please wait for the operator to grant procedure access.';
        }

        // Update the status display
        const waitingStatus = document.querySelector('.waiting-status');
        if (waitingStatus) {
            waitingStatus.innerHTML = `
                <div class="status-info">
                    <p><i class="fas fa-check-circle" style="color: #2ecc71;"></i> Request approved by operator</p>
                    <p><i class="fas fa-clock"></i> Waiting for procedure access grant</p>
                    <p><i class="fas fa-id-badge"></i> Request ID: ${this.currentRequestId}</p>
                </div>
                <div class="waiting-instructions">
                    <p>Your access request has been approved!</p>
                    <p>Please wait while the operator grants you access to the troubleshooting procedure.</p>
                </div>
            `;
        }

        // Update spinner text
        const spinnerText = document.querySelector('.spinner-text span');
        if (spinnerText) {
            spinnerText.textContent = 'Waiting for Procedure Access...';
        }
    }

    redirectToTroubleshooting() {
        console.log('🚀 Redirecting to survey screen...');
        console.log('🚀 DEBUG: About to stop monitoring and timers');
        this.stopStatusMonitoring();
        this.stopWaitingTimer();
        console.log('🚀 DEBUG: About to call showSurveyScreen');
        this.showSurveyScreen();
        console.log('🚀 DEBUG: showSurveyScreen call completed');
    }

    redirectToProcedure() {
        console.log('🚀 Redirecting to procedure...');
        this.stopStatusMonitoring();
        this.showSurveyScreen();
    }

    showAccessDenied() {
        this.stopStatusMonitoring();
        this.stopWaitingTimer();
        
        // Clear existing content and create access denied screen
        this.hideAllScreens();
        
        // Get or create access denied screen
        let deniedScreen = document.getElementById('access-denied-screen');
        if (!deniedScreen) {
            deniedScreen = document.createElement('div');
            deniedScreen.id = 'access-denied-screen';
            deniedScreen.className = 'screen-container';
            document.getElementById('app').appendChild(deniedScreen);
        }
        
        deniedScreen.innerHTML = `
            <div class="access-denied-container">
                <h2><i class="fas fa-times-circle"></i> Access Denied</h2>
                <p>Your access request has been denied by the operator.</p>
                <p>If you believe this is an error, please contact the administrator.</p>
                <button onclick="location.reload()" class="submit-btn">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
        
        deniedScreen.style.display = 'block';
    }

    cancelRequest() {
        if (confirm('Are you sure you want to cancel your access request?')) {
            this.stopStatusMonitoring();
            this.stopWaitingTimer();
            this.showNameInput();
        }
    }

    stopStatusMonitoring() {
        console.log('🔔 DEBUG: stopStatusMonitoring called');
        console.log('🔔 DEBUG: statusSubscription type:', typeof this.statusSubscription);
        console.log('🔔 DEBUG: statusSubscription value:', this.statusSubscription);
        
        if (this.statusSubscription && typeof this.statusSubscription === 'function') {
            this.statusSubscription();
            this.statusSubscription = null;
            console.log('⏹️ Status monitoring stopped');
        } else {
            console.warn('⚠️ statusSubscription is not a function:', this.statusSubscription);
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
        console.log('🔍 DEBUG: Current window location:', window.location.href);
        console.log('🔍 DEBUG: Document ready state:', document.readyState);
        
        // Simple, direct approach - create and show form immediately
        this.hideAllScreens();
        
        // Get app container
        const app = document.getElementById('app');
        if (!app) {
            console.error('❌ App container not found');
            console.log('🔍 DEBUG: Available elements:', document.body.innerHTML.substring(0, 500));
            return;
        }
        console.log('✅ App container found:', app);
        
        // Create form directly in app container with absolute positioning
        const formHTML = `
            <div id="qr-name-form" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
                                          background: #0D1117; display: flex; justify-content: center; align-items: center; 
                                          z-index: 10000; padding: 2rem; box-sizing: border-box;">
                <div style="background: rgba(0, 0, 0, 0.9); border: 2px solid #2ecc71; border-radius: 10px; 
                           padding: 3rem; max-width: 500px; width: 100%; text-align: center; 
                           box-shadow: 0 0 30px rgba(46, 204, 113, 0.3);">
                    <h2 style="color: #2ecc71; margin-bottom: 1rem; font-size: 1.8rem; font-family: 'Source Code Pro', monospace;">
                        <i class="fas fa-user"></i> Enter Your Name
                    </h2>
                    <p style="color: #33FF33; margin-bottom: 2rem; font-family: 'Source Code Pro', monospace;">
                        Please enter your name to request access to the GCC Restore Procedure.
                    </p>
                    
                    <form id="qr-name-form-element">
                        <div style="margin: 2rem 0;">
                            <label for="qr-user-name" style="display: block; color: #33FF33; margin-bottom: 0.5rem; 
                                                           font-weight: bold; font-family: 'Source Code Pro', monospace;">
                                Your Name:
                            </label>
                            <input type="text" id="qr-user-name" placeholder="Enter your full name" required maxlength="50" 
                                   style="width: 90%; padding: 12px 15px; background: rgba(0, 0, 0, 0.8); 
                                          border: 2px solid #2ecc71; color: #33FF33; border-radius: 5px; font-size: 1rem;
                                          font-family: 'Source Code Pro', monospace; text-align: center;">
                        </div>
                        <button type="submit" 
                                style="background: linear-gradient(45deg, #2ecc71, #3498db); color: white; border: none; 
                                       padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 1rem;
                                       font-family: 'Source Code Pro', monospace; margin-top: 1rem;">
                            <i class="fas fa-arrow-right"></i> Submit Request
                        </button>
                    </form>

                    <div id="qr-name-error" style="display: none; color: #e74c3c; margin-top: 1rem; 
                                                   font-family: 'Source Code Pro', monospace;"></div>
                </div>
            </div>
        `;
        
        // Remove any existing form first
        const existingForm = document.getElementById('qr-name-form');
        if (existingForm) {
            console.log('🔧 Removing existing form');
            existingForm.remove();
        }
        
        // Add the form to the page
        console.log('🔧 Adding form to page');
        app.insertAdjacentHTML('beforeend', formHTML);
        
        // Verify form was added
        const addedForm = document.getElementById('qr-name-form');
        if (addedForm) {
            console.log('✅ Form successfully added to DOM');
            console.log('🔍 Form styles:', addedForm.style.cssText);
        } else {
            console.error('❌ Form not found after adding to DOM');
        }
        
        // Attach event listener
        const form = document.getElementById('qr-name-form-element');
        if (form) {
            console.log('✅ Form element found, attaching event listener');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('qr-user-name');
                const userName = nameInput.value.trim();
                
                console.log('📤 QR Form submitted:', userName);
                
                if (!userName || userName.length < 2) {
                    const errorEl = document.getElementById('qr-name-error');
                    errorEl.style.display = 'block';
                    errorEl.textContent = 'Please enter a valid name (at least 2 characters)';
                    return;
                }
                
                // Process the submission
                this.handleQRNameSubmission(userName);
            });
        } else {
            console.error('❌ Form element not found after adding to DOM');
        }
        
        // Focus on input
        setTimeout(() => {
            const nameInput = document.getElementById('qr-user-name');
            if (nameInput) {
                nameInput.focus();
                console.log('✅ Focus set on input field');
            } else {
                console.error('❌ Input field not found');
            }
        }, 100);
        
        console.log('✅ QR Name input form setup completed');
    }
    
    handleQRNameSubmission(userName) {
        console.log('📤 Processing QR name submission for:', userName);
        
        // Store the user's name and token
        this.currentUser = userName;
        
        // Hide the form
        const form = document.getElementById('qr-name-form');
        if (form) {
            form.remove();
        }
        
        // Show processing state
        this.showRequestProcessing();
        
        // Submit the request directly to Firebase
        this.submitQRRequest(userName);
    }
    
    async submitQRRequest(userName) {
        try {
            console.log('📤 Submitting QR access request for:', userName);
            console.log('🔑 Using token:', this.accessToken);
            console.log('🔍 Checking DataService availability:', !!window.dataService);
            
            if (!window.dataService) {
                throw new Error('DataService not available');
            }
            
            const requestData = {
                userName: userName,
                token: this.accessToken || 'qr_direct_access',
                source: 'qr_code',
                qrToken: this.accessToken,
                timestamp: new Date().toISOString()
            };

            console.log('📊 QR Request data:', requestData);
            const result = await window.dataService.submitRequest(requestData);
            console.log('✅ QR Submit result:', result);
            
            if (result.success) {
                this.currentRequestId = result.requestId;
                console.log('🎯 QR Request submitted successfully, ID:', result.requestId);
                console.log('📋 Full QR request details:', result.request);
                this.showWaitingScreen();
                this.startStatusMonitoring();
            } else {
                throw new Error(result.error || 'Failed to submit QR request');
            }
        } catch (error) {
            console.error('❌ Error submitting QR request:', error);
            
            // Show error in the QR form area instead of regular name input area
            this.showQRError(`Error submitting request: ${error.message}`);
        }
    }
    
    showQRError(message) {
        console.log('🚨 Showing QR error:', message);
        
        // Remove any existing form
        const existingForm = document.getElementById('qr-name-form');
        if (existingForm) {
            existingForm.remove();
        }
        
        // Create error display
        const app = document.getElementById('app');
        if (app) {
            const errorHTML = `
                <div id="qr-error-form" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
                                              background: #0D1117; display: flex; justify-content: center; align-items: center; 
                                              z-index: 10000; padding: 2rem; box-sizing: border-box;">
                    <div style="background: rgba(0, 0, 0, 0.9); border: 2px solid #e74c3c; border-radius: 10px; 
                               padding: 3rem; max-width: 500px; width: 100%; text-align: center; 
                               box-shadow: 0 0 30px rgba(231, 76, 60, 0.3);">
                        <h2 style="color: #e74c3c; margin-bottom: 1rem; font-size: 1.8rem; font-family: 'Source Code Pro', monospace;">
                            <i class="fas fa-exclamation-triangle"></i> Request Error
                        </h2>
                        <p style="color: #FF6B6B; margin-bottom: 2rem; font-family: 'Source Code Pro', monospace;">
                            ${message}
                        </p>
                        <button onclick="window.location.reload()" 
                                style="background: linear-gradient(45deg, #e74c3c, #c0392b); color: white; border: none; 
                                       padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 1rem;
                                       font-family: 'Source Code Pro', monospace; margin-top: 1rem;">
                            <i class="fas fa-refresh"></i> Retry
                        </button>
                    </div>
                </div>
            `;
            app.insertAdjacentHTML('beforeend', errorHTML);
        }
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

        // Simple, clean waiting animation
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
            `;
        }

        // Clean status display
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

        // Ensure cancel button has proper content
        const cancelBtn = document.getElementById('cancel-request-btn');
        if (cancelBtn && !cancelBtn.innerHTML.trim()) {
            cancelBtn.innerHTML = `
                <i class="fas fa-times"></i> Cancel Request
            `;
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
        console.log('🎯 DEBUG: showSurveyScreen() called');
        this.hideAllScreens();
        
        const surveyScreen = document.getElementById('survey-screen');
        console.log('🎯 DEBUG: Survey screen element:', surveyScreen);
        
        if (surveyScreen) {
            surveyScreen.style.display = 'block';
            console.log('🎯 DEBUG: Survey screen display set to block');
        } else {
            console.error('❌ Survey screen element not found!');
            return;
        }
        
        // Rebuild survey form if needed
        const toggleGroup = document.querySelector('.toggle-group');
        if (toggleGroup && !toggleGroup.innerHTML.trim()) {
            console.log('🎯 DEBUG: Rebuilding toggle group');
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
        if (disclaimer && !disclaimer.innerHTML.trim()) {
            console.log('🎯 DEBUG: Rebuilding disclaimer');
            disclaimer.innerHTML = `
                <input type="checkbox" id="disclaimer-check" required>
                <label for="disclaimer-check">I understand this procedure impacts the entire conference center and will take approximately 20 minutes.</label>
            `;
        }
        
        console.log('🎯 DEBUG: showSurveyScreen() completed');
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
        console.log('🔧 hideAllScreens() called');
        const screens = [
            'auth-screen', 'location-permission-screen', 'name-input-screen', 'waiting-screen', 
            'access-granted-screen', 'access-denied-screen', 'survey-screen', 'step-screen', 'summary-screen'
        ];
        
        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) {
                screen.style.display = 'none';
                console.log(`🔧 Hidden screen: ${screenId}`);
            } else {
                console.log(`⚠️ Screen not found: ${screenId}`);
            }
        });
        
        // Also remove any existing QR forms
        const existingForm = document.getElementById('qr-name-form');
        if (existingForm) {
            existingForm.remove();
            console.log('🔧 Removed existing qr-name-form');
        }
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
    console.log('🚀 DOM loaded, initializing UserApp...');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 URL params:', window.location.search);
    
    try {
        window.userApp = new UserApp();
        console.log('✅ UserApp initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize UserApp:', error);
    }
});

// Export for testing/debugging
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserApp;
}
