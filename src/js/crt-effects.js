/**
 * CRT Terminal Effects
 * Adds authentic retro computer terminal effects
 */

class CRTEffects {
    constructor() {
        this.init();
        this.addBootSequence();
        this.addTypingEffects();
        this.addRandomGlitches();
    }

    init() {
        // Add CRT overlay effects
        this.createCRTOverlay();
        this.addPowerOnEffect();
        this.addFullScreenFlash();
        this.addScreenBurn();
    }

    createCRTOverlay() {
        // Create additional CRT effects overlay - ensure full screen coverage
        const overlay = document.createElement('div');
        overlay.className = 'crt-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            max-width: 100%;
            max-height: 100%;
            pointer-events: none;
            z-index: 998;
            background: 
                radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.4) 100%),
                linear-gradient(
                    90deg,
                    transparent 0%,
                    rgba(0, 255, 65, 0.01) 50%,
                    transparent 100%
                );
            animation: crt-interference 4s ease-in-out infinite alternate;
        `;
        document.body.appendChild(overlay);

        // Add style for interference animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes crt-interference {
                0% { opacity: 1; }
                25% { opacity: 0.98; }
                50% { opacity: 1; }
                75% { opacity: 0.99; }
                100% { opacity: 1; }
            }
            
            /* Ensure full viewport coverage */
            .crt-overlay {
                margin: 0;
                padding: 0;
                border: none;
                outline: none;
            }
        `;
        document.head.appendChild(style);
    }

    addPowerOnEffect() {
        // Simulate old CRT power-on effect - full screen width
        const powerOn = document.createElement('div');
        powerOn.style.cssText = `
            position: fixed;
            top: 50%;
            left: 0;
            right: 0;
            width: 100vw;
            height: 1px;
            background: linear-gradient(90deg, 
                transparent 0%, 
                var(--crt-bright-green) 20%, 
                var(--crt-white) 50%, 
                var(--crt-bright-green) 80%, 
                transparent 100%);
            box-shadow: 
                0 0 30px var(--crt-bright-green),
                0 0 60px var(--crt-bright-green),
                0 0 90px rgba(0, 255, 65, 0.8);
            z-index: 9999;
            animation: crt-power-on 2.5s ease-out forwards;
            transform: translateY(-50%);
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes crt-power-on {
                0% {
                    height: 1px;
                    opacity: 1;
                    box-shadow: 
                        0 0 30px var(--crt-bright-green),
                        0 0 60px var(--crt-bright-green),
                        0 0 90px rgba(0, 255, 65, 0.8);
                }
                25% {
                    height: 3px;
                    opacity: 1;
                    box-shadow: 
                        0 0 40px var(--crt-bright-green),
                        0 0 80px var(--crt-bright-green),
                        0 0 120px rgba(0, 255, 65, 0.9);
                }
                50% {
                    height: 100vh;
                    top: 0;
                    transform: translateY(0);
                    opacity: 0.9;
                    background: linear-gradient(180deg, 
                        transparent 0%, 
                        rgba(0, 255, 65, 0.1) 45%, 
                        rgba(0, 255, 65, 0.3) 50%, 
                        rgba(0, 255, 65, 0.1) 55%, 
                        transparent 100%);
                    box-shadow: none;
                }
                75% {
                    height: 100vh;
                    top: 0;
                    transform: translateY(0);
                    opacity: 0.4;
                    background: rgba(0, 255, 65, 0.05);
                }
                100% {
                    height: 100vh;
                    top: 0;
                    transform: translateY(0);
                    opacity: 0;
                    visibility: hidden;
                    background: transparent;
                }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(powerOn);

        // Remove after animation
        setTimeout(() => {
            powerOn.remove();
            style.remove();
        }, 2500);
    }

    addFullScreenFlash() {
        // Add a full screen flash effect at startup for extra authenticity
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: var(--crt-bright-green);
            z-index: 10000;
            animation: crt-startup-flash 0.8s ease-out forwards;
            pointer-events: none;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes crt-startup-flash {
                0% {
                    opacity: 0.8;
                    background: var(--crt-bright-green);
                }
                20% {
                    opacity: 0.3;
                    background: rgba(0, 255, 65, 0.8);
                }
                40% {
                    opacity: 0.1;
                    background: rgba(0, 255, 65, 0.3);
                }
                100% {
                    opacity: 0;
                    background: transparent;
                    visibility: hidden;
                }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(flash);

        // Remove after animation
        setTimeout(() => {
            flash.remove();
            style.remove();
        }, 800);
    }

    addScreenBurn() {
        // Add subtle screen burn effect
        const burn = document.createElement('div');
        burn.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 997;
            background: 
                radial-gradient(
                    circle at 20% 30%, 
                    rgba(0, 255, 65, 0.02) 0%, 
                    transparent 50%
                ),
                radial-gradient(
                    circle at 80% 70%, 
                    rgba(0, 255, 65, 0.015) 0%, 
                    transparent 40%
                );
            animation: screen-burn 8s ease-in-out infinite alternate;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes screen-burn {
                0% { opacity: 0.3; }
                100% { opacity: 0.7; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(burn);
    }

    addBootSequence() {
        // Add boot sequence effect to headers
        const headers = document.querySelectorAll('h1, h2');
        headers.forEach((header, index) => {
            if (header.textContent.trim()) {
                this.typewriterEffect(header, 50 + (index * 30));
            }
        });
    }

    typewriterEffect(element, delay = 0) {
        const text = element.textContent;
        element.textContent = '';
        element.style.borderRight = '2px solid var(--crt-green)';
        element.style.animation = 'crt-cursor 1s infinite';

        // Add cursor animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes crt-cursor {
                0%, 50% { border-color: var(--crt-green); }
                51%, 100% { border-color: transparent; }
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            let i = 0;
            const timer = setInterval(() => {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    
                    // Random typing speed variation
                    if (Math.random() < 0.1) {
                        clearInterval(timer);
                        setTimeout(() => {
                            const newTimer = setInterval(() => {
                                if (i < text.length) {
                                    element.textContent += text.charAt(i);
                                    i++;
                                } else {
                                    clearInterval(newTimer);
                                    element.style.borderRight = 'none';
                                }
                            }, 50 + Math.random() * 100);
                        }, 100 + Math.random() * 200);
                    }
                } else {
                    clearInterval(timer);
                    element.style.borderRight = 'none';
                }
            }, 50 + Math.random() * 100);
        }, delay);
    }

    addTypingEffects() {
        // Add typing effects to inputs
        const inputs = document.querySelectorAll('input[type="text"], input[type="password"], textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.addInputGlow(input);
            });

            input.addEventListener('focus', () => {
                this.addTerminalPrompt(input);
            });

            input.addEventListener('blur', () => {
                this.removeTerminalPrompt(input);
            });
        });
    }

    addInputGlow(input) {
        input.style.boxShadow = `
            0 0 20px var(--crt-green),
            inset 0 0 20px rgba(0, 255, 65, 0.1)
        `;
        input.style.textShadow = '0 0 8px var(--crt-green)';
        
        setTimeout(() => {
            input.style.boxShadow = `
                0 0 10px var(--crt-green),
                inset 0 0 5px rgba(0, 255, 65, 0.2)
            `;
            input.style.textShadow = '0 0 5px var(--crt-green)';
        }, 150);
    }

    addTerminalPrompt(input) {
        if (!input.dataset.originalPlaceholder) {
            input.dataset.originalPlaceholder = input.placeholder;
        }
        input.placeholder = '█';
        input.style.animation = 'crt-cursor 1s infinite';
    }

    removeTerminalPrompt(input) {
        if (input.dataset.originalPlaceholder) {
            input.placeholder = input.dataset.originalPlaceholder;
        }
        input.style.animation = '';
    }

    addRandomGlitches() {
        // Random glitch effects
        setInterval(() => {
            if (Math.random() < 0.02) { // 2% chance every interval
                this.glitchScreen();
            }
        }, 2000);

        setInterval(() => {
            if (Math.random() < 0.05) { // 5% chance
                this.flickerText();
            }
        }, 3000);
    }

    glitchScreen() {
        document.body.style.filter = 'hue-rotate(90deg) contrast(1.2)';
        document.body.style.transform = 'translateX(2px)';
        
        setTimeout(() => {
            document.body.style.filter = '';
            document.body.style.transform = 'translateX(-1px)';
        }, 50);
        
        setTimeout(() => {
            document.body.style.transform = '';
        }, 100);
    }

    flickerText() {
        const elements = document.querySelectorAll('h1, h2, h3, button, .terminal-window');
        const randomElement = elements[Math.floor(Math.random() * elements.length)];
        
        if (randomElement) {
            const originalOpacity = randomElement.style.opacity || '1';
            randomElement.style.opacity = '0.3';
            randomElement.style.textShadow = '0 0 20px var(--crt-green)';
            
            setTimeout(() => {
                randomElement.style.opacity = originalOpacity;
                randomElement.style.textShadow = '';
            }, 100);
        }
    }

    // Boot sequence sound effect (visual representation)
    addBootSound() {
        const soundBar = document.createElement('div');
        soundBar.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 200px;
            height: 4px;
            background: var(--crt-green);
            box-shadow: 0 0 10px var(--crt-green);
            z-index: 1001;
            animation: boot-sound 3s ease-out forwards;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes boot-sound {
                0% { width: 0; opacity: 1; }
                100% { width: 200px; opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(soundBar);

        setTimeout(() => {
            soundBar.remove();
        }, 3000);
    }
}

// Initialize CRT effects when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CRTEffects();
});

// Add terminal startup message
window.addEventListener('load', () => {
    console.log('%c██████████████████████████████████████', 'color: #00ff41; font-family: monospace;');
    console.log('%c█  GCC RESTORE TERMINAL SYSTEM v2.1  █', 'color: #00ff41; font-family: monospace;');
    console.log('%c█  STATUS: ONLINE                    █', 'color: #00ff41; font-family: monospace;');
    console.log('%c█  CRT EFFECTS: ENABLED              █', 'color: #00ff41; font-family: monospace;');
    console.log('%c██████████████████████████████████████', 'color: #00ff41; font-family: monospace;');
});
