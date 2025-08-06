document.addEventListener('DOMContentLoaded', () => {
    const inputChannelsContainer = document.querySelector('.input-channels');
    const outputChannelsContainer = document.querySelector('.output-channels');

    const numberOfInputs = 12;
    const numberOfOutputs = 4;

    // Function to create a channel element
    const createChannel = (type, index) => {
        const channelDiv = document.createElement('div');
        channelDiv.classList.add('channel');
        channelDiv.classList.add(`${type}-channel`);

        const label = document.createElement('div');
        label.classList.add('channel-label');
        label.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} ${index + 1}`;
        channelDiv.appendChild(label);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.value = '70'; // Default volume
        slider.classList.add('volume-slider');
        channelDiv.appendChild(slider);

        const vuMeter = document.createElement('div');
        vuMeter.classList.add('vu-meter');
        const vuBar = document.createElement('div');
        vuBar.classList.add('vu-bar');
        vuMeter.appendChild(vuBar);
        channelDiv.appendChild(vuMeter);

        let vuInterval;

        const startVuSimulation = () => {
            vuInterval = setInterval(() => {
                const level = Math.random() * 100; // Random level between 0 and 100
                vuBar.style.height = `${level}%`;
            }, 200); // Update every 200ms
        };

        const stopVuSimulation = () => {
            clearInterval(vuInterval);
            vuBar.style.height = '0%'; // Set VU to 0 when muted
        };

        // Start VU simulation initially
        startVuSimulation();

        if (type === 'input') {
            const muteButton = document.createElement('button');
            muteButton.classList.add('mute');
            muteButton.textContent = 'Mute';
            muteButton.addEventListener('click', () => {
                muteButton.classList.toggle('active');
                if (muteButton.classList.contains('active')) {
                    muteButton.textContent = 'Unmute';
                    stopVuSimulation(); // Stop VU when muted
                    // In a real app, this would mute the audio
                } else {
                    muteButton.textContent = 'Mute';
                    startVuSimulation(); // Start VU when unmuted
                    // In a real app, this would unmute the audio
                }
            });
            channelDiv.appendChild(muteButton);

            const soloButton = document.createElement('button');
            soloButton.classList.add('solo');
            soloButton.textContent = 'Solo';
            soloButton.addEventListener('click', () => {
                soloButton.classList.toggle('active');
                if (soloButton.classList.contains('active')) {
                    soloButton.textContent = 'Unsolo';
                    // In a real app, this would solo the audio
                } else {
                    soloButton.textContent = 'Solo';
                    // In a real app, this would unsolo the audio
                }
            });
            channelDiv.appendChild(soloButton);
        }

        return channelDiv;
    };

    // Generate input channels
    for (let i = 0; i < numberOfInputs; i++) {
        inputChannelsContainer.appendChild(createChannel('input', i));
    }

    // Generate output channels
    for (let i = 0; i < numberOfOutputs; i++) {
        outputChannelsContainer.appendChild(createChannel('output', i));
    }
});
