document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let state = {
        currentUserIssue: null,
        stepsToShow: [],
        currentStepIndex: 0,
        timer: null,
        timeLeft: 15 * 60,
    };

    // --- DATA: All possible steps ---
    const allSteps = [
        { stepKey: 'step1', title: "Assess the Issue", mainInstruction: "Review the information below based on your survey selection. When you have finished, click 'Next'.", conditional: 'always' },
        { stepKey: 'step2', title: "Power Down the DSP Stack", mainInstruction: "Locate the two rack-mounted red rocker switches near the DSP equipment stack. Turn OFF both switches. Wait for all indicator lights on the DSPs to fully extinguish (may take several seconds).", conditional: 'always' },
        { stepKey: 'step3', title: "Power Down the Crestron DM64x64 Matrix Switch", mainInstruction: "Locate the Crestron DM64x64 matrix switch in the AV rack. Unplug redundant power cables from the rear of the unit (both must be disconnected to power cycle completely). Wait a minimum of 10 seconds.", conditional: 'videoOrAudioOnly' },
        { stepKey: 'step4', title: "Reboot the Crestron Control Processor", mainInstruction: "Locate the Crestron Control Processor. Using the front panel menu and navigation buttons, select the Reboot option and confirm execution. Visually confirm the reboot process has initiated.", conditional: 'always' },
        { stepKey: 'step5', title: "Restore Power to the Crestron DM64x64 Matrix Switch", mainInstruction: "Reconnect redundant power cables to the Crestron DM64x64 matrix switch. Verify start-up sequence via status LEDs or front panel display.", conditional: 'videoOrAudioOnly' },
        { stepKey: 'step6', title: "Power Up the DSP Stack", mainInstruction: "Return to the DSP stack. Turn ON both red rocker switches and confirm the units power up.", conditional: 'always' },
        { stepKey: 'step7', title: "Wait 15 Minutes — No User Interaction", mainInstruction: "Do not touch or operate any touch panels or control interfaces during this period. This waiting period is critical. Click the button below to start the timer.", conditional: 'always', hasTimer: true },
        { stepKey: 'step8', title: "Confirm DSP Status", mainInstruction: "After 15 minutes, verify that all DSP units display normal green indicator lights.", conditional: 'always' },
        { stepKey: 'step9', title: "Verify Touch Panel Functionality and Audio", mainInstruction: "Access the main touch panel and check for audio level display. Confirm the Volume Up and Volume Down controls are responsive and update the level indicator appropriately.", conditional: 'always' },
        { stepKey: 'step10', title: "Reconfigure Room Settings via Tech Panel", mainInstruction: "Disable floor logic on the tech panel. Combine the required spaces (as per event configuration). Select the appropriate display orientation (North, South, East, or West).", conditional: 'always' },
        { stepKey: 'step11', title: "System Verification at Main Podium", mainInstruction: "Proceed to the main podium. The Harvard Logo should be visible on the podium touch panel. Press the logo and select the desired source. Confirm that the appropriate projection screens lower and the AV system operates normally.", conditional: 'always' }
    ];

    // --- ELEMENT SELECTORS ---
    const surveyScreen = document.getElementById('survey-screen');
    const stepScreen = document.getElementById('step-screen');
    const summaryScreen = document.getElementById('summary-screen');
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

    // --- FUNCTIONS ---
    function renderCurrentStep() {
        const step = state.stepsToShow[state.currentStepIndex];
        if (!step) return;

        stepTitle.innerHTML = `${step.title} <span class="cursor"></span>`;
        stepCounter.textContent = `Step ${state.currentStepIndex + 1} of ${state.stepsToShow.length}`;
        stepInstructions.innerHTML = `<p>${step.mainInstruction}</p>`;

        // Handle timer visibility
        timerContainer.style.display = step.hasTimer ? 'block' : 'none';

        // Update button states
        backBtn.disabled = state.currentStepIndex === 0;
        nextBtn.textContent = (state.currentStepIndex === state.stepsToShow.length - 1) ? 'Finish' : 'Next';
    }

    function startTimer() {
        startTimerBtn.disabled = true;
        state.timer = setInterval(() => {
            state.timeLeft--;
            const minutes = Math.floor(state.timeLeft / 60);
            const seconds = state.timeLeft % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (state.timeLeft <= 0) {
                clearInterval(state.timer);
                timerDisplay.textContent = "Time's up!";
                alert("15-minute waiting period is over. You may now proceed.");
                startTimerBtn.disabled = false;
            }
        }, 1000);
    }

    function restartApp() {
        // Reset state
        state.currentUserIssue = null;
        state.stepsToShow = [];
        state.currentStepIndex = 0;
        clearInterval(state.timer);
        state.timeLeft = 15 * 60;
        timerDisplay.textContent = '15:00';
        startTimerBtn.disabled = false;

        // Reset UI
        issueForm.reset();
        startRecoveryBtn.disabled = true;
        summaryScreen.style.display = 'none';
        stepScreen.style.display = 'none';
        surveyScreen.style.display = 'block';
    }

    // --- EVENT LISTENERS ---
    disclaimerCheckbox.addEventListener('change', () => {
        startRecoveryBtn.disabled = !disclaimerCheckbox.checked;
    });

    issueForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.currentUserIssue = document.querySelector('input[name="issue"]:checked').value;

        // Filter steps based on issue
        const isVideoAudio = state.currentUserIssue === 'video' || state.currentUserIssue === 'audio';
        let filteredSteps = allSteps.filter(step => {
            return step.conditional === 'always' || (isVideoAudio && step.conditional === 'videoOrAudioOnly');
        });

        // If ONLY video issue is selected, remove all DSP and audio-related steps by their key
        if (state.currentUserIssue === 'video') {
            const stepsToRemove = ['step2', 'step6', 'step8', 'step9'];
            filteredSteps = filteredSteps.filter(step => !stepsToRemove.includes(step.stepKey));
            
            const step1 = filteredSteps.find(step => step.stepKey === 'step1');
            if (step1) {
                step1.mainInstruction = "Have you thoroughly troubleshot the device and endpoint??";
            }
        } else if (state.currentUserIssue === 'mic') {
            const stepsToRemove = ['step3', 'step8', 'step9'];
            filteredSteps = filteredSteps.filter(step => !stepsToRemove.includes(step.stepKey));
        }
        
        state.stepsToShow = JSON.parse(JSON.stringify(filteredSteps)); // Deep copy

        // Transition to step screen
        surveyScreen.style.display = 'none';
        stepScreen.style.display = 'block';
        renderCurrentStep();
    });

    nextBtn.addEventListener('click', () => {
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
    restartApp(); // Start the app in a clean state
});
