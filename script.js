document.addEventListener('DOMContentLoaded', () => {
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
            return urlParams.get('token');
        },

        // Check if this is an access request
        isAccessRequest() {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('request') === 'access';
        },

        // Clear all authentication data
        logout() {
            localStorage.removeItem('gcc_session');
            localStorage.removeItem('gcc_session_token');
        }
    };

    // Token validation utility
    function isValidTokenFormat(token) {
        // Check if token is base64 URL-safe format (at least 32 characters)
        return token && typeof token === 'string' && token.length >= 32 && /^[A-Za-z0-9_-]+$/.test(token);
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
    const surveyScreen = document.getElementById('survey-screen');
    const stepScreen = document.getElementById('step-screen');
    const summaryScreen = document.getElementById('summary-screen');
    const authError = document.getElementById('auth-error');
    const requestProcessing = document.getElementById('request-processing');
    const requestStatus = document.getElementById('request-status');
    const accessCodeInput = document.getElementById('access-code-input');
    const accessCodeField = document.getElementById('access-code-field');
    const submitCodeBtn = document.getElementById('submit-code-btn');
    const logoutBtn = document.getElementById('logout-btn');
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
        // Check for access request in URL first
        if (authManager.isAccessRequest()) {
            console.log('Access request detected from URL');
            initiateAccessRequest();
            return;
        }
        
        // Check for token in URL
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
            
            // Remove token from URL for security
            const url = new URL(window.location);
            url.searchParams.delete('token');
            window.history.replaceState({}, document.title, url);
            
            // Show main app
            setTimeout(() => {
                showMainApp();
                
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

    // --- WEBSOCKET ACCESS REQUEST SYSTEM ---
    let websocket = null;
    let currentRequestId = null;

    function initiateAccessRequest() {
        showRequestProcessing();
        connectWebSocket();
        
        // Clear URL parameters
        const url = new URL(window.location);
        url.searchParams.delete('request');
        window.history.replaceState({}, document.title, url);
    }

    function connectWebSocket() {
        // Check if running on GitHub Pages (no WebSocket server available)
        if (location.hostname.includes('github.io')) {
            console.log('GitHub Pages detected - WebSocket not available');
            showGitHubPagesError();
            return;
        }
        
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${location.host}`;
        
        websocket = new WebSocket(wsUrl);
        
        websocket.onopen = () => {
            console.log('Connected to WebSocket server');
            updateRequestStatus('Connected to access control system...');
            
            // Register as user and request access
            websocket.send(JSON.stringify({
                type: 'register_user'
            }));
            
            // Send access request
            setTimeout(() => {
                websocket.send(JSON.stringify({
                    type: 'request_access',
                    userInfo: navigator.userAgent || 'Unknown User'
                }));
            }, 500);
        };
        
        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };
        
        websocket.onclose = () => {
            console.log('WebSocket connection closed');
            updateRequestStatus('Connection lost. Please try scanning the QR code again.');
        };
        
        websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            showAuthError('Connection failed. Please check your network and try again.');
            showAuthScreen();
        };
    }

    function handleWebSocketMessage(data) {
        console.log('Received WebSocket message:', data);
        
        switch (data.type) {
            case 'user_registered':
                updateRequestStatus('Registered successfully...');
                break;
                
            case 'request_submitted':
                currentRequestId = data.requestId;
                updateRequestStatus('Access request sent to administrator. Waiting for approval...');
                break;
                
            case 'request_approved':
                updateRequestStatus('Access approved! Enter the provided code below.');
                showAccessCodeInput();
                break;
                
            case 'request_denied':
                showAuthError('Access request denied by administrator.');
                setTimeout(() => {
                    showAuthScreen();
                }, 3000);
                break;
                
            case 'code_validation':
                if (data.valid) {
                    // Create session and show main app
                    authManager.createSession();
                    showMainApp();
                    
                    // Analytics event
                    if (typeof gtag === 'function') {
                        gtag('event', 'access_approved_authentication_success', {
                            'event_category': 'security'
                        });
                    }
                } else {
                    showAuthError(data.message || 'Invalid or expired access code');
                    accessCodeField.value = '';
                }
                break;
        }
    }

    function updateRequestStatus(message) {
        if (requestStatus) {
            requestStatus.textContent = message;
        }
    }

    function showRequestProcessing() {
        authScreen.style.display = 'block';
        authScreen.style.visibility = 'visible';
        requestProcessing.style.display = 'block';
        accessCodeInput.style.display = 'none';
        surveyScreen.style.display = 'none';
        stepScreen.style.display = 'none';
        summaryScreen.style.display = 'none';
        logoutBtn.style.display = 'none';
    }

    function showAccessCodeInput() {
        requestProcessing.style.display = 'none';
        accessCodeInput.style.display = 'block';
        accessCodeField.focus();
    }

    function validateAccessCode(code) {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
                type: 'validate_code',
                code: code
            }));
        } else {
            showAuthError('Connection lost. Please scan the QR code again.');
        }
    }

    function showGitHubPagesError() {
        updateRequestStatus('GitHub Pages Demo - WebSocket Not Available');
        setTimeout(() => {
            showAuthError('This real-time approval system requires a WebSocket server. For full testing, run locally with "node server.js"');
            setTimeout(() => {
                showAuthScreen();
            }, 5000);
        }, 2000);
    }

    function showAuthScreen() {
        console.log('showAuthScreen() called');
        authScreen.style.display = 'block';
        authScreen.style.visibility = 'visible';
        surveyScreen.style.display = 'none';
        stepScreen.style.display = 'none';
        summaryScreen.style.display = 'none';
        logoutBtn.style.display = 'none';
        requestProcessing.style.display = 'none';
        accessCodeInput.style.display = 'none';
        
        // Clear any error messages and input fields
        authError.style.display = 'none';
        if (accessCodeField) accessCodeField.value = '';
        
        // Close WebSocket connection if open
        if (websocket) {
            websocket.close();
            websocket = null;
        }
        
        console.log('showAuthScreen() completed');
    }

    function showMainApp() {
        console.log('showMainApp() called');
        console.log('authScreen before:', authScreen.style.display);
        authScreen.style.display = 'none !important';
        authScreen.style.visibility = 'hidden';
        console.log('authScreen after:', authScreen.style.display);
        surveyScreen.style.display = 'block';
        stepScreen.style.display = 'none';
        summaryScreen.style.display = 'none';
        logoutBtn.style.display = 'block';
        
        // Refresh session on activity
        authManager.refreshSession();
        console.log('showMainApp() completed');
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

    // Access code submission
    if (submitCodeBtn) {
        submitCodeBtn.addEventListener('click', () => {
            const code = accessCodeField.value.trim();
            if (code.length === 6 && /^[0-9]+$/.test(code)) {
                submitCodeBtn.disabled = true;
                validateAccessCode(code);
            } else {
                showAuthError('Please enter a valid 6-digit access code.');
            }
        });
    }

    // Access code input - Enter key support
    if (accessCodeField) {
        accessCodeField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && accessCodeField.value.trim().length === 6) {
                submitCodeBtn.click();
            }
        });

        // Auto-format input to numbers only
        accessCodeField.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            submitCodeBtn.disabled = false; // Re-enable button when user types
        });
    }

    // Logout functionality
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout? You will need to re-authenticate to continue.')) {
            authManager.logout();
            showAuthScreen();
            
            // Analytics event
            if (typeof gtag === 'function') {
                gtag('event', 'logout', {
                    'event_category': 'security'
                });
            }
        }
    });

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

    // --- INITIALIZATION ---
    initializeApp(); // Start the app with authentication check
});
