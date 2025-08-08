/**
 * Multi-Factor Authentication Service
 * Handles TOTP generation, email verification, and MFA validation
 */

class MFAService {
    constructor() {
        this.currentOperator = null;
        this.mfaMethod = 'totp'; // 'totp' or 'email'
        this.codeExpiry = null;
        this.lastSentCode = null;
        this.codeValidationAttempts = 0;
        this.maxAttempts = 3;
        
        // Simulated operator MFA secrets (in production, these would be in secure database)
        this.operatorSecrets = {
            'gcc2024': { 
                secret: 'JBSWY3DPEHPK3PXP',
                email: 'admin@gcc.conference.org',
                phone: '+1234567890'
            },
            'operator123': { 
                secret: 'JBSWY3DPEHPK3PXQ',
                email: 'operator@gcc.conference.org',
                phone: '+1234567891'
            },
            'admin2024': { 
                secret: 'JBSWY3DPEHPK3PXR',
                email: 'superadmin@gcc.conference.org',
                phone: '+1234567892'
            },
            'restore_admin': { 
                secret: 'JBSWY3DPEHPK3PXS',
                email: 'restore@gcc.conference.org',
                phone: '+1234567893'
            },
            'conference_admin': { 
                secret: 'JBSWY3DPEHPK3PXT',
                email: 'conference@gcc.conference.org',
                phone: '+1234567894'
            },
            'itav_operator': { 
                secret: 'JBSWY3DPEHPK3PXU',
                email: 'itav@gcc.conference.org',
                phone: '+1234567895'
            }
        };
    }

    /**
     * Initialize MFA for an operator
     */
    initializeMFA(operatorCode) {
        this.currentOperator = operatorCode;
        this.codeValidationAttempts = 0;
        
        if (!this.operatorSecrets[operatorCode]) {
            throw new Error('Operator not found in MFA system');
        }
        
        console.log('🔐 MFA initialized for operator:', operatorCode);
        return true;
    }

    /**
     * Set the MFA method (totp or email)
     */
    setMFAMethod(method) {
        if (!['totp', 'email'].includes(method)) {
            throw new Error('Invalid MFA method');
        }
        
        this.mfaMethod = method;
        console.log('📱 MFA method set to:', method);
    }

    /**
     * Generate TOTP code (Time-based One-Time Password)
     * This is a simplified implementation - in production use a proper TOTP library
     */
    generateTOTP(secret = null) {
        const operatorSecret = secret || this.operatorSecrets[this.currentOperator]?.secret;
        if (!operatorSecret) {
            throw new Error('No secret found for operator');
        }

        // Simplified TOTP generation for demo purposes
        // In production, use a proper TOTP library like 'otplib'
        const timeWindow = Math.floor(Date.now() / 30000); // 30-second windows
        const hash = this.simpleHash(operatorSecret + timeWindow);
        const code = (hash % 1000000).toString().padStart(6, '0');
        
        return code;
    }

    /**
     * Simple hash function for demo purposes
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Send email verification code
     */
    async sendEmailCode() {
        if (!this.currentOperator) {
            throw new Error('No operator initialized');
        }

        const operatorData = this.operatorSecrets[this.currentOperator];
        if (!operatorData) {
            throw new Error('Operator data not found');
        }

        // Generate a 6-digit random code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        this.lastSentCode = code;
        this.codeExpiry = Date.now() + (5 * 60 * 1000); // 5 minutes

        // Simulate email sending (in production, integrate with actual email service)
        console.log('📧 Sending email code to:', operatorData.email);
        console.log('🔢 Email verification code:', code); // For demo purposes
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            success: true,
            email: this.maskEmail(operatorData.email),
            expiresIn: 5 * 60 * 1000 // 5 minutes in milliseconds
        };
    }

    /**
     * Mask email for display
     */
    maskEmail(email) {
        const [username, domain] = email.split('@');
        const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
        return `${maskedUsername}@${domain}`;
    }

    /**
     * Validate MFA code
     */
    async validateCode(inputCode) {
        if (!this.currentOperator) {
            throw new Error('No operator initialized');
        }

        if (this.codeValidationAttempts >= this.maxAttempts) {
            throw new Error('Maximum validation attempts exceeded. Please restart authentication.');
        }

        this.codeValidationAttempts++;

        try {
            let isValid = false;

            if (this.mfaMethod === 'totp') {
                // Validate TOTP code (allow for time drift)
                const currentCode = this.generateTOTP();
                const previousCode = this.generateTOTP(
                    this.operatorSecrets[this.currentOperator].secret,
                    Math.floor(Date.now() / 30000) - 1
                );
                
                isValid = inputCode === currentCode || inputCode === previousCode;
                
                if (isValid) {
                    console.log('✅ TOTP code validated successfully');
                }
            } else if (this.mfaMethod === 'email') {
                // Validate email code
                if (!this.lastSentCode) {
                    throw new Error('No email code sent');
                }

                if (Date.now() > this.codeExpiry) {
                    throw new Error('Email code has expired');
                }

                isValid = inputCode === this.lastSentCode;
                
                if (isValid) {
                    console.log('✅ Email code validated successfully');
                    this.lastSentCode = null; // Invalidate used code
                }
            }

            if (isValid) {
                this.codeValidationAttempts = 0;
                return {
                    success: true,
                    operator: this.currentOperator,
                    method: this.mfaMethod
                };
            } else {
                const remainingAttempts = this.maxAttempts - this.codeValidationAttempts;
                throw new Error(`Invalid verification code. ${remainingAttempts} attempts remaining.`);
            }

        } catch (error) {
            console.error('❌ MFA validation failed:', error);
            throw error;
        }
    }

    /**
     * Get operator's TOTP QR code URL for initial setup
     * In production, this would be shown only once during initial setup
     */
    getTOTPSetupURL(operatorCode) {
        const operatorData = this.operatorSecrets[operatorCode];
        if (!operatorData) {
            throw new Error('Operator not found');
        }

        const issuer = 'GCC%20Restore%20System';
        const accountName = `${operatorCode}@gcc.conference.org`;
        const secret = operatorData.secret;

        return `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}`;
    }

    /**
     * Reset MFA session
     */
    reset() {
        this.currentOperator = null;
        this.mfaMethod = 'totp';
        this.codeExpiry = null;
        this.lastSentCode = null;
        this.codeValidationAttempts = 0;
        console.log('🔄 MFA session reset');
    }

    /**
     * Get remaining time for email code
     */
    getRemainingTime() {
        if (!this.codeExpiry) {
            return 0;
        }
        
        const remaining = Math.max(0, this.codeExpiry - Date.now());
        return Math.ceil(remaining / 1000); // Return seconds
    }

    /**
     * Check if operator has MFA configured
     */
    isOperatorMFAEnabled(operatorCode) {
        return !!this.operatorSecrets[operatorCode];
    }
}

// Make MFAService available globally
window.MFAService = MFAService;
