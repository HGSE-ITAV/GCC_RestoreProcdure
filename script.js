document.addEventListener('DOMContentLoaded', () => {
    const videoIssueCheckbox = document.getElementById('video-issue');
    const conditionalSteps = document.querySelectorAll('.conditional-step');
    const stepCheckboxes = document.querySelectorAll('.step-header input[type="checkbox"]');
    const startTimerButton = document.getElementById('start-timer');
    const timerDisplay = document.getElementById('timer-display');

    // Toggle conditional steps
    videoIssueCheckbox.addEventListener('change', () => {
        conditionalSteps.forEach(step => {
            step.style.display = videoIssueCheckbox.checked ? 'block' : 'none';
        });
    });

    // Add visual feedback to completed steps
    stepCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const step = checkbox.closest('.step');
            if (checkbox.checked) {
                step.style.opacity = '0.6';
            } else {
                step.style.opacity = '1';
            }
        });
    });

    // Timer functionality
    let timer;
    let timeLeft = 15 * 60; // 15 minutes in seconds

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    startTimerButton.addEventListener('click', () => {
        if (startTimerButton.textContent === 'Start Timer') {
            startTimerButton.textContent = 'Reset Timer';
            
            if (timeLeft <= 0) {
                timeLeft = 15 * 60;
            }
            
            updateTimerDisplay();

            timer = setInterval(() => {
                timeLeft--;
                updateTimerDisplay();

                if (timeLeft < 0) {
                    clearInterval(timer);
                    timerDisplay.textContent = "Time's up!";
                    alert("15-minute waiting period is over.");
                    startTimerButton.textContent = 'Start Timer';
                }
            }, 1000);
        } else {
            clearInterval(timer);
            timeLeft = 15 * 60;
            updateTimerDisplay();
            startTimerButton.textContent = 'Start Timer';
        }
    });
});