document.addEventListener('DOMContentLoaded', () => {
    // --- 2FA AUTHENTICATION SYSTEM ---
    const authManager = {
        // Generate a random 6-digit code
        generateCode() {
            return Math.floor(100000 + Math.random() * 900000).toString();
        },

        // Store valid code with expiration timestamp
        storeCode(code) {
            const expirationTime = Date.now() + (15 * 60 * 1000); // 15 minutes
            const codeData = {
                code: code,
                expires: expirationTime,
                generated: Date.now()
            };
            localStorage.setItem('gcc_auth_code', JSON.stringify(codeData));
            return expirationTime;
        },

        // Validate entered code
        validateCode(enteredCode) {
            const storedData = localStorage.getItem('gcc_auth_code');
            if (!storedData) return false;

            try {
                const codeData = JSON.parse(storedData);
                const now = Date.now();
                
                // Check if code has expired
                if (now > codeData.expires) {
                    localStorage.removeItem('gcc_auth_code');
                    return false;
                }

                // Check if code matches
                return enteredCode === codeData.code;
            } catch (e) {
                localStorage.removeItem('gcc_auth_code');
                return false;
            }
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

        // Clear all authentication data
        logout() {
            localStorage.removeItem('gcc_session');
            localStorage.removeItem('gcc_auth_code');
        }
    };

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
    const authForm = document.getElementById('auth-form');
    const accessCodeInput = document.getElementById('access-code');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authError = document.getElementById('auth-error');
    const generateCodeBtn = document.getElementById('generate-code-btn');
    const generatedCodeDisplay = document.getElementById('generated-code-display');
    const currentCodeSpan = document.getElementById('current-code');
    const codeExpiresSpan = document.getElementById('code-expires');
    const copyCodeBtn = document.getElementById('copy-code-btn');
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

    function updateCodeDisplay(code, expirationTime) {
        currentCodeSpan.textContent = code;
        const expiryDate = new Date(expirationTime);
        codeExpiresSpan.textContent = `Expires: ${expiryDate.toLocaleTimeString()}`;
        generatedCodeDisplay.style.display = 'block';
    }

    function initializeApp() {
        // Check if user already has valid session
        if (authManager.hasValidSession()) {
            showMainApp();
            return;
        }

        // Show authentication screen
        showAuthScreen();
    }

    function showAuthScreen() {
        authScreen.style.display = 'block';
        surveyScreen.style.display = 'none';
        stepScreen.style.display = 'none';
        summaryScreen.style.display = 'none';
        logoutBtn.style.display = 'none';
        accessCodeInput.focus();
    }

    function showMainApp() {
        authScreen.style.display = 'none';
        surveyScreen.style.display = 'block';
        stepScreen.style.display = 'none';
        summaryScreen.style.display = 'none';
        logoutBtn.style.display = 'block';
        
        // Refresh session on activity
        authManager.refreshSession();
    }

    function authenticateUser(code) {
        if (authManager.validateCode(code)) {
            authManager.createSession();
            showMainApp();
            
            // Analytics event
            if (typeof gtag === 'function') {
                gtag('event', 'authentication_success', {
                    'event_category': 'security'
                });
            }
            return true;
        } else {
            showAuthError('Invalid or expired access code. Please try again.');
            
            // Analytics event
            if (typeof gtag === 'function') {
                gtag('event', 'authentication_failed', {
                    'event_category': 'security'
                });
            }
            return false;
        }
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
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredCode = accessCodeInput.value.trim();
        
        if (enteredCode.length !== 6) {
            showAuthError('Access code must be 6 digits.');
            return;
        }

        authenticateUser(enteredCode);
        accessCodeInput.value = '';
    });

    generateCodeBtn.addEventListener('click', () => {
        const newCode = authManager.generateCode();
        const expirationTime = authManager.storeCode(newCode);
        updateCodeDisplay(newCode, expirationTime);
        
        // Analytics event
        if (typeof gtag === 'function') {
            gtag('event', 'code_generated', {
                'event_category': 'security'
            });
        }
    });

    copyCodeBtn.addEventListener('click', async () => {
        const code = currentCodeSpan.textContent;
        try {
            await navigator.clipboard.writeText(code);
            copyCodeBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                copyCodeBtn.innerHTML = '<i class="fas fa-copy"></i>';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    });

    // Auto-format access code input
    accessCodeInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        if (value.length > 6) value = value.slice(0, 6);
        e.target.value = value;
    });

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
