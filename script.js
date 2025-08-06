document.addEventListener('DOMContentLoaded', () => {
    // --- EMAILJS CONFIGURATION ---
    const emailConfig = {
        serviceId: 'service_pc4qthj',
        templateId: 'template_1cjpnbs',
        publicKey: 'qcBM1dZvUgg9wAXKx'
    };

    // Initialize EmailJS
    if (typeof emailjs !== 'undefined') {
        emailjs.init(emailConfig.publicKey);
    }

    // Email notification function
    function sendQRScanAlert(userAgent, timestamp, userName = null) {
        if (typeof emailjs === 'undefined') {
            console.warn('EmailJS not loaded, skipping email notification');
            return;
        }

        const templateParams = {
            procedure_name: 'GCC Restore Procedure',
            user_name: userName || `Anonymous User at ${new Date(timestamp).toLocaleString()}`,
            name: 'GCC System Access Request',
            email: 'jared_ambrose@gse.harvard.edu',
            scan_time: new Date(timestamp).toLocaleString(),
            user_agent: userAgent,
            location: 'GCC Conference Center',
            browser_info: `${navigator.platform} - ${userAgent.split('(')[1]?.split(')')[0] || 'Unknown Browser'}`
        };

        emailjs.send(emailConfig.serviceId, emailConfig.templateId, templateParams)
            .then((response) => {
                console.log('QR scan alert sent successfully:', response.status, response.text);
            })
            .catch((error) => {
                console.error('Failed to send QR scan alert:', error);
            });
    }

    // --- TOKEN-BASED AUTHENTICATION SYSTEM ---
    const authManager = {
        // Validate session token from URL or localStorage
        validateToken(token) {
            console.log('Validating token:', token);
            const storedData = localStorage.getItem('gcc_session_token');
            
            if (!storedData) {
                console.log('No stored token found');
                return false;
            }

            try {
                const tokenData = JSON.parse(storedData);
                const now = Date.now();
                console.log('Stored token expires:', new Date(tokenData.expires));
                
                // Check if token has expired (30 minutes)
                if (now > tokenData.expires) {
                    console.log('Token has expired');
                    localStorage.removeItem('gcc_session_token');
                    return false;
                }

                // Check if token matches
                const matches = token === tokenData.token;
                console.log('Token matches:', matches);
                return matches;
            } catch (e) {
                console.log('Error parsing stored token:', e);
                localStorage.removeItem('gcc_session_token');
                return false;
            }
        },

        // Store session token with 30-minute expiration
        storeToken(token) {
            const expirationTime = Date.now() + (30 * 60 * 1000); // 30 minutes
            const tokenData = {
                token: token,
                expires: expirationTime,
                created: Date.now()
            };
            localStorage.setItem('gcc_session_token', JSON.stringify(tokenData));
            return expirationTime;
        },

        // Check if user has valid session
        hasValidSession() {
            const sessionData = localStorage.getItem('gcc_session');
            if (!sessionData) return false;

            try {
                const session = JSON.parse(sessionData);
                const now = Date.now();
                
                // Session timeout after 2 hours of inactivity
                if (now > session.expires) {
                    localStorage.removeItem('gcc_session');
                    return false;
                }

                return true;
            } catch (e) {
                localStorage.removeItem('gcc_session');
                return false;
            }
        },

        // Create authenticated session
        createSession() {
            const sessionData = {
                authenticated: true,
                expires: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
                created: Date.now()
            };
            localStorage.setItem('gcc_session', JSON.stringify(sessionData));
        },

        // Update session expiration (extend on activity)
        refreshSession() {
            if (this.hasValidSession()) {
                this.createSession();
            }
        },

        // Get token from URL parameters
        getTokenFromUrl() {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            console.log('🔍 URL search params:', window.location.search);
            console.log('🔍 Extracted token:', token);
            return token;
        },

    };

    // Token validation utility
    function isValidTokenFormat(token) {
        // Accept demo token 'test123' or base64 URL-safe format (at least 32 characters)
        if (token === 'test123') {
            console.log('🎯 Demo token accepted:', token);
            return true;
        }
        // Check if token is base64 URL-safe format (at least 32 characters)
        const isValid = token && typeof token === 'string' && token.length >= 32 && /^[A-Za-z0-9_-]+$/.test(token);
        console.log('🔍 Token validation result:', { token, isValid });
        return isValid;
    }

    // --- CACHE MANAGEMENT ---
    function checkForUpdates() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ command: 'checkForUpdates' });
        }
    }

    // Check for updates when the page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkForUpdates();
        }
    });

    // --- STATE MANAGEMENT ---
    let state = {
        currentUserIssue: null,
        stepsToShow: [],
        currentStepIndex: 0,
        timer: null,
        timeLeft: 15 * 60,
        timerClickCount: 0,
        timerClickTimer: null
    };

    // --- DATA: All possible steps ---
    const allSteps = [
        { stepKey: 'step1', title: "Assess the Issue", mainInstruction: "Review the information below based on your survey selection. When you have finished, click 'Next'.", conditional: 'always' },
        { stepKey: 'step2', title: "Power Down the DSP Stack", mainInstruction: "<img src='images/DSP_Stack.jpg' alt='DSP Stack with Red Rocker Switches' style='max-width: 100%; height: auto; margin-bottom: 15px; border-radius: 5px;'><p>Locate the two rack-mounted red rocker switches near the DSP equipment stack. Turn OFF both switches. Wait for all indicator lights on the DSPs to fully extinguish (may take several seconds).</p>", conditional: 'always' },
        { stepKey: 'step3', title: "Power Down the AV Subnet and PoE Devices (Cameras, Dante endpoints, Microphone endpoints)", mainInstruction: "<img src='images/AV_Subnet-POE-Devices.jpg' alt='AV Subnet POE Devices' style='max-width: 100%; height: auto; margin-bottom: 15px; border-radius: 5px;'><ol><li>Locate the rack mounted red rocker switch near the Kumo AJA SDI Switch.</li><li>Turn off</li><li>Wait 10 seconds.</li><li>Turn on</li></ol>", conditional: 'micOnly' },
        { stepKey: 'step4', title: "Power Down the Crestron DM64x64 Matrix Switch", mainInstruction: "<img src='images/RG17.png' alt='Circuit RG #17 Power Cables' style='max-width: 100%; height: auto; margin-bottom: 15px; border-radius: 5px;'><ol><li>Locate the two power cables for the Crestron DM64x64 matrix switch connected to circuit RG #17 behind the racks.</li><li>Unplug redundant power cables (both must be disconnected to power cycle completely).</li><li>Wait a minimum of 10 seconds.</li></ol>", conditional: 'videoOrAudioOnly' },
        { stepKey: 'step5', title: "Reboot the Crestron Control Processor", mainInstruction: "<div style='max-width: 100%; height: 200px; overflow: hidden; margin-bottom: 15px; border-radius: 5px;'><img src='images/AV_Subnet-POE-Devices.jpg' alt='AV Subnet POE Devices - Top Section' style='width: 100%; height: auto; object-fit: cover; object-position: top;'></div><p>Locate the Crestron Control Processor. Using the front panel menu and navigation buttons, select the Reboot option and confirm execution. Visually confirm the reboot process has initiated.</p>", conditional: 'always' },
        { stepKey: 'step6', title: "Restore Power to the Crestron DM64x64 Matrix Switch", mainInstruction: "<img src='images/RG17.png' alt='Circuit RG #17 Power Cables' style='max-width: 100%; height: auto; margin-bottom: 15px; border-radius: 5px;'><p>Reconnect redundant power cables to circuit RG #17.</p>", conditional: 'videoOrAudioOnly' },
        { stepKey: 'step7', title: "Power Up the DSP Stack", mainInstruction: "<img src='images/DSP_Stack.jpg' alt='DSP Stack with Red Rocker Switches' style='max-width: 100%; height: auto; margin-bottom: 15px; border-radius: 5px;'><p>Return to the DSP stack. Turn ON both red rocker switches and confirm the units power up.</p>", conditional: 'always' },
        { stepKey: 'step8', title: "Wait 15 Minutes — No User Interaction", mainInstruction: "Do not touch or operate any touch panels or control interfaces during this period. This waiting period is critical. Click the button below to start the timer.", conditional: 'always', hasTimer: true },
        { stepKey: 'step9', title: "Confirm DSP Status", mainInstruction: "After 15 minutes, verify that all DSP units display normal green indicator lights.", conditional: 'always' },
        { stepKey: 'step10', title: "Verify Touch Panel Functionality and Audio", mainInstruction: "Access the main touch panel and check for audio level display. Confirm the Volume Up and Volume Down controls are responsive and update the level indicator appropriately.", conditional: 'always' },
        { stepKey: 'step11', title: "Reconfigure Room Settings via Tech Panel", mainInstruction: "<p>Since we rebooted the processor, we need to re-initialize how the spaces are configured.</p><ol><li>Disable floor logic on the tech panel.</li><li>Combine the required spaces (as per event configuration).</li><li>Select the appropriate display orientation (North, South, East, or West).</li></ol>", conditional: 'always' },
        { stepKey: 'step12', title: "System Verification at Main Podium", mainInstruction: "Proceed to the main podium. The Harvard Shield should be visible on the podium touch panel. Press the shield and select the desired source. Confirm that the appropriate projection screens lower and the AV system operates normally.", conditional: 'always' }
    ];

    // --- ELEMENT SELECTORS ---
    const authScreen = document.getElementById('auth-screen');
    const nameInputScreen = document.getElementById('name-input-screen');
    const waitingScreen = document.getElementById('waiting-screen');
    const surveyScreen = document.getElementById('survey-screen');
    const stepScreen = document.getElementById('step-screen');
    const summaryScreen = document.getElementById('summary-screen');
    const authError = document.getElementById('auth-error');
    const tokenProcessing = document.getElementById('token-processing');
    const nameForm = document.getElementById('name-form');
    const userNameInput = document.getElementById('user-name');
    const nameError = document.getElementById('name-error');
    const waitingUserName = document.getElementById('waiting-user-name');
    const waitingTimer = document.getElementById('waiting-timer');
    const cancelRequestBtn = document.getElementById('cancel-request-btn');
    const issueForm = document.getElementById('issue-form');
    const startRecoveryBtn = document.getElementById('start-recovery-btn');
    const disclaimerCheckbox = document.getElementById('disclaimer-check');
    const stepTitle = document.getElementById('step-title');
    const stepCounter = document.getElementById('step-counter');
    const stepInstructions = document.getElementById('step-instructions');
    const timerContainer = document.getElementById('timer-container');
    const timerDisplay = document.getElementById('timer-display');
    const startTimerBtn = document.getElementById('start-timer-btn');
    const backBtn = document.getElementById('back-btn');
    const nextBtn = document.getElementById('next-btn');
    const restartBtns = [document.getElementById('restart-btn'), document.getElementById('restart-btn-summary')];

    // --- AUTHENTICATION FUNCTIONS ---
    function showAuthError(message) {
        authError.textContent = message;
        authError.style.display = 'block';
        setTimeout(() => {
            authError.style.display = 'none';
        }, 5000);
    }

    function initializeApp() {
        // Check for token in URL first
        const tokenFromUrl = authManager.getTokenFromUrl();
        
        if (tokenFromUrl) {
            console.log('Token found in URL:', tokenFromUrl);
            processTokenFromUrl(tokenFromUrl);
            return;
        }

        // Check if user already has valid session
        if (authManager.hasValidSession()) {
            showMainApp();
            return;
        }

        // Show authentication screen
        showAuthScreen();
    }

    function processTokenFromUrl(token) {
        // Show loading state
        showTokenProcessing();

        // Validate token format
        if (!isValidTokenFormat(token)) {
            showAuthError('Invalid access token format. Please scan the QR code again.');
            showAuthScreen();
            return;
        }

        // Store token and create session
        try {
            authManager.storeToken(token);
            authManager.createSession();
            
            // Send QR scan alert email
            sendQRScanAlert(
                navigator.userAgent,
                Date.now()
            );
            
            // Remove token from URL for security
            const url = new URL(window.location);
            url.searchParams.delete('token');
            window.history.replaceState({}, document.title, url);
            
            // Show name input screen instead of main app
            setTimeout(() => {
                console.log('🎯 Token validated successfully - showing name input screen');
                showNameInputScreen();
                
                // Analytics event
                if (typeof gtag === 'function') {
                    gtag('event', 'token_authentication_success', {
                        'event_category': 'security'
                    });
                }
            }, 1000); // Brief delay to show processing
            
        } catch (error) {
            console.error('Error processing token:', error);
            showAuthError('Error processing access token. Please try scanning the QR code again.');
            showAuthScreen();
        }
    }

    function showTokenProcessing() {
        authScreen.style.display = 'block';
        authScreen.style.visibility = 'visible';
        tokenProcessing.style.display = 'block';
        nameInputScreen.style.display = 'none';
        waitingScreen.style.display = 'none';
        surveyScreen.style.display = 'none';
        stepScreen.style.display = 'none';
        summaryScreen.style.display = 'none';
    }

    function showAuthScreen() {
        console.log('🔍 showAuthScreen() called');
        authScreen.style.display = 'block';
        authScreen.style.visibility = 'visible';
        nameInputScreen.style.display = 'none';
        waitingScreen.style.display = 'none';
        surveyScreen.style.display = 'none';
        stepScreen.style.display = 'none';
        summaryScreen.style.display = 'none';
        tokenProcessing.style.display = 'none';
        
        // Clear any error messages
        authError.style.display = 'none';
        
        console.log('✅ showAuthScreen() completed - should see auth screen now');
        
        // Debug current screen states
        console.log('📺 Screen states:', {
            auth: authScreen.style.display,
            nameInput: nameInputScreen ? nameInputScreen.style.display : 'NOT FOUND',
            waiting: waitingScreen ? waitingScreen.style.display : 'NOT FOUND'
        });
    }

    function showNameInputScreen() {
        console.log('showNameInputScreen() called');
        authScreen.style.display = 'none';
        nameInputScreen.style.display = 'block';
        waitingScreen.style.display = 'none';
        surveyScreen.style.display = 'none';
        stepScreen.style.display = 'none';
        summaryScreen.style.display = 'none';
        
        // Clear any error messages and focus on name input
        nameError.style.display = 'none';
        userNameInput.value = '';
        userNameInput.focus();
        
        console.log('showNameInputScreen() completed');
    }

    function showWaitingScreen(userName) {
        console.log('showWaitingScreen() called for user:', userName);
        authScreen.style.display = 'none';
        nameInputScreen.style.display = 'none';
        waitingScreen.style.display = 'block';
        surveyScreen.style.display = 'none';
        stepScreen.style.display = 'none';
        summaryScreen.style.display = 'none';
        
        // Set user name in waiting screen
        waitingUserName.textContent = `Hello, ${userName}`;
        
        // Start waiting timer
        startWaitingTimer();
        
        console.log('showWaitingScreen() completed');
    }

    function showMainApp() {
        console.log('showMainApp() called');
        console.log('authScreen before:', authScreen.style.display);
        authScreen.style.display = 'none !important';
        authScreen.style.visibility = 'hidden';
        nameInputScreen.style.display = 'none';
        waitingScreen.style.display = 'none';
        console.log('authScreen after:', authScreen.style.display);
        surveyScreen.style.display = 'block';
        stepScreen.style.display = 'none';
        summaryScreen.style.display = 'none';
        
        // Refresh session on activity
        authManager.refreshSession();
        console.log('showMainApp() completed');
    }

    // --- NAME CAPTURE & WAITING FUNCTIONS ---
    let waitingStartTime = null;
    let waitingTimerInterval = null;

    function startWaitingTimer() {
        waitingStartTime = Date.now();
        waitingTimerInterval = setInterval(() => {
            const elapsed = Date.now() - waitingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            waitingTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    function stopWaitingTimer() {
        if (waitingTimerInterval) {
            clearInterval(waitingTimerInterval);
            waitingTimerInterval = null;
        }
    }

    function validateUserName(name) {
        const trimmedName = name.trim();
        if (!trimmedName) {
            return { valid: false, error: 'Please enter your name' };
        }
        if (trimmedName.length < 2) {
            return { valid: false, error: 'Name must be at least 2 characters long' };
        }
        if (trimmedName.length > 50) {
            return { valid: false, error: 'Name must be less than 50 characters' };
        }
        // Basic sanitization - only allow letters, spaces, hyphens, apostrophes
        if (!/^[a-zA-Z\s\-']+$/.test(trimmedName)) {
            return { valid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
        }
        return { valid: true, name: trimmedName };
    }

    async function submitAccessRequest(userName) {
        console.log('Submitting access request for:', userName);
        
        // Generate unique request ID
        const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Create request object
        const request = {
            id: requestId,
            userName: userName,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            browserInfo: `${navigator.platform} - ${navigator.userAgent.split('(')[1]?.split(')')[0] || 'Unknown Browser'}`,
            status: 'pending'
        };
        
        // Store user request ID in session
        sessionStorage.setItem('gcc_user_name', userName);
        sessionStorage.setItem('gcc_request_id', requestId);
        
        // Show waiting screen
        showWaitingScreen(userName);
        
        try {
            // Submit to GitHub backend
            const result = await window.githubBackend.submitRequest(request);
            
            if (result.success) {
                console.log('✅ Request submitted to backend');
                
                // Send email notification with user name  
                sendQRScanAlert(navigator.userAgent, Date.now(), userName);
                
                // Show share code in waiting screen
                const shareCode = window.githubBackend.generateShareCode(request);
                const shareCodeElement = document.createElement('div');
                shareCodeElement.innerHTML = `
                    <div style="margin: 1rem 0; padding: 1rem; background: rgba(52, 152, 219, 0.1); border: 1px solid #3498db; border-radius: 5px;">
                        <p style="color: #3498db; margin: 0 0 0.5rem 0; font-weight: bold;">
                            <i class="fas fa-share-alt"></i> Share Code for Operator:
                        </p>
                        <p style="font-family: 'Courier New', monospace; font-size: 1.2rem; color: var(--primary-color); margin: 0; word-break: break-all;">
                            ${shareCode}
                        </p>
                        <p style="color: #95a5a6; font-size: 0.9rem; margin: 0.5rem 0 0 0;">
                            Give this code to the operator to process your request
                        </p>
                    </div>
                `;
                waitingScreen.querySelector('.waiting-container').appendChild(shareCodeElement);
                
                // Start polling for approval
                startPollingForApproval(requestId);
            } else {
                throw new Error(result.error || 'Failed to submit request');
            }
        } catch (error) {
            console.error('❌ Failed to submit request:', error);
            
            // Show error message
            waitingScreen.innerHTML = `
                <div class="waiting-container">
                    <h2><i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i> Submission Failed</h2>
                    <p style="color: #e74c3c; font-size: 1.1rem;">Unable to submit your access request. Please try again.</p>
                    <p style="color: #95a5a6; font-size: 0.9rem;">Error: ${error.message}</p>
                    <button onclick="location.reload()" class="submit-btn" style="margin-top: 2rem;">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }

    // --- APPROVAL POLLING ---
    let approvalPollingInterval = null;

    function startPollingForApproval(requestId) {
        console.log('Starting approval polling for request:', requestId);
        
        approvalPollingInterval = setInterval(() => {
            checkApprovalStatus(requestId);
        }, 2000); // Poll every 2 seconds
        
        // Stop polling after 10 minutes
        setTimeout(() => {
            if (approvalPollingInterval) {
                clearInterval(approvalPollingInterval);
                handleApprovalTimeout(requestId);
            }
        }, 600000); // 10 minutes
    }

    async function checkApprovalStatus(requestId) {
        try {
            const result = await window.githubBackend.checkRequestStatus(requestId);
            
            if (result.found && result.status !== 'pending') {
                clearInterval(approvalPollingInterval);
                approvalPollingInterval = null;
                
                if (result.status === 'approved') {
                    handleApprovalSuccess();
                } else if (result.status === 'denied') {
                    handleApprovalDenied();
                }
            }
        } catch (error) {
            console.error('Error checking approval status:', error);
        }
    }

    function handleApprovalSuccess() {
        console.log('Request approved!');
        stopWaitingTimer();
        showMainApp();
        
        // Analytics event
        if (typeof gtag === 'function') {
            gtag('event', 'access_approved', {
                'event_category': 'approval'
            });
        }
    }

    function handleApprovalDenied() {
        console.log('Request denied');
        stopWaitingTimer();
        
        // Show denial message
        waitingScreen.innerHTML = `
            <div class="waiting-container">
                <h2><i class="fas fa-times-circle" style="color: #e74c3c;"></i> Access Denied</h2>
                <p style="color: #e74c3c; font-size: 1.2rem;">Your access request has been denied by the operator.</p>
                <button onclick="location.reload()" class="submit-btn" style="margin-top: 2rem;">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }

    function handleApprovalTimeout(requestId) {
        console.log('Request timed out');
        stopWaitingTimer();
        
        // Remove from pending
        let pendingRequests = JSON.parse(localStorage.getItem('gcc_pending_requests') || '[]');
        pendingRequests = pendingRequests.filter(r => r.id !== requestId);
        localStorage.setItem('gcc_pending_requests', JSON.stringify(pendingRequests));
        
        // Show timeout message
        waitingScreen.innerHTML = `
            <div class="waiting-container">
                <h2><i class="fas fa-clock" style="color: #f39c12;"></i> Request Timeout</h2>
                <p style="color: #f39c12; font-size: 1.2rem;">Your access request has timed out after 10 minutes.</p>
                <button onclick="location.reload()" class="submit-btn" style="margin-top: 2rem;">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }


    // --- FUNCTIONS ---
    function typewriterEffect(element, text, speed = 50) {
        element.innerHTML = '<span class="cursor"></span>';
        let i = 0;
        
        function typeChar() {
            if (i < text.length) {
                const currentText = text.substring(0, i + 1);
                element.innerHTML = `${currentText}<span class="cursor"></span>`;
                i++;
                setTimeout(typeChar, speed);
            }
        }
        
        typeChar();
    }

    function renderCurrentStep() {
        const step = state.stepsToShow[state.currentStepIndex];
        if (!step) return;

        // Scroll to top of the page for better user experience
        window.scrollTo(0, 0);

        // Start typewriter effect for the title
        typewriterEffect(stepTitle, step.title, 30);
        
        stepCounter.textContent = `Step ${state.currentStepIndex + 1} of ${state.stepsToShow.length}`;
        stepInstructions.innerHTML = `<p>${step.mainInstruction}</p>`;

        // Handle timer visibility and button state
        if (step.hasTimer) {
            timerContainer.style.display = 'block';
            nextBtn.disabled = true; // Disable next button until timer expires or override
            
            // Add click listener to entire document for override (hidden functionality)
            document.addEventListener('click', handleTimerOverrideClick);
        } else {
            timerContainer.style.display = 'none';
            // Remove click listener when not on timer step
            document.removeEventListener('click', handleTimerOverrideClick);
        }

        // Update button states
        backBtn.disabled = state.currentStepIndex === 0;
        nextBtn.textContent = (state.currentStepIndex === state.stepsToShow.length - 1) ? 'Finish' : 'Next';
    }

    function startTimer() {
        startTimerBtn.disabled = true;
        nextBtn.disabled = true; // Ensure next is disabled when timer starts
        state.timerClickCount = 0; // Reset click count when timer starts
        
        state.timer = setInterval(() => {
            state.timeLeft--;
            const minutes = Math.floor(state.timeLeft / 60);
            const seconds = state.timeLeft % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (state.timeLeft <= 0) {
                clearInterval(state.timer);
                timerDisplay.textContent = "Time's up!";
                alert("The 15-minute waiting period is complete. You may now proceed to the next step.");
                nextBtn.disabled = false; // Enable next button when timer completes
                startTimerBtn.disabled = false;
            }
        }, 1000);
    }

    function handleTimerOverrideClick(event) {
        // Only handle clicks when on timer step and next button is disabled
        const currentStep = state.stepsToShow[state.currentStepIndex];
        if (!currentStep || !currentStep.hasTimer || !nextBtn.disabled) {
            return;
        }
        
        state.timerClickCount++;
        
        // Reset click timer if this is the first click
        if (state.timerClickCount === 1) {
            clearTimeout(state.timerClickTimer);
            state.timerClickTimer = setTimeout(() => {
                state.timerClickCount = 0;
                updateOverrideDisplay();
            }, 5000); // Reset after 5 seconds
        }
        
        updateOverrideDisplay();
        
        // Check if user clicked 5 times within 5 seconds
        if (state.timerClickCount >= 5) {
            clearInterval(state.timer);
            state.timer = null;
            clearTimeout(state.timerClickTimer);
            nextBtn.disabled = false;
            state.timerClickCount = 0;
            
            timerDisplay.textContent = "Override activated!";
            const overrideDiv = document.getElementById('timer-override');
            if (overrideDiv) {
                overrideDiv.innerHTML = '<p style="color: #33FF33;">✓ Override activated. You may proceed.</p>';
            }
        }
    }

    function updateOverrideDisplay() {
        // Hidden functionality - no visual feedback until override is activated
    }

    function restartApp() {
        // Reset state
        state.currentUserIssue = null;
        state.stepsToShow = [];
        state.currentStepIndex = 0;
        clearInterval(state.timer);
        state.timer = null;
        state.timeLeft = 15 * 60;
        timerDisplay.textContent = '15:00';
        startTimerBtn.disabled = false;
        
        // Reset timer override state
        if (state.timerClickTimer) {
            clearTimeout(state.timerClickTimer);
            state.timerClickTimer = null;
        }
        state.timerClickCount = 0;
        
        // Remove click listener
        document.removeEventListener('click', handleTimerOverrideClick);

        // Reset UI
        issueForm.reset();
        startRecoveryBtn.disabled = true;
        nextBtn.disabled = false; // Reset next button state
        
        // Check authentication before showing main app
        if (authManager.hasValidSession()) {
            showMainApp();
        } else {
            showAuthScreen();
        }
    }

    // --- AUTHENTICATION EVENT LISTENERS ---


    // Session refresh on user activity
    const activityEvents = ['click', 'keypress', 'mousemove', 'scroll'];
    activityEvents.forEach(event => {
        document.addEventListener(event, () => {
            if (authManager.hasValidSession()) {
                authManager.refreshSession();
            }
        }, { passive: true });
    });

    // --- EVENT LISTENERS ---
    disclaimerCheckbox.addEventListener('change', () => {
        startRecoveryBtn.disabled = !disclaimerCheckbox.checked;
    });

    issueForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.currentUserIssue = document.querySelector('input[name="issue"]:checked').value;

        // --- Google Analytics Event ---
        if (typeof gtag === 'function') {
            gtag('event', 'recovery_started', {
                'event_category': 'engagement',
                'event_label': state.currentUserIssue
            });
        }

        // Filter steps based on issue
        const isVideoAudio = state.currentUserIssue === 'video' || state.currentUserIssue === 'audio';
        const isMic = state.currentUserIssue === 'mic';
        let filteredSteps = allSteps.filter(step => {
            return step.conditional === 'always' || 
                   (isVideoAudio && step.conditional === 'videoOrAudioOnly') ||
                   (isMic && step.conditional === 'micOnly');
        });

        // If ONLY video issue is selected, remove all DSP and audio-related steps by their key
        if (state.currentUserIssue === 'video') {
            const stepsToRemove = ['step2', 'step7', 'step9', 'step10'];
            filteredSteps = filteredSteps.filter(step => !stepsToRemove.includes(step.stepKey));
        } else if (state.currentUserIssue === 'mic') {
            const stepsToRemove = ['step4', 'step5', 'step9', 'step10', 'step11', 'step12'];
            filteredSteps = filteredSteps.filter(step => !stepsToRemove.includes(step.stepKey));
        }
        
        state.stepsToShow = JSON.parse(JSON.stringify(filteredSteps)); // Deep copy

        // ALWAYS change Step 1 instruction
        const step1 = state.stepsToShow.find(step => step.stepKey === 'step1');
        if (step1) {
            step1.mainInstruction = "Have you thoroughly troubleshot the device and endpoint?";
        }

        // Transition to step screen
        surveyScreen.style.display = 'none';
        stepScreen.style.display = 'block';
        renderCurrentStep();
    });

    nextBtn.addEventListener('click', () => {
        // Normal next button behavior
        if (state.currentStepIndex < state.stepsToShow.length - 1) {
            state.currentStepIndex++;
            renderCurrentStep();
        } else {
            // Reached the end
            stepScreen.style.display = 'none';
            summaryScreen.style.display = 'block';
        }
    });

    backBtn.addEventListener('click', () => {
        if (state.currentStepIndex > 0) {
            state.currentStepIndex--;
            renderCurrentStep();
        }
    });

    restartBtns.forEach(btn => btn.addEventListener('click', restartApp));
    startTimerBtn.addEventListener('click', startTimer);

    // --- NAME CAPTURE EVENT LISTENERS ---
    nameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const userName = userNameInput.value;
        const validation = validateUserName(userName);
        
        if (!validation.valid) {
            nameError.textContent = validation.error;
            nameError.style.display = 'block';
            return;
        }
        
        // Hide error and submit request
        nameError.style.display = 'none';
        submitAccessRequest(validation.name);
    });

    cancelRequestBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to cancel your access request?')) {
            stopWaitingTimer();
            sessionStorage.removeItem('gcc_user_name');
            showAuthScreen();
        }
    });

    // --- INITIALIZATION ---
    initializeApp(); // Start the app with authentication check
});
